import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog, diffAndAudit } from "@/lib/audit";
import { buildUtmUrl } from "@/lib/utils";
import { rebrandlyDeleteLink } from "@/lib/rebrandly";
import { AuditAction } from "@prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

const linkIncludes = {
  vehicle: true,
  campaign: true,
  rebrandly: true,
  qrCode: true,
  createdBy: { select: { id: true, name: true, email: true } },
};

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

    const before = await prisma.link.findUnique({ where: { id } });
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

    const updated = await prisma.link.update({
      where: { id },
      data: {
        ...(baseUrl !== undefined && { baseUrl }),
        finalUrl,
        ...(slug !== undefined && { slug }),
        ...(utmSource !== undefined && { utmSource }),
        ...(utmMedium !== undefined && { utmMedium }),
        ...(utmCampaign !== undefined && { utmCampaign }),
        ...(utmContent !== undefined && { utmContent }),
        ...(utmTerm !== undefined && { utmTerm }),
        ...(vehicleId !== undefined && { vehicleId }),
        ...(campaignId !== undefined && { campaignId }),
        ...(status !== undefined && { status }),
      },
      include: linkIncludes,
    });

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

    // Delete from Rebrandly if integration exists
    if (link.rebrandly) {
      const settings = await prisma.appSettings.findFirst();
      if (settings?.rebrandlyApiKey && settings?.rebrandlyDomain) {
        try {
          await rebrandlyDeleteLink(
            { apiKey: settings.rebrandlyApiKey, domain: settings.rebrandlyDomain },
            link.rebrandly.rebrandlyId
          );
        } catch (err) {
          console.error("Rebrandly delete failed:", err);
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

    // Cascade deletes QrCode and RebrandlyLink due to onDelete: Cascade in schema
    await prisma.link.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
