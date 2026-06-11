import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rebrandlyGetLink } from "@/lib/rebrandly";

// Batch sync clicks from Rebrandly for all links that haven't been synced in >5 minutes
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [userIntegration, globalSettings] = await Promise.all([
      prisma.userIntegration.findUnique({
        where: { userId_provider: { userId: session.user.id, provider: "REBRANDLY" } },
        select: { apiKey: true, domain: true },
      }),
      prisma.appSettings.findFirst({ select: { rebrandlyApiKey: true, rebrandlyDomain: true } }),
    ]);

    const apiKey = userIntegration?.apiKey ?? globalSettings?.rebrandlyApiKey ?? null;
    const domain = userIntegration?.domain ?? globalSettings?.rebrandlyDomain ?? null;

    if (!apiKey || !domain) {
      return NextResponse.json({ synced: 0, skipped: "no_config" });
    }

    const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);

    const staleLinks = await prisma.rebrandlyLink.findMany({
      where: {
        OR: [
          { syncedAt: null },
          { syncedAt: { lt: staleThreshold } },
        ],
      },
      select: { linkId: true, rebrandlyId: true },
    });

    if (staleLinks.length === 0) {
      return NextResponse.json({ synced: 0 });
    }

    const results = await Promise.allSettled(
      staleLinks.map(async ({ linkId, rebrandlyId }) => {
        const data = await rebrandlyGetLink({ apiKey, domain }, rebrandlyId);
        await prisma.rebrandlyLink.update({
          where: { linkId },
          data: { clicks: data.clicks ?? 0, syncedAt: new Date() },
        });
        return { linkId, clicks: data.clicks ?? 0 };
      })
    );

    const synced = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed > 0) {
      console.error(`[sync-clicks] ${failed}/${staleLinks.length} failed`);
    }

    return NextResponse.json({ synced, failed });
  } catch (err) {
    console.error("[sync-clicks] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
