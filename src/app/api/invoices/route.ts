import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { NextResponse } from "next/server";

// GET /api/invoices — List invoices
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");

        const invoices = await prisma.invoice.findMany({
            where: {
                deletedAt: null,
                ...(status ? { status: status as any } : {}),
            },
            include: {
                client: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(invoices);
    } catch (error) {
        console.error("Error fetching invoices:", error);
        return NextResponse.json({ error: "Error al obtener facturas" }, { status: 500 });
    }
}

// POST /api/invoices — Create a new invoice directly (DRAFT, no quote needed)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { clientId, notes, publicNotes, issueDate, dueDate, lines } = body;

        if (!clientId) {
            return NextResponse.json({ error: "El cliente es obligatorio" }, { status: 400 });
        }
        if (!lines || lines.length === 0) {
            return NextResponse.json({ error: "Debe incluir al menos una línea" }, { status: 400 });
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

        const invoice = await prisma.invoice.create({
            data: {
                companyId: company.id,
                clientId,
                type: "INVOICE",
                status: "DRAFT",
                notes: notes || null,
                publicNotes: publicNotes || null,
                issueDate: issueDate ? new Date(issueDate) : null,
                dueDate: dueDate ? new Date(dueDate) : null,
                subtotalCents,
                taxCents,
                totalCents,
                paidCents: 0,
                // sourceQuoteId is null — direct invoice creation
                lines: {
                    create: processedLines,
                },
            },
            include: {
                client: { select: { id: true, name: true } },
                lines: { include: { tax: true }, orderBy: { position: "asc" } },
            },
        });

        await logActivity(company.id, null, "invoice", invoice.id, "CREATE", {
            direct: true,
        });

        return NextResponse.json(invoice, { status: 201 });
    } catch (error) {
        console.error("Error creating invoice:", error);
        return NextResponse.json({ error: "Error al crear factura" }, { status: 500 });
    }
}
