import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/invoices/[id]
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id, deletedAt: null },
            include: {
                client: { select: { id: true, name: true, taxId: true, email: true } },
                lines: { include: { tax: true }, orderBy: { position: "asc" } },
            },
        });

        if (!invoice) {
            return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
        }

        return NextResponse.json(invoice);
    } catch (error) {
        return NextResponse.json({ error: "Error al obtener factura" }, { status: 500 });
    }
}

// DELETE /api/invoices/[id] — Soft delete
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const invoice = await prisma.invoice.findUnique({ where: { id } });
        if (!invoice) {
            return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
        }
        if (invoice.status !== "DRAFT") {
            return NextResponse.json({ error: "Solo se pueden eliminar facturas en borrador" }, { status: 400 });
        }
        await prisma.invoice.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Error al eliminar factura" }, { status: 500 });
    }
}
