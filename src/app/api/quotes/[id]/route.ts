import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/quotes/[id]
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const quote = await prisma.quote.findUnique({
            where: { id, deletedAt: null },
            include: {
                client: { select: { id: true, name: true, taxId: true, email: true } },
                lines: { include: { tax: true }, orderBy: { position: "asc" } },
            },
        });

        if (!quote) {
            return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
        }

        return NextResponse.json(quote);
    } catch (error) {
        return NextResponse.json({ error: "Error al obtener presupuesto" }, { status: 500 });
    }
}

// PUT /api/quotes/[id] — Update quote (only if DRAFT)
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const body = await request.json();
        const { clientId, notes, publicNotes, validUntil, status, lines } = body;

        // If changing status, only handle simple transitions
        if (status) {
            const quote = await prisma.quote.update({
                where: { id },
                data: { status },
                include: {
                    client: { select: { id: true, name: true } },
                    lines: { include: { tax: true }, orderBy: { position: "asc" } },
                },
            });
            return NextResponse.json(quote);
        }

        // Full update with lines replacement
        const processedLines = (lines || []).map((line: any, idx: number) => {
            const qty = parseFloat(line.quantity) || 0;
            const unitCents = parseInt(line.unitPriceCents) || 0;
            const lineSubtotalCents = Math.round(qty * unitCents);
            const taxRate = parseFloat(line.taxRate) || 0;
            const lineTaxCents = Math.round(lineSubtotalCents * taxRate / 100);
            const lineTotalCents = lineSubtotalCents + lineTaxCents;

            return {
                position: idx + 1,
                description: line.description || "",
                quantity: qty,
                unitPriceCents: unitCents,
                taxId: line.taxId || null,
                lineSubtotalCents,
                lineTaxCents,
                lineTotalCents,
            };
        });

        const subtotalCents = processedLines.reduce((sum: number, l: any) => sum + l.lineSubtotalCents, 0);
        const taxCents = processedLines.reduce((sum: number, l: any) => sum + l.lineTaxCents, 0);
        const totalCents = subtotalCents + taxCents;

        // Transaction: delete old lines, create new ones
        const quote = await prisma.$transaction(async (tx) => {
            await tx.quoteLine.deleteMany({ where: { quoteId: id } });

            return tx.quote.update({
                where: { id },
                data: {
                    clientId: clientId || undefined,
                    notes: notes !== undefined ? notes : undefined,
                    publicNotes: publicNotes !== undefined ? publicNotes : undefined,
                    validUntil: validUntil ? new Date(validUntil) : null,
                    subtotalCents,
                    taxCents,
                    totalCents,
                    lines: {
                        create: processedLines,
                    },
                },
                include: {
                    client: { select: { id: true, name: true } },
                    lines: { include: { tax: true }, orderBy: { position: "asc" } },
                },
            });
        });

        return NextResponse.json(quote);
    } catch (error) {
        console.error("Error updating quote:", error);
        return NextResponse.json({ error: "Error al actualizar presupuesto" }, { status: 500 });
    }
}

// DELETE /api/quotes/[id] — Soft delete
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        await prisma.quote.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Error al eliminar presupuesto" }, { status: 500 });
    }
}
