import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      totalLinksResult,
      activeCampaignsResult,
      activeVehiclesResult,
      allRebrandlyLinksResult,
      linksRawResult,
    ] = await Promise.allSettled([
      prisma.link.count(),
      prisma.campaign.count({ where: { status: "ACTIVE" } }),
      prisma.vehicle.count({ where: { status: "ACTIVE" } }),
      prisma.rebrandlyLink.findMany({ select: { clicks: true } }),
      prisma.link.findMany({
        take: 2000,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          slug: true,
          createdAt: true,
          vehicleId: true,
          campaignId: true,
          rebrandly: { select: { clicks: true, shortUrl: true } },
          vehicle: { select: { id: true, name: true } },
          campaign: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Log individual failures for debugging without breaking the response
    if (totalLinksResult.status === "rejected") console.error("[dashboard] totalLinks:", totalLinksResult.reason);
    if (activeCampaignsResult.status === "rejected") console.error("[dashboard] activeCampaigns:", activeCampaignsResult.reason);
    if (activeVehiclesResult.status === "rejected") console.error("[dashboard] activeVehicles:", activeVehiclesResult.reason);
    if (allRebrandlyLinksResult.status === "rejected") console.error("[dashboard] rebrandlyLinks:", allRebrandlyLinksResult.reason);
    if (linksRawResult.status === "rejected") console.error("[dashboard] linksRaw:", linksRawResult.reason);

    const totalLinks = totalLinksResult.status === "fulfilled" ? totalLinksResult.value : 0;
    const activeCampaigns = activeCampaignsResult.status === "fulfilled" ? activeCampaignsResult.value : 0;
    const activeVehicles = activeVehiclesResult.status === "fulfilled" ? activeVehiclesResult.value : 0;
    const allRebrandlyLinks = allRebrandlyLinksResult.status === "fulfilled" ? allRebrandlyLinksResult.value : [];
    const linksRaw = linksRawResult.status === "fulfilled" ? linksRawResult.value : [];

    const totalClicks = allRebrandlyLinks.reduce((sum, r) => sum + r.clicks, 0);

    // Top vehicles
    const vehicleClickMap = new Map<string, { name: string; clicks: number }>();
    for (const link of linksRaw) {
      if (!link.vehicle) continue;
      const clicks = link.rebrandly?.clicks ?? 0;
      const entry = vehicleClickMap.get(link.vehicleId);
      if (entry) entry.clicks += clicks;
      else vehicleClickMap.set(link.vehicleId, { name: link.vehicle.name, clicks });
    }
    const topVehicles = Array.from(vehicleClickMap.values())
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

    // Top campaigns
    const campaignClickMap = new Map<string, { name: string; clicks: number }>();
    for (const link of linksRaw) {
      if (!link.campaign) continue;
      const clicks = link.rebrandly?.clicks ?? 0;
      const entry = campaignClickMap.get(link.campaignId);
      if (entry) entry.clicks += clicks;
      else campaignClickMap.set(link.campaignId, { name: link.campaign.name, clicks });
    }
    const topCampaigns = Array.from(campaignClickMap.values())
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

    // Top links
    const topLinks = linksRaw
      .filter((l) => l.rebrandly)
      .map((l) => ({
        slug: l.slug,
        shortUrl: l.rebrandly!.shortUrl,
        clicks: l.rebrandly!.clicks,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);

    // Clicks over time — last 30 days
    const clicksByDate = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      clicksByDate.set(d.toISOString().slice(0, 10), 0);
    }
    for (const link of linksRaw) {
      if (!link.rebrandly || link.rebrandly.clicks === 0) continue;
      const dateKey = new Date(link.createdAt).toISOString().slice(0, 10);
      if (clicksByDate.has(dateKey)) {
        clicksByDate.set(dateKey, (clicksByDate.get(dateKey) ?? 0) + link.rebrandly.clicks);
      }
    }
    const clicksOverTime = Array.from(clicksByDate.entries()).map(([date, clicks]) => ({
      date,
      clicks,
    }));

    return NextResponse.json({
      totalLinks,
      totalClicks,
      activeCampaigns,
      activeVehicles,
      topVehicles,
      topCampaigns,
      topLinks,
      clicksOverTime,
    });
  } catch (err) {
    console.error("[dashboard] unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
