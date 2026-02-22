import { prisma } from "@/lib/prisma";
import { getNextNumber } from "@/lib/numbering";
import { logActivity } from "@/lib/audit";
import { NextResponse } from "next/server";

// POST /api/invoices/[id]/emit — Assign number + DRAFT → ISSUED
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id, deletedAt: null },
            include: { client: { select: { paymentTermsDays: true } } },
        });
        if (!invoice) {
            return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
        }
        if (invoice.status !== "DRAFT") {
            return NextResponse.json({ error: "Solo se puede emitir una factura en borrador" }, { status: 400 });
        }

        const year = new Date().getFullYear();
        const companyId = invoice.companyId;
        const docType = invoice.type === "CREDIT_NOTE" ? "CREDIT_NOTE" : "INVOICE";
        const issueDate = new Date();

        // Calculate due date from client payment terms
        const termsDays = invoice.client?.paymentTermsDays ?? 30;
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + termsDays);

        // Atomic: get number + update status
        const updated = await prisma.$transaction(async (tx) => {
            const { formatted } = await getNextNumber(docType, year, companyId);

            return tx.invoice.update({
                where: { id },
                data: {
                    number: formatted,
                    year,
                    status: "ISSUED",
                    issueDate,
                    dueDate,
                },
                include: {
                    client: { select: { id: true, name: true, taxId: true, email: true } },
                    lines: { include: { tax: true }, orderBy: { position: "asc" } },
                },
            });
        });

        await logActivity(companyId, null, "invoice", id, "EMIT", {
            number: updated.number,
            year: updated.year,
            type: updated.type,
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error emitting invoice:", error);
        return NextResponse.json({ error: "Error al emitir factura" }, { status: 500 });
    }
}
