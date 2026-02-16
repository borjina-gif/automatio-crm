import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// PATCH /api/treasury/movements/[id] — reconcile, edit, link to invoice
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const body = await request.json();

        const existing = await prisma.bankTransaction.findUnique({
            where: { id, deletedAt: null },
        });

        if (!existing) {
            return NextResponse.json({ error: "Movimiento no encontrado" }, { status: 404 });
        }

        const data: Record<string, any> = {};

        if (body.isReconciled !== undefined) data.isReconciled = body.isReconciled;
        if (body.description !== undefined) data.description = body.description;
        if (body.counterpartyName !== undefined) data.counterpartyName = body.counterpartyName;
        if (body.category !== undefined) data.category = body.category;
        if (body.linkedInvoiceId !== undefined) data.linkedInvoiceId = body.linkedInvoiceId || null;
        if (body.linkedPurchaseInvoiceId !== undefined) data.linkedPurchaseInvoiceId = body.linkedPurchaseInvoiceId || null;

        const updated = await prisma.bankTransaction.update({
            where: { id },
            data,
            include: {
                account: { select: { id: true, name: true } },
                linkedInvoice: { select: { id: true, number: true, year: true } },
                linkedPurchaseInvoice: { select: { id: true, number: true, year: true } },
            },
        });

        return NextResponse.json(updated);
    } catch (err) {
        console.error("Patch movement error:", err);
        return NextResponse.json({ error: "Error al actualizar movimiento" }, { status: 500 });
    }
}
