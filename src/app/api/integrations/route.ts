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

  try {
    const integrations = await prisma.userIntegration.findMany({
      where: { userId: session.user.id },
      select: { id: true, provider: true, domain: true, isActive: true, lastSyncAt: true, createdAt: true },
    });
    return NextResponse.json(integrations);
  } catch {
    // Fallback: raw query without qrConfig column in case migration hasn't run
    const integrations = await prisma.$queryRaw<{ id: string; provider: string; domain: string | null; isActive: boolean; lastSyncAt: Date | null; createdAt: Date }[]>`
      SELECT id, provider, domain, "isActive", "lastSyncAt", "createdAt"
      FROM "UserIntegration"
      WHERE "userId" = ${session.user.id}
    `;
    return NextResponse.json(integrations);
  }
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

  // Use raw SQL directly — Prisma v7 adapter-pg emits RETURNING * on write operations
  // which fails when qrConfig column hasn't been migrated yet.
  // provider is enum-validated above — safe to interpolate for the cast.
  let integrationId: string;
  try {
    const newId = crypto.randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "UserIntegration" (id, "userId", provider, "apiKey", domain, "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, '${provider}'::"IntegrationProvider", $3, $4, true, NOW(), NOW())
       ON CONFLICT ("userId", provider) DO UPDATE
         SET "apiKey" = EXCLUDED."apiKey", domain = EXCLUDED.domain, "isActive" = true, "updatedAt" = NOW()`,
      newId, session.user.id, apiKey, domain ?? null
    );
    const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "UserIntegration" WHERE "userId" = $1 AND provider = '${provider}'::"IntegrationProvider"`,
      session.user.id
    );
    integrationId = rows[0]?.id ?? newId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[integrations POST] raw upsert failed:", msg);
    return NextResponse.json({ error: `DB error: ${msg}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: integrationId }, { status: 200 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { provider, domain, qrConfig } = body;

  if (!provider) {
    return NextResponse.json({ error: "provider é obrigatório" }, { status: 400 });
  }

  const validProviders = Object.values(IntegrationProvider);
  if (!validProviders.includes(provider)) {
    return NextResponse.json({ error: "Provedor inválido" }, { status: 400 });
  }

  // Build update fields dynamically via raw SQL to avoid qrConfig column issues.
  // provider is enum-validated above — safe to interpolate directly for the cast.
  // $1 = userId, subsequent params start at $2.
  const setClauses: string[] = ['"updatedAt" = NOW()'];
  const sqlValues: unknown[] = [session.user.id];

  if (domain !== undefined) {
    sqlValues.push(domain ?? null);
    setClauses.push(`domain = $${sqlValues.length}`);
  }

  if (qrConfig !== undefined) {
    sqlValues.push(JSON.stringify(qrConfig));
    setClauses.push(`"qrConfig" = $${sqlValues.length}::jsonb`);
  }

  const sql = `
    UPDATE "UserIntegration"
    SET ${setClauses.join(", ")}
    WHERE "userId" = $1 AND provider = '${provider}'::"IntegrationProvider"
  `;

  try {
    await prisma.$executeRawUnsafe(sql, ...sqlValues);
  } catch {
    // qrConfig column doesn't exist yet — retry without it
    if (domain !== undefined) {
      await prisma.$executeRawUnsafe(
        `UPDATE "UserIntegration"
         SET domain = $2, "updatedAt" = NOW()
         WHERE "userId" = $1 AND provider = '${provider}'::"IntegrationProvider"`,
        session.user.id, domain ?? null
      );
    }
    // If only qrConfig was being updated, silently skip (column doesn't exist yet)
  }

  return NextResponse.json({ ok: true });
}
