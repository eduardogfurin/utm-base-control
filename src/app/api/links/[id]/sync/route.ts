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
      select: { id: true, vehicleId: true, campaignId: true, rebrandly: { select: { rebrandlyId: true } } },
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

    // Fetch Rebrandly config with raw SQL fallback (qrConfig column may not exist yet)
    let apiKey: string | null = null;
    let domain: string | null = null;
    try {
      const settings = await prisma.appSettings.findFirst({
        select: { rebrandlyApiKey: true, rebrandlyDomain: true },
      });
      apiKey = settings?.rebrandlyApiKey ?? null;
      domain = settings?.rebrandlyDomain ?? null;
    } catch {
      const rows = await prisma.$queryRaw<{ rebrandlyApiKey: string | null; rebrandlyDomain: string | null }[]>`
        SELECT "rebrandlyApiKey", "rebrandlyDomain" FROM "AppSettings" LIMIT 1
      `;
      apiKey = rows[0]?.rebrandlyApiKey ?? null;
      domain = rows[0]?.rebrandlyDomain ?? null;
    }

    // Also check user integration
    try {
      const ui = await prisma.userIntegration.findUnique({
        where: { userId_provider: { userId: session.user.id, provider: "REBRANDLY" } },
        select: { apiKey: true, domain: true },
      });
      if (ui?.apiKey) { apiKey = ui.apiKey; domain = ui.domain ?? domain; }
    } catch { /* qrConfig missing — ignore, use appSettings fallback */ }

    if (!apiKey) {
      return NextResponse.json({ error: "Rebrandly not configured" }, { status: 400 });
    }

    const metrics = await rebrandlyGetMetrics(
      { apiKey, domain: domain ?? "" },
      link.rebrandly.rebrandlyId
    );

    const clicks = metrics.clicks ?? 0;

    // Use raw SQL to avoid RETURNING * emitted by Prisma v7 adapter-pg
    await prisma.$executeRaw`
      UPDATE "RebrandlyLink"
      SET clicks = ${clicks}, "syncedAt" = NOW(), "updatedAt" = NOW()
      WHERE "linkId" = ${id}
    `;

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.METRICS_SYNC,
      entityType: "Link",
      entityId: id,
      linkId: id,
      vehicleId: link.vehicleId,
      campaignId: link.campaignId,
      newValue: String(clicks),
    });

    return NextResponse.json({ clicks, syncedAt: new Date() });
  } catch (err) {
    console.error("[links/sync POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
