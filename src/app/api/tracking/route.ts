import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Dimension =
  | "campaign"
  | "vehicle"
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "utm_content"
  | "utm_term"
  | "domain"
  | "slug";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dimension = (searchParams.get("dimension") ?? "campaign") as Dimension;

    const links = await prisma.link.findMany({
      take: 5000,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        utmContent: true,
        utmTerm: true,
        vehicle: { select: { name: true } },
        campaign: { select: { name: true } },
        rebrandly: { select: { clicks: true, shortUrl: true } },
      },
    });

    const keyMap = new Map<string, { clicks: number; links: number }>();

    for (const link of links) {
      let key: string | null = null;

      switch (dimension) {
        case "campaign":
          key = link.campaign?.name ?? null;
          break;
        case "vehicle":
          key = link.vehicle?.name ?? null;
          break;
        case "utm_source":
          key = link.utmSource ?? null;
          break;
        case "utm_medium":
          key = link.utmMedium ?? null;
          break;
        case "utm_campaign":
          key = link.utmCampaign ?? null;
          break;
        case "utm_content":
          key = link.utmContent ?? null;
          break;
        case "utm_term":
          key = link.utmTerm ?? null;
          break;
        case "domain": {
          if (link.rebrandly?.shortUrl) {
            try {
              key = new URL(link.rebrandly.shortUrl).hostname;
            } catch {
              key = null;
            }
          }
          break;
        }
        case "slug":
          key = link.slug ?? null;
          break;
      }

      if (!key) continue;

      const clicks = link.rebrandly?.clicks ?? 0;
      const existing = keyMap.get(key);
      if (existing) {
        existing.clicks += clicks;
        existing.links += 1;
      } else {
        keyMap.set(key, { clicks, links: 1 });
      }
    }

    const rows = Array.from(keyMap.entries())
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => b.clicks - a.clicks);

    const totalClicks = rows.reduce((sum, r) => sum + r.clicks, 0);
    const totalLinks = rows.reduce((sum, r) => sum + r.links, 0);

    return NextResponse.json({ rows, totalClicks, totalLinks });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[tracking] error:", msg, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
