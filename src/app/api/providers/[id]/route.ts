import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/providers/[id]
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const provider = await prisma.provider.findUnique({
            where: { id, deletedAt: null },
        });

        if (!provider) {
            return NextResponse.json(
                { error: "Proveedor no encontrado" },
                { status: 404 }
            );
        }

        return NextResponse.json(provider);
    } catch (error) {
        console.error("Error fetching provider:", error);
        return NextResponse.json(
            { error: "Error al obtener proveedor" },
            { status: 500 }
        );
    }
}

// PUT /api/providers/[id]
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const body = await request.json();

        const {
            name,
            taxId,
            email,
            phone,
            addressLine1,
            city,
            postalCode,
            province,
            country,
            notes,
            paymentTermsDays,
        } = body;

        if (!name || name.trim() === "") {
            return NextResponse.json(
                { error: "El nombre es obligatorio" },
                { status: 400 }
            );
        }

        const provider = await prisma.provider.update({
            where: { id },
            data: {
                name: name.trim(),
                taxId: taxId || null,
                email: email || null,
                phone: phone || null,
                addressLine1: addressLine1 || null,
                city: city || null,
                postalCode: postalCode || null,
                province: province || null,
                country: country || "ES",
                notes: notes || null,
                paymentTermsDays: paymentTermsDays ? parseInt(paymentTermsDays) : 30,
            },
        });

        return NextResponse.json(provider);
    } catch (error) {
        console.error("Error updating provider:", error);
        return NextResponse.json(
            { error: "Error al actualizar proveedor" },
            { status: 500 }
        );
    }
}

// DELETE /api/providers/[id] — Soft delete
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        await prisma.provider.update({
            where: { id },
            data: { deletedAt: new Date() },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting provider:", error);
        return NextResponse.json(
            { error: "Error al eliminar proveedor" },
            { status: 500 }
        );
    }
}
