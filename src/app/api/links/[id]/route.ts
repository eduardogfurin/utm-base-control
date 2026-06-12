import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog, diffAndAudit } from "@/lib/audit";
import { buildUtmUrl } from "@/lib/utils";
import { rebrandlyUpdateLink, rebrandlyDeleteLink } from "@/lib/rebrandly";
import { AuditAction } from "@prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

const linkIncludes = {
  vehicle: true,
  campaign: true,
  rebrandly: true,
  qrCode: true,
  createdBy: { select: { id: true, name: true, email: true } },
};

// Resolve Rebrandly credentials — user integration takes priority over global settings
async function getRebrandlyConfig(userId: string): Promise<{ apiKey: string; domain: string } | null> {
  const [userIntegration, globalSettings] = await Promise.all([
    prisma.userIntegration.findUnique({
      where: { userId_provider: { userId, provider: "REBRANDLY" } },
      select: { apiKey: true, domain: true },
    }),
    prisma.appSettings.findFirst({ select: { rebrandlyApiKey: true, rebrandlyDomain: true } }),
  ]);

  const apiKey = userIntegration?.apiKey ?? globalSettings?.rebrandlyApiKey ?? null;
  const domain = userIntegration?.domain ?? globalSettings?.rebrandlyDomain ?? null;

  if (!apiKey || !domain) return null;
  return { apiKey, domain };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const link = await prisma.link.findUnique({
      where: { id },
      include: linkIncludes,
    });

    if (!link) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(link);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const before = await prisma.link.findUnique({
      where: { id },
      include: { rebrandly: true },
    });
    if (!before) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      baseUrl,
      vehicleId,
      campaignId,
      slug,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      status,
    } = body;

    const newBaseUrl = baseUrl ?? before.baseUrl;
    const finalUrl = buildUtmUrl(newBaseUrl, {
      utmSource: utmSource ?? before.utmSource,
      utmMedium: utmMedium ?? before.utmMedium,
      utmCampaign: utmCampaign ?? before.utmCampaign,
      utmContent: utmContent ?? before.utmContent,
      utmTerm: utmTerm ?? before.utmTerm,
    });

    // Use raw SQL for the update to avoid RETURNING * on write, then re-fetch with include
    await prisma.$executeRawUnsafe(
      `UPDATE "Link" SET
        "baseUrl" = COALESCE($2, "baseUrl"),
        "finalUrl" = $3,
        "slug" = COALESCE($4, "slug"),
        "utmSource" = COALESCE($5, "utmSource"),
        "utmMedium" = COALESCE($6, "utmMedium"),
        "utmCampaign" = COALESCE($7, "utmCampaign"),
        "utmContent" = COALESCE($8, "utmContent"),
        "utmTerm" = COALESCE($9, "utmTerm"),
        "vehicleId" = COALESCE($10, "vehicleId"),
        "campaignId" = COALESCE($11, "campaignId"),
        "status" = COALESCE($12, "status"),
        "updatedAt" = NOW()
       WHERE id = $1`,
      id,
      baseUrl ?? null,
      finalUrl,
      slug ?? null,
      utmSource ?? null,
      utmMedium ?? null,
      utmCampaign ?? null,
      utmContent ?? null,
      utmTerm ?? null,
      vehicleId ?? null,
      campaignId ?? null,
      status ?? null
    );

    const updated = await prisma.link.findUnique({ where: { id }, include: linkIncludes });
    if (!updated) return NextResponse.json({ error: "Not found after update" }, { status: 404 });;

    // Sync changes to Rebrandly when URL or slug changed
    if (before.rebrandly?.rebrandlyId) {
      const rebrandlyConfig = await getRebrandlyConfig(session.user.id);
      if (rebrandlyConfig) {
        const rebrandlyPayload: { destination?: string; slashtag?: string } = {};
        const urlChanged = finalUrl !== before.finalUrl;
        const slugChanged = slug !== undefined && slug !== before.slug;
        if (urlChanged) rebrandlyPayload.destination = finalUrl;
        if (slugChanged) rebrandlyPayload.slashtag = slug;

        if (Object.keys(rebrandlyPayload).length > 0) {
          try {
            const rebrandlyResult = await rebrandlyUpdateLink(
              rebrandlyConfig,
              before.rebrandly.rebrandlyId,
              rebrandlyPayload
            );
            // Update stored shortUrl if slashtag changed — raw SQL avoids RETURNING * issue
            if (slugChanged) {
              await prisma.$executeRaw`
                UPDATE "RebrandlyLink" SET "shortUrl" = ${rebrandlyResult.shortUrl}, "updatedAt" = NOW()
                WHERE "linkId" = ${id}
              `;
            }
          } catch (err) {
            console.error("[links PATCH] Rebrandly update failed:", err);
          }
        }
      }
    }

    await diffAndAudit(
      session.user.id,
      "Link",
      id,
      {
        baseUrl: before.baseUrl,
        finalUrl: before.finalUrl,
        slug: before.slug,
        utmSource: before.utmSource,
        utmMedium: before.utmMedium,
        utmCampaign: before.utmCampaign,
        utmContent: before.utmContent,
        utmTerm: before.utmTerm,
        status: before.status,
      },
      {
        baseUrl: updated.baseUrl,
        finalUrl: updated.finalUrl,
        slug: updated.slug,
        utmSource: updated.utmSource,
        utmMedium: updated.utmMedium,
        utmCampaign: updated.utmCampaign,
        utmContent: updated.utmContent,
        utmTerm: updated.utmTerm,
        status: updated.status,
      },
      {
        linkId: id,
        vehicleId: updated.vehicleId,
        campaignId: updated.campaignId,
      }
    );

    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const link = await prisma.link.findUnique({
      where: { id },
      include: { rebrandly: true },
    });

    if (!link) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete from Rebrandly before DB cascade removes the record
    if (link.rebrandly?.rebrandlyId) {
      const rebrandlyConfig = await getRebrandlyConfig(session.user.id);
      if (rebrandlyConfig) {
        try {
          await rebrandlyDeleteLink(rebrandlyConfig, link.rebrandly.rebrandlyId);
        } catch (err) {
          console.error("[links DELETE] Rebrandly delete failed:", err);
          // Non-fatal: proceed with local deletion
        }
      }
    }

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.DELETED,
      entityType: "Link",
      entityId: id,
      linkId: id,
      vehicleId: link.vehicleId,
      campaignId: link.campaignId,
      oldValue: JSON.stringify({ slug: link.slug, finalUrl: link.finalUrl }),
    });

    // Cascade deletes QrCode and RebrandlyLink via onDelete: Cascade
    await prisma.link.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
