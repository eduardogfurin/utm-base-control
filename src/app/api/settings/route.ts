import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function maskApiKey(key: string | null | undefined): string | null {
  if (!key) return null;
  return `${"*".repeat(Math.max(0, key.length - 4))}${key.slice(-4)}`;
}

type SettingsRow = {
  id: string;
  rebrandlyApiKey: string | null;
  rebrandlyDomain: string | null;
  rebrandlyStatus: boolean;
  rebrandlyLastSync: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

async function fetchSettings(): Promise<SettingsRow | null> {
  try {
    return await prisma.appSettings.findFirst({
      select: {
        id: true,
        rebrandlyApiKey: true,
        rebrandlyDomain: true,
        rebrandlyStatus: true,
        rebrandlyLastSync: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch {
    // qrConfig column missing — fallback to raw SQL
    const rows = await prisma.$queryRaw<SettingsRow[]>`
      SELECT id, "rebrandlyApiKey", "rebrandlyDomain", "rebrandlyStatus", "rebrandlyLastSync", "createdAt", "updatedAt"
      FROM "AppSettings"
      LIMIT 1
    `;
    return rows[0] ?? null;
  }
}

function formatRow(row: SettingsRow) {
  return {
    id: row.id,
    rebrandlyApiKey: maskApiKey(row.rebrandlyApiKey),
    rebrandlyDomain: row.rebrandlyDomain,
    rebrandlyStatus: row.rebrandlyStatus,
    rebrandlyLastSync: row.rebrandlyLastSync,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await fetchSettings();
    if (!settings) return NextResponse.json(null);
    return NextResponse.json(formatRow(settings));
  } catch (err) {
    console.error("[settings GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { rebrandlyApiKey, rebrandlyDomain } = body;

    const existing = await fetchSettings();

    if (existing) {
      // Build raw UPDATE to avoid RETURNING * with missing qrConfig column
      const setClauses: string[] = ['"updatedAt" = NOW()'];
      const values: unknown[] = [existing.id];

      if (rebrandlyApiKey !== undefined) {
        values.push(rebrandlyApiKey);
        setClauses.push(`"rebrandlyApiKey" = $${values.length}`);
      }
      if (rebrandlyDomain !== undefined) {
        values.push(rebrandlyDomain);
        setClauses.push(`"rebrandlyDomain" = $${values.length}`);
      }

      await prisma.$executeRawUnsafe(
        `UPDATE "AppSettings" SET ${setClauses.join(", ")} WHERE id = $1`,
        ...values
      );
    } else {
      // No row yet — create via raw INSERT to avoid RETURNING * issue
      const newId = crypto.randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "AppSettings" (id, "rebrandlyApiKey", "rebrandlyDomain", "rebrandlyStatus", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, false, NOW(), NOW())`,
        newId,
        rebrandlyApiKey ?? null,
        rebrandlyDomain ?? null
      );
    }

    const updated = await fetchSettings();
    if (!updated) return NextResponse.json({ error: "Erro ao ler configurações após salvar" }, { status: 500 });
    return NextResponse.json(formatRow(updated));
  } catch (err) {
    console.error("[settings PATCH]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
