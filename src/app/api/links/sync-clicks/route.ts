import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rebrandlyGetLink } from "@/lib/rebrandly";

// Batch sync clicks from Rebrandly for all links belonging to the current user
// that haven't been synced in >5 minutes.
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch API config — user integration takes priority over global settings.
    // Use raw SQL fallback in case qrConfig column is missing.
    let apiKey: string | null = null;
    let domain: string | null = null;

    try {
      const [userIntegration, globalSettings] = await Promise.all([
        prisma.userIntegration.findUnique({
          where: { userId_provider: { userId: session.user.id, provider: "REBRANDLY" } },
          select: { apiKey: true, domain: true },
        }),
        prisma.appSettings.findFirst({ select: { rebrandlyApiKey: true, rebrandlyDomain: true } }),
      ]);
      apiKey = userIntegration?.apiKey ?? globalSettings?.rebrandlyApiKey ?? null;
      domain = userIntegration?.domain ?? globalSettings?.rebrandlyDomain ?? null;
    } catch {
      const rows = await prisma.$queryRaw<{ apiKey: string | null; domain: string | null }[]>`
        SELECT "apiKey", domain FROM "UserIntegration"
        WHERE "userId" = ${session.user.id} AND provider = 'REBRANDLY'::"IntegrationProvider"
        LIMIT 1
      `;
      if (rows[0]) {
        apiKey = rows[0].apiKey;
        domain = rows[0].domain;
      }
    }

    if (!apiKey) {
      return NextResponse.json({ synced: 0, skipped: "no_config" });
    }

    // domain is optional for fetching link metrics — use empty string as fallback
    const config = { apiKey, domain: domain ?? "" };

    const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);

    // Only sync links belonging to the current user (created by them)
    const staleLinks = await prisma.rebrandlyLink.findMany({
      where: {
        link: { createdById: session.user.id },
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
        const data = await rebrandlyGetLink(config, rebrandlyId);
        const clicks = data.clicks ?? 0;
        // Use raw SQL UPDATE to avoid RETURNING * emitted by Prisma v7 adapter-pg
        await prisma.$executeRaw`
          UPDATE "RebrandlyLink"
          SET clicks = ${clicks}, "syncedAt" = NOW(), "updatedAt" = NOW()
          WHERE "linkId" = ${linkId}
        `;
        return { linkId, clicks };
      })
    );

    const synced = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed > 0) {
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .map((r) => r.reason?.message ?? String(r.reason));
      console.error(`[sync-clicks] ${failed}/${staleLinks.length} failed:`, errors);
    }

    return NextResponse.json({ synced, failed });
  } catch (err) {
    console.error("[sync-clicks] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
