import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await prisma.utmTemplate.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        vehicle: { select: { id: true, name: true, slug: true, category: true } },
      },
    });

    return NextResponse.json(templates);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "VIEWER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, source, medium, campaign, content, term, vehicleId } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    if (vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle) {
        return NextResponse.json(
          { error: "Vehicle not found" },
          { status: 404 }
        );
      }
    }

    const template = await prisma.utmTemplate.create({
      data: {
        name,
        source: source ?? null,
        medium: medium ?? null,
        campaign: campaign ?? null,
        content: content ?? null,
        term: term ?? null,
        vehicleId: vehicleId ?? null,
      },
      include: {
        vehicle: { select: { id: true, name: true, slug: true, category: true } },
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
