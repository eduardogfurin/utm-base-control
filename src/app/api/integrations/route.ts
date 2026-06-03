import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IntegrationProvider } from "@prisma/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const integrations = await prisma.userIntegration.findMany({
    where: { userId: session.user.id },
    select: { id: true, provider: true, domain: true, isActive: true, lastSyncAt: true, createdAt: true },
  });

  return NextResponse.json(integrations);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { provider, apiKey, domain } = body;

  if (!provider || !apiKey) {
    return NextResponse.json({ error: "provider e apiKey são obrigatórios" }, { status: 400 });
  }

  const validProviders = Object.values(IntegrationProvider);
  if (!validProviders.includes(provider)) {
    return NextResponse.json({ error: "Provedor inválido" }, { status: 400 });
  }

  const integration = await prisma.userIntegration.upsert({
    where: { userId_provider: { userId: session.user.id, provider } },
    update: { apiKey, domain: domain ?? null, isActive: true },
    create: { userId: session.user.id, provider, apiKey, domain: domain ?? null },
  });

  return NextResponse.json({ ok: true, id: integration.id }, { status: 200 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { provider, domain } = body;

  if (!provider) {
    return NextResponse.json({ error: "provider é obrigatório" }, { status: 400 });
  }

  const validProviders = Object.values(IntegrationProvider);
  if (!validProviders.includes(provider)) {
    return NextResponse.json({ error: "Provedor inválido" }, { status: 400 });
  }

  await prisma.userIntegration.updateMany({
    where: { userId: session.user.id, provider },
    data: { domain: domain ?? null },
  });

  return NextResponse.json({ ok: true });
}
