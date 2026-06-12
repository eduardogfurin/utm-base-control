import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { buildUtmUrl, slugify } from "@/lib/utils";
import { rebrandlyCreateLink } from "@/lib/rebrandly";
import { AuditAction } from "@prisma/client";
import QRCode from "qrcode";

interface LinkImportRow {
  baseUrl: string;
  vehicleId: string;
  campaignId: string;
  slug?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const rows: LinkImportRow[] = body?.rows;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "Body must contain a non-empty 'rows' array" },
        { status: 400 }
      );
    }

    const settings = await prisma.appSettings.findFirst({
      select: { rebrandlyApiKey: true, rebrandlyDomain: true },
    });
    const hasRebrandly = !!(settings?.rebrandlyApiKey && settings?.rebrandlyDomain);

    let created = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        if (!row.baseUrl || !row.vehicleId || !row.campaignId) {
          errors.push(`Row ${i + 1}: baseUrl, vehicleId and campaignId are required`);
          continue;
        }

        const finalUrl = buildUtmUrl(row.baseUrl, {
          utmSource: row.utmSource,
          utmMedium: row.utmMedium,
          utmCampaign: row.utmCampaign,
          utmContent: row.utmContent,
          utmTerm: row.utmTerm,
        });

        let slug = row.slug
          ? slugify(row.slug)
          : slugify(`${row.utmCampaign || "link"}-${Date.now()}-${i}`);

        const existing = await prisma.link.findUnique({ where: { slug } });
        if (existing) {
          slug = `${slug}-${Date.now()}`;
        }

        const link = await prisma.link.create({
          data: {
            baseUrl: row.baseUrl,
            finalUrl,
            slug,
            utmSource: row.utmSource ?? null,
            utmMedium: row.utmMedium ?? null,
            utmCampaign: row.utmCampaign ?? null,
            utmContent: row.utmContent ?? null,
            utmTerm: row.utmTerm ?? null,
            vehicleId: row.vehicleId,
            campaignId: row.campaignId,
            createdById: session.user.id,
          },
          select: { id: true },
        });

        let urlForQr = finalUrl;

        // Rebrandly integration
        if (hasRebrandly) {
          try {
            const rebrandlyLink = await rebrandlyCreateLink(
              {
                apiKey: settings!.rebrandlyApiKey!,
                domain: settings!.rebrandlyDomain!,
              },
              { destination: finalUrl, slug, title: slug }
            );

            await prisma.$executeRaw`
              INSERT INTO "RebrandlyLink" (id, "linkId", "rebrandlyId", "shortUrl", clicks, "createdAt", "updatedAt")
              VALUES (${crypto.randomUUID()}, ${link.id}, ${rebrandlyLink.id}, ${rebrandlyLink.shortUrl}, ${rebrandlyLink.clicks ?? 0}, NOW(), NOW())
            `;
            urlForQr = rebrandlyLink.shortUrl;
          } catch (rebErr) {
            errors.push(`Row ${i + 1}: Rebrandly failed — ${(rebErr as Error).message}`);
          }
        }

        // QR Code
        try {
          const svg = await QRCode.toString(urlForQr, {
            type: "svg",
            width: 256,
            margin: 2,
          });
          await prisma.$executeRaw`
            INSERT INTO "QrCode" (id, "linkId", "svgData", "createdAt", "updatedAt")
            VALUES (${crypto.randomUUID()}, ${link.id}, ${svg}, NOW(), NOW())
            ON CONFLICT ("linkId") DO UPDATE SET "svgData" = EXCLUDED."svgData", "updatedAt" = NOW()
          `;
        } catch (qrErr) {
          errors.push(`Row ${i + 1}: QR Code failed — ${(qrErr as Error).message}`);
        }

        await createAuditLog({
          userId: session.user.id,
          action: AuditAction.CREATED,
          entityType: "Link",
          entityId: link.id,
          linkId: link.id,
          vehicleId: row.vehicleId,
          campaignId: row.campaignId,
        });

        created++;
      } catch (err) {
        errors.push(`Row ${i + 1}: ${(err as Error).message}`);
      }
    }

    return NextResponse.json({ created, errors });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
