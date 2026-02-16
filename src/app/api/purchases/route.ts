import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/purchases — List purchase invoices
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");

        const purchases = await prisma.purchaseInvoice.findMany({
            where: {
                deletedAt: null,
                ...(status ? { status: status as any } : {}),
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
        const { providerId, providerInvoiceNumber, notes, issueDate, dueDate, lines } = body;

        if (!providerId) {
            return NextResponse.json({ error: "El proveedor es obligatorio" }, { status: 400 });
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
