import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { provider } = body;

  if (!provider) {
    return NextResponse.json({ error: "provider é obrigatório" }, { status: 400 });
  }

  const integration = await prisma.userIntegration.findUnique({
    where: { userId_provider: { userId: session.user.id, provider } },
  });

  if (!integration) {
    return NextResponse.json({ error: "Integração não encontrada" }, { status: 404 });
  }

  let imported = 0;

  if (provider === "REBRANDLY") {
    try {
      const res = await fetch("https://api.rebrandly.com/v1/links?limit=25&orderBy=createdAt&orderDir=desc", {
        headers: { apikey: integration.apiKey },
      });

      if (!res.ok) {
        return NextResponse.json({ error: "API key inválida ou sem permissão no Rebrandly" }, { status: 400 });
      }

      const links: Array<{ id: string; shortUrl: string; clicks: number; title?: string }> = await res.json();
      imported = links.length;

      await prisma.userIntegration.update({
        where: { id: integration.id },
        data: { lastSyncAt: new Date() },
      });
    } catch {
      return NextResponse.json({ error: "Erro ao comunicar com o Rebrandly" }, { status: 502 });
    }
  }

  return NextResponse.json({ ok: true, imported });
}
