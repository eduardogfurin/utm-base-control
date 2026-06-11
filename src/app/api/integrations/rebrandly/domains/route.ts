import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integration = await prisma.userIntegration.findUnique({
    where: { userId_provider: { userId: session.user.id, provider: "REBRANDLY" } },
    select: { apiKey: true, domain: true },
  });

  if (!integration?.apiKey) {
    return NextResponse.json([]);
  }

  try {
    const res = await fetch("https://api.rebrandly.com/v1/domains?active=true", {
      headers: { apikey: integration.apiKey, "Content-Type": "application/json" },
    });

    if (!res.ok) return NextResponse.json([]);

    const domains = await res.json();
    return NextResponse.json({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      domains: (domains ?? []).map((d: any) => ({
        id: d.id,
        fullName: d.fullName,
        active: d.active ?? true,
      })),
      defaultDomain: integration.domain ?? null,
    });
  } catch {
    return NextResponse.json([]);
  }
}
