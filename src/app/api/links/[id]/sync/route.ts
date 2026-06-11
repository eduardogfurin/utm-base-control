import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { rebrandlyGetMetrics } from "@/lib/rebrandly";
import { AuditAction } from "@prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteContext) {
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

    if (!link.rebrandly) {
      return NextResponse.json(
        { error: "This link has no Rebrandly integration" },
        { status: 400 }
      );
    }

    const settings = await prisma.appSettings.findFirst({
      select: { id: true, rebrandlyApiKey: true, rebrandlyDomain: true },
    });
    if (!settings?.rebrandlyApiKey || !settings?.rebrandlyDomain) {
      return NextResponse.json(
        { error: "Rebrandly not configured" },
        { status: 400 }
      );
    }

    const metrics = await rebrandlyGetMetrics(
      { apiKey: settings.rebrandlyApiKey, domain: settings.rebrandlyDomain },
      link.rebrandly.rebrandlyId
    );

    const updated = await prisma.rebrandlyLink.update({
      where: { linkId: id },
      data: {
        clicks: metrics.clicks,
        syncedAt: new Date(),
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.METRICS_SYNC,
      entityType: "Link",
      entityId: id,
      linkId: id,
      vehicleId: link.vehicleId,
      campaignId: link.campaignId,
      newValue: String(metrics.clicks),
    });

    return NextResponse.json({ clicks: updated.clicks, syncedAt: updated.syncedAt });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
