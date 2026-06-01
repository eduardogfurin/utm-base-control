import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function maskApiKey(key: string | null | undefined): string | null {
  if (!key) return null;
  return `${"*".repeat(Math.max(0, key.length - 4))}${key.slice(-4)}`;
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.appSettings.findFirst();

    if (!settings) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      id: settings.id,
      rebrandlyApiKey: maskApiKey(settings.rebrandlyApiKey),
      rebrandlyDomain: settings.rebrandlyDomain,
      rebrandlyStatus: settings.rebrandlyStatus,
      rebrandlyLastSync: settings.rebrandlyLastSync,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    });
  } catch {
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

    const existing = await prisma.appSettings.findFirst();

    const data: Record<string, unknown> = {};
    if (rebrandlyApiKey !== undefined) data.rebrandlyApiKey = rebrandlyApiKey;
    if (rebrandlyDomain !== undefined) data.rebrandlyDomain = rebrandlyDomain;

    let settings;
    if (existing) {
      settings = await prisma.appSettings.update({
        where: { id: existing.id },
        data,
      });
    } else {
      settings = await prisma.appSettings.create({ data });
    }

    return NextResponse.json({
      id: settings.id,
      rebrandlyApiKey: maskApiKey(settings.rebrandlyApiKey),
      rebrandlyDomain: settings.rebrandlyDomain,
      rebrandlyStatus: settings.rebrandlyStatus,
      rebrandlyLastSync: settings.rebrandlyLastSync,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
