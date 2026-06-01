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

    // Parallel queries for efficiency
    const [
      totalLinks,
      activeCampaigns,
      activeVehicles,
      allRebrandlyLinks,
      linksWithRebrandly,
    ] = await Promise.all([
      prisma.link.count(),
      prisma.campaign.count({ where: { status: "ACTIVE" } }),
      prisma.vehicle.count({ where: { status: "ACTIVE" } }),
      prisma.rebrandlyLink.findMany({ select: { clicks: true } }),
      prisma.link.findMany({
        include: {
          rebrandly: { select: { clicks: true, shortUrl: true } },
          vehicle: { select: { id: true, name: true } },
          campaign: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Total clicks — sum of all RebrandlyLink.clicks
    const totalClicks = allRebrandlyLinks.reduce((sum, r) => sum + r.clicks, 0);

    // Top vehicles — group by vehicle, sum clicks
    const vehicleClickMap = new Map<string, { name: string; clicks: number }>();
    for (const link of linksWithRebrandly) {
      const clicks = link.rebrandly?.clicks ?? 0;
      const key = link.vehicle.id;
      const entry = vehicleClickMap.get(key);
      if (entry) {
        entry.clicks += clicks;
      } else {
        vehicleClickMap.set(key, { name: link.vehicle.name, clicks });
      }
    }
    const topVehicles = Array.from(vehicleClickMap.values())
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

    // Top campaigns — group by campaign, sum clicks
    const campaignClickMap = new Map<string, { name: string; clicks: number }>();
    for (const link of linksWithRebrandly) {
      const clicks = link.rebrandly?.clicks ?? 0;
      const key = link.campaign.id;
      const entry = campaignClickMap.get(key);
      if (entry) {
        entry.clicks += clicks;
      } else {
        campaignClickMap.set(key, { name: link.campaign.name, clicks });
      }
    }
    const topCampaigns = Array.from(campaignClickMap.values())
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

    // Top links by clicks
    const topLinks = linksWithRebrandly
      .filter((l) => l.rebrandly !== null)
      .map((l) => ({
        slug: l.slug,
        shortUrl: l.rebrandly!.shortUrl,
        clicks: l.rebrandly!.clicks,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);

    // Clicks over time — last 30 days skeleton
    const clicksByDate = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().slice(0, 10);
      clicksByDate.set(key, 0);
    }

    // Best-effort: distribute each link's total clicks to its creation date if within range
    for (const link of linksWithRebrandly) {
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
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
