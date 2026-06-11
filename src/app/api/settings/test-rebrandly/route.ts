import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rebrandlyTestConnection } from "@/lib/rebrandly";

export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch settings with raw SQL fallback (qrConfig column may not exist yet)
    let settings: { id: string; rebrandlyApiKey: string | null; rebrandlyDomain: string | null } | null = null;
    try {
      settings = await prisma.appSettings.findFirst({
        select: { id: true, rebrandlyApiKey: true, rebrandlyDomain: true },
      });
    } catch {
      const rows = await prisma.$queryRaw<{ id: string; rebrandlyApiKey: string | null; rebrandlyDomain: string | null }[]>`
        SELECT id, "rebrandlyApiKey", "rebrandlyDomain" FROM "AppSettings" LIMIT 1
      `;
      settings = rows[0] ?? null;
    }

    if (!settings?.rebrandlyApiKey) {
      return NextResponse.json(
        { ok: false, error: "Rebrandly API key not configured" },
        { status: 400 }
      );
    }

    const ok = await rebrandlyTestConnection({
      apiKey: settings.rebrandlyApiKey,
      domain: settings.rebrandlyDomain ?? "",
    });

    // Persist status via raw SQL to avoid RETURNING * with missing qrConfig column
    await prisma.$executeRawUnsafe(
      ok
        ? `UPDATE "AppSettings" SET "rebrandlyStatus" = true, "rebrandlyLastSync" = NOW(), "updatedAt" = NOW() WHERE id = $1`
        : `UPDATE "AppSettings" SET "rebrandlyStatus" = false, "updatedAt" = NOW() WHERE id = $1`,
      settings.id
    );

    return NextResponse.json({ ok });
  } catch (err) {
    console.error("[test-rebrandly POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
