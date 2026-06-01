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

    const settings = await prisma.appSettings.findFirst();

    if (!settings?.rebrandlyApiKey || !settings?.rebrandlyDomain) {
      return NextResponse.json(
        { ok: false, error: "Rebrandly API key and domain are not configured" },
        { status: 400 }
      );
    }

    const ok = await rebrandlyTestConnection({
      apiKey: settings.rebrandlyApiKey,
      domain: settings.rebrandlyDomain,
    });

    // Persist connection status
    await prisma.appSettings.update({
      where: { id: settings.id },
      data: {
        rebrandlyStatus: ok,
        ...(ok && { rebrandlyLastSync: new Date() }),
      },
    });

    return NextResponse.json({ ok });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
