import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { buildUtmUrl, slugify } from "@/lib/utils";
import { rebrandlyCreateLink } from "@/lib/rebrandly";
import { AuditAction } from "@prisma/client";
import QRCode from "qrcode";

const linkIncludes = {
  vehicle: true,
  campaign: true,
  rebrandly: true,
  qrCode: true,
  createdBy: { select: { id: true, name: true, email: true } },
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get("vehicleId");
    const campaignId = searchParams.get("campaignId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (vehicleId) where.vehicleId = vehicleId;
    if (campaignId) where.campaignId = campaignId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { slug: { contains: search, mode: "insensitive" } },
        { baseUrl: { contains: search, mode: "insensitive" } },
        { utmCampaign: { contains: search, mode: "insensitive" } },
      ];
    }

    const links = await prisma.link.findMany({
      where,
      include: linkIncludes,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(links);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      baseUrl,
      vehicleId,
      campaignId,
      slug: rawSlug,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      rebrandlyDomain: selectedDomain,
    } = body;

    if (!baseUrl || !vehicleId || !campaignId) {
      return NextResponse.json(
        { error: "baseUrl, vehicleId and campaignId are required" },
        { status: 400 }
      );
    }

    const finalUrl = buildUtmUrl(baseUrl, {
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
    });

    // Generate slug or validate the provided one
    const userProvidedSlug = !!rawSlug;
    let slug = rawSlug
      ? slugify(rawSlug)
      : slugify(`${utmCampaign || "link"}-${Date.now()}`);

    const existing = await prisma.link.findUnique({ where: { slug } });
    if (existing) {
      if (userProvidedSlug) {
        return NextResponse.json(
          { error: `O slug "${slug}" já está em uso. Escolha outro.` },
          { status: 409 }
        );
      }
      slug = `${slug}-${Date.now()}`;
    }

    const link = await prisma.link.create({
      data: {
        baseUrl,
        finalUrl,
        slug,
        utmSource: utmSource ?? null,
        utmMedium: utmMedium ?? null,
        utmCampaign: utmCampaign ?? null,
        utmContent: utmContent ?? null,
        utmTerm: utmTerm ?? null,
        vehicleId,
        campaignId,
        createdById: session.user.id,
      },
      select: { id: true },
    });

    // Rebrandly integration — use the user's own integration key first,
    // fall back to global AppSettings if available
    let urlForQr = finalUrl;

    const userIntegration = await prisma.userIntegration.findUnique({
      where: { userId_provider: { userId: session.user.id, provider: "REBRANDLY" } },
      select: { apiKey: true, domain: true },
    });

    const globalSettings = await prisma.appSettings.findFirst({
      select: { rebrandlyApiKey: true, rebrandlyDomain: true },
    });

    const rebrandlyApiKey = userIntegration?.apiKey ?? globalSettings?.rebrandlyApiKey ?? null;
    // Priority: domain chosen in form > saved on integration > global settings > default
    const rebrandlyDomain =
      selectedDomain ||
      userIntegration?.domain ||
      globalSettings?.rebrandlyDomain ||
      "rebrand.ly";

    if (rebrandlyApiKey) {
      try {
        const rebrandlyLink = await rebrandlyCreateLink(
          { apiKey: rebrandlyApiKey, domain: rebrandlyDomain },
          { destination: finalUrl, slug, title: slug }
        );

        await prisma.$executeRaw`
          INSERT INTO "RebrandlyLink" (id, "linkId", "rebrandlyId", "shortUrl", clicks, "createdAt", "updatedAt")
          VALUES (${crypto.randomUUID()}, ${link.id}, ${rebrandlyLink.id}, ${rebrandlyLink.shortUrl}, ${rebrandlyLink.clicks ?? 0}, NOW(), NOW())
        `;
        urlForQr = rebrandlyLink.shortUrl;
      } catch (err) {
        console.error("Rebrandly create failed:", err);
      }
    }

    // Generate QR Code SVG
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
    } catch (err) {
      console.error("QR Code generation failed:", err);
    }

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.CREATED,
      entityType: "Link",
      entityId: link.id,
      linkId: link.id,
      vehicleId,
      campaignId,
    });

    const fullLink = await prisma.link.findUnique({
      where: { id: link.id },
      include: linkIncludes,
    });

    return NextResponse.json(fullLink, { status: 201 });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "Slug já está em uso" }, { status: 409 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[links POST] error:", msg, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
