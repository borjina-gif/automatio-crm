import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/clients/[id]
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const client = await prisma.client.findUnique({
            where: { id, deletedAt: null },
        });

        if (!client) {
            return NextResponse.json(
                { error: "Cliente no encontrado" },
                { status: 404 }
            );
        }

        return NextResponse.json(client);
    } catch (error) {
        console.error("Error fetching client:", error);
        return NextResponse.json(
            { error: "Error al obtener cliente" },
            { status: 500 }
        );
    }
}

// PUT /api/clients/[id]
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
            billingAddressLine1,
            billingCity,
            billingPostalCode,
            billingProvince,
            billingCountry,
            notes,
            paymentTermsDays,
        } = body;

        if (!name || name.trim() === "") {
            return NextResponse.json(
                { error: "El nombre es obligatorio" },
                { status: 400 }
            );
        }

        const client = await prisma.client.update({
            where: { id },
            data: {
                name: name.trim(),
                taxId: taxId || null,
                email: email || null,
                phone: phone || null,
                billingAddressLine1: billingAddressLine1 || null,
                billingCity: billingCity || null,
                billingPostalCode: billingPostalCode || null,
                billingProvince: billingProvince || null,
                billingCountry: billingCountry || "ES",
                notes: notes || null,
                paymentTermsDays: paymentTermsDays ? parseInt(paymentTermsDays) : 30,
            },
        });

        return NextResponse.json(client);
    } catch (error) {
        console.error("Error updating client:", error);
        return NextResponse.json(
            { error: "Error al actualizar cliente" },
            { status: 500 }
        );
    }
}

// DELETE /api/clients/[id] — Soft delete
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        await prisma.client.update({
            where: { id },
            data: { deletedAt: new Date() },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting client:", error);
        return NextResponse.json(
            { error: "Error al eliminar cliente" },
            { status: 500 }
        );
    }
}
