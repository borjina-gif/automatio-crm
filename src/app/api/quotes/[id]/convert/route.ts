import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { NextResponse } from "next/server";

// POST /api/quotes/[id]/convert — Convert ACCEPTED quote → Invoice (DRAFT)
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const quote = await prisma.quote.findUnique({
            where: { id, deletedAt: null },
            include: {
                lines: { include: { tax: true }, orderBy: { position: "asc" } },
            },
        });

        if (!quote) {
            return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
        }
        if (quote.status !== "ACCEPTED") {
            return NextResponse.json(
                { error: "Solo se puede convertir un presupuesto aceptado" },
                { status: 400 }
            );
        }
        if (quote.convertedInvoiceId) {
            return NextResponse.json(
                { error: "Este presupuesto ya fue convertido a factura" },
                { status: 400 }
            );
        }

        // Transaction: create invoice + link back to quote
        const invoice = await prisma.$transaction(async (tx) => {
            const newInvoice = await tx.invoice.create({
                data: {
                    companyId: quote.companyId,
                    clientId: quote.clientId,
                    type: "INVOICE",
                    status: "DRAFT",
                    currency: quote.currency,
                    notes: quote.notes,
                    publicNotes: quote.publicNotes,
                    subtotalCents: quote.subtotalCents,
                    taxCents: quote.taxCents,
                    totalCents: quote.totalCents,
                    paidCents: 0,
                    sourceQuoteId: quote.id,
                    lines: {
                        create: quote.lines.map((line) => ({
                            position: line.position,
                            description: line.description,
                            quantity: line.quantity,
                            unitPriceCents: line.unitPriceCents,
                            taxId: line.taxId,
                            lineSubtotalCents: line.lineSubtotalCents,
                            lineTaxCents: line.lineTaxCents,
                            lineTotalCents: line.lineTotalCents,
                        })),
                    },
                },
                include: {
                    client: { select: { id: true, name: true } },
                    lines: { include: { tax: true }, orderBy: { position: "asc" } },
                },
            });

            // Link quote to the created invoice
            await tx.quote.update({
                where: { id },
                data: { convertedInvoiceId: newInvoice.id },
            });

            return newInvoice;
        });

        // Audit log
        await logActivity(quote.companyId, null, "quote", id, "CONVERT", {
            invoiceId: invoice.id,
        });
        await logActivity(quote.companyId, null, "invoice", invoice.id, "CREATE", {
            sourceQuoteId: id,
        });

        return NextResponse.json(invoice);
    } catch (error) {
        console.error("Error converting quote:", error);
        return NextResponse.json({ error: "Error al convertir presupuesto" }, { status: 500 });
    }
}
