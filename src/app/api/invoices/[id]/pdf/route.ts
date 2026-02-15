import { prisma } from "@/lib/prisma";
import { generateInvoicePDF } from "@/lib/pdf";
import { NextResponse } from "next/server";

// GET /api/invoices/[id]/pdf — Download invoice PDF
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id, deletedAt: null },
            include: {
                client: true,
                lines: { include: { tax: true }, orderBy: { position: "asc" } },
            },
        });

        if (!invoice) {
            return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
        }

        const company = await prisma.company.findFirst();
        if (!company) {
            return NextResponse.json({ error: "Empresa no configurada" }, { status: 500 });
        }

        const pdfBuffer = generateInvoicePDF(invoice, company);

        const prefix = invoice.type === "CREDIT_NOTE" ? "REC" : "FAC";
        const filename = invoice.number
            ? `${prefix}-${invoice.year}-${String(invoice.number).padStart(4, "0")}.pdf`
            : `factura-borrador-${id.slice(0, 8)}.pdf`;

        return new Response(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Error generating invoice PDF:", error);
        return NextResponse.json({ error: "Error al generar PDF" }, { status: 500 });
    }
}
