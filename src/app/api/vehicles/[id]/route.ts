import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, diffAndAudit } from "@/lib/audit";
import { AuditAction, VehicleCategory, Status } from "@prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        _count: { select: { links: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        utmTemplates: true,
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(vehicle);
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

    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, slug, category, description, status } = body;

    const updated = await prisma.vehicle.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(category !== undefined && { category: category as VehicleCategory }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status: status as Status }),
      },
      include: {
        _count: { select: { links: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    await diffAndAudit(
      session.user.id,
      "Vehicle",
      id,
      {
        name: existing.name,
        slug: existing.slug,
        category: existing.category,
        description: existing.description,
        status: existing.status,
      },
      {
        name: updated.name,
        slug: updated.slug,
        category: updated.category,
        description: updated.description,
        status: updated.status,
      },
      { vehicleId: id }
    );

    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Slug already in use" },
        { status: 409 }
      );
    }
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

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: { _count: { select: { links: true } } },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (vehicle._count.links > 0) {
      // Soft delete: archive instead of removing
      const archived = await prisma.vehicle.update({
        where: { id },
        data: { status: Status.ARCHIVED },
      });

      await createAuditLog({
        userId: session.user.id,
        action: AuditAction.UPDATED,
        entityType: "Vehicle",
        entityId: id,
        vehicleId: id,
        field: "status",
        oldValue: vehicle.status,
        newValue: Status.ARCHIVED,
      });

      return NextResponse.json({
        archived: true,
        message: "Vehicle has links and was archived instead of deleted",
        vehicle: archived,
      });
    }

    await prisma.vehicle.delete({ where: { id } });

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.DELETED,
      entityType: "Vehicle",
      entityId: id,
      vehicleId: id,
      oldValue: JSON.stringify({ name: vehicle.name, slug: vehicle.slug }),
    });

    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
