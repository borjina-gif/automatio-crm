import { prisma } from "@/lib/prisma";
import { getNextNumber } from "@/lib/numbering";
import { logActivity } from "@/lib/audit";
import { NextResponse } from "next/server";

// POST /api/quotes/[id]/emit — Assign number + DRAFT → SENT
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        // Load quote + validate
        const quote = await prisma.quote.findUnique({ where: { id, deletedAt: null } });
        if (!quote) {
            return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
        }
        if (quote.status !== "DRAFT") {
            return NextResponse.json({ error: "Solo se puede emitir un presupuesto en borrador" }, { status: 400 });
        }

        const year = new Date().getFullYear();
        const companyId = quote.companyId;

        // Atomic: get number + update status in transaction
        const updated = await prisma.$transaction(async (tx) => {
            const { number } = await getNextNumber("QUOTE", year, companyId);

            return tx.quote.update({
                where: { id },
                data: {
                    number,
                    year,
                    status: "SENT",
                    issueDate: new Date(),
                },
                include: {
                    client: { select: { id: true, name: true, taxId: true, email: true } },
                    lines: { include: { tax: true }, orderBy: { position: "asc" } },
                },
            });
        });

        // Audit log
        await logActivity(companyId, null, "quote", id, "EMIT", {
            number: updated.number,
            year: updated.year,
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error emitting quote:", error);
        return NextResponse.json({ error: "Error al emitir presupuesto" }, { status: 500 });
    }
}
