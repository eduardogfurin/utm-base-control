import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, diffAndAudit } from "@/lib/audit";
import { AuditAction, Status } from "@prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        _count: { select: { links: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        links: {
          take: 20,
          orderBy: { createdAt: "desc" },
          select: { id: true, slug: true, finalUrl: true, status: true, createdAt: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(campaign);
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

    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, slug, description, startDate, endDate, status } = body;

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(status !== undefined && { status: status as Status }),
      },
      include: {
        _count: { select: { links: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    await diffAndAudit(
      session.user.id,
      "Campaign",
      id,
      {
        name: existing.name,
        slug: existing.slug,
        description: existing.description,
        startDate: existing.startDate?.toISOString(),
        endDate: existing.endDate?.toISOString(),
        status: existing.status,
      },
      {
        name: updated.name,
        slug: updated.slug,
        description: updated.description,
        startDate: updated.startDate?.toISOString(),
        endDate: updated.endDate?.toISOString(),
        status: updated.status,
      },
      { campaignId: id }
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

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { _count: { select: { links: true } } },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (campaign._count.links > 0) {
      // Soft delete: archive instead of removing
      const archived = await prisma.campaign.update({
        where: { id },
        data: { status: Status.ARCHIVED },
      });

      await createAuditLog({
        userId: session.user.id,
        action: AuditAction.UPDATED,
        entityType: "Campaign",
        entityId: id,
        campaignId: id,
        field: "status",
        oldValue: campaign.status,
        newValue: Status.ARCHIVED,
      });

      return NextResponse.json({
        archived: true,
        message: "Campaign has links and was archived instead of deleted",
        campaign: archived,
      });
    }

    await prisma.campaign.delete({ where: { id } });

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.DELETED,
      entityType: "Campaign",
      entityId: id,
      campaignId: id,
      oldValue: JSON.stringify({ name: campaign.name, slug: campaign.slug }),
    });

    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
