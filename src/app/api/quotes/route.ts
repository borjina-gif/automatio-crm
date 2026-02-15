import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/quotes — List quotes
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");

        const quotes = await prisma.quote.findMany({
            where: {
                deletedAt: null,
                ...(status ? { status: status as any } : {}),
            },
            include: {
                client: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(quotes);
    } catch (error) {
        console.error("Error fetching quotes:", error);
        return NextResponse.json({ error: "Error al obtener presupuestos" }, { status: 500 });
    }
}

// POST /api/quotes — Create a new quote (DRAFT)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { clientId, notes, publicNotes, validUntil, lines } = body;

        if (!clientId) {
            return NextResponse.json({ error: "El cliente es obligatorio" }, { status: 400 });
        }

        const company = await prisma.company.findFirst();
        if (!company) {
            return NextResponse.json({ error: "Empresa no configurada" }, { status: 500 });
        }

        // Calculate line totals
        const processedLines = (lines || []).map((line: any, idx: number) => {
            const qty = parseFloat(line.quantity) || 0;
            const unitCents = parseInt(line.unitPriceCents) || 0;
            const lineSubtotalCents = Math.round(qty * unitCents);

            // We need tax rate to compute tax
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

        const quote = await prisma.quote.create({
            data: {
                companyId: company.id,
                clientId,
                status: "DRAFT",
                notes: notes || null,
                publicNotes: publicNotes || null,
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

        return NextResponse.json(quote, { status: 201 });
    } catch (error) {
        console.error("Error creating quote:", error);
        return NextResponse.json({ error: "Error al crear presupuesto" }, { status: 500 });
    }
}
