import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/services/[id]
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const service = await prisma.service.findUnique({
            where: { id },
            include: { defaultTax: true },
        });

        if (!service) {
            return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
        }

        return NextResponse.json(service);
    } catch (error) {
        return NextResponse.json({ error: "Error al obtener servicio" }, { status: 500 });
    }
}

// PUT /api/services/[id]
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const body = await request.json();
        const { name, description, unitPriceCents, defaultTaxId, isActive } = body;

        if (!name || name.trim() === "") {
            return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
        }

        const service = await prisma.service.update({
            where: { id },
            data: {
                name: name.trim(),
                description: description || null,
                unitPriceCents: parseInt(unitPriceCents) || 0,
                defaultTaxId: defaultTaxId || null,
                isActive: isActive !== undefined ? isActive : true,
            },
            include: { defaultTax: true },
        });

        return NextResponse.json(service);
    } catch (error) {
        return NextResponse.json({ error: "Error al actualizar servicio" }, { status: 500 });
    }
}

// DELETE /api/services/[id]
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        await prisma.service.update({
            where: { id },
            data: { isActive: false },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Error al desactivar servicio" }, { status: 500 });
    }
}
