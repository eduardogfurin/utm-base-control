import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Returns the saved QR config for the current user (user integration > global settings)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [userIntegration, globalSettings] = await Promise.all([
      prisma.userIntegration.findUnique({
        where: { userId_provider: { userId: session.user.id, provider: "REBRANDLY" } },
        select: { qrConfig: true },
      }),
      prisma.appSettings.findFirst({ select: { qrConfig: true } }),
    ]);

    const qrConfig = userIntegration?.qrConfig ?? globalSettings?.qrConfig ?? null;
    return NextResponse.json({ qrConfig });
  } catch {
    // qrConfig column may not exist yet — return null gracefully
    return NextResponse.json({ qrConfig: null });
  }
}
