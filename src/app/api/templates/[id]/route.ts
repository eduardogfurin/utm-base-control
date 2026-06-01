import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const template = await prisma.utmTemplate.findUnique({
      where: { id },
      include: {
        vehicle: { select: { id: true, name: true, slug: true, category: true } },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "VIEWER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.utmTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, source, medium, campaign, content, term, vehicleId } = body;

    if (vehicleId !== undefined && vehicleId !== null) {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle) {
        return NextResponse.json(
          { error: "Vehicle not found" },
          { status: 404 }
        );
      }
    }

    const updated = await prisma.utmTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(source !== undefined && { source }),
        ...(medium !== undefined && { medium }),
        ...(campaign !== undefined && { campaign }),
        ...(content !== undefined && { content }),
        ...(term !== undefined && { term }),
        ...(vehicleId !== undefined && { vehicleId }),
      },
      include: {
        vehicle: { select: { id: true, name: true, slug: true, category: true } },
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "VIEWER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const template = await prisma.utmTemplate.findUnique({ where: { id } });
    if (!template) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.utmTemplate.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
