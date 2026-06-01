import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, password } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Campos obrigatórios" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { name, email, password: hash, role: UserRole.MARKETING },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
