import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/purchases — List purchase invoices
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const from = searchParams.get("from");
        const to = searchParams.get("to");

        const dateFilter: any = {};
        if (from) dateFilter.gte = new Date(from);
        if (to) {
            const toDate = new Date(to);
            toDate.setHours(23, 59, 59, 999);
            dateFilter.lte = toDate;
        }

        const purchases = await prisma.purchaseInvoice.findMany({
            where: {
                deletedAt: null,
                ...(status ? { status: status as any } : {}),
                ...(from || to ? { createdAt: dateFilter } : {}),
            },
            include: {
                provider: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(purchases);
    } catch (error) {
        console.error("Error fetching purchase invoices:", error);
        return NextResponse.json({ error: "Error al obtener facturas de proveedor" }, { status: 500 });
    }
}

// POST /api/purchases — Create a new purchase invoice (DRAFT)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { providerId, providerInvoiceNumber, notes, issueDate, dueDate, lines, retentionRate } = body;

        if (!providerId) {
            return NextResponse.json({ error: "El proveedor es obligatorio" }, { status: 400 });
        }

        const company = await prisma.company.findFirst();
        if (!company) {
            return NextResponse.json({ error: "Empresa no configurada" }, { status: 500 });
        }

        // Calculate line totals — input is now in EUROS, stored as CENTS
        const processedLines = (lines || []).map((line: any, idx: number) => {
            const qty = parseFloat(line.quantity) || 0;

            // Accept both unitPriceEuros (new) and unitPriceCents (legacy)
            let unitCents: number;
            if (line.unitPriceEuros !== undefined) {
                unitCents = Math.round((parseFloat(line.unitPriceEuros) || 0) * 100);
            } else {
                unitCents = parseInt(line.unitPriceCents) || 0;
            }

            const lineSubtotalCents = Math.round(qty * unitCents);
            const taxRate = parseFloat(line.taxRate) || 0;
            const lineTaxCents = Math.round(lineSubtotalCents * taxRate / 100);
            const lineTotalCents = lineSubtotalCents + lineTaxCents;

            return {
                position: idx + 1,
                description: line.description || "",
                details: line.details || null,
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

        // Retention (IRPF) — applied on the subtotal
        const parsedRetentionRate = parseFloat(retentionRate) || 0;
        const retentionCents = Math.round(subtotalCents * parsedRetentionRate / 100);

        // Total = subtotal + IVA - retention
        const totalCents = subtotalCents + taxCents - retentionCents;

        const purchase = await prisma.purchaseInvoice.create({
            data: {
                companyId: company.id,
                providerId,
                providerInvoiceNumber: providerInvoiceNumber || null,
                status: "DRAFT",
                notes: notes || null,
                issueDate: issueDate ? new Date(issueDate) : null,
                dueDate: dueDate ? new Date(dueDate) : null,
                subtotalCents,
                taxCents,
                retentionRate: parsedRetentionRate,
                retentionCents,
                totalCents,
                lines: {
                    create: processedLines,
                },
            },
            include: {
                provider: { select: { id: true, name: true } },
                lines: { include: { tax: true }, orderBy: { position: "asc" } },
            },
        });

        return NextResponse.json(purchase, { status: 201 });
    } catch (error) {
        console.error("Error creating purchase invoice:", error);
        return NextResponse.json({ error: "Error al crear factura de proveedor" }, { status: 500 });
    }
}
