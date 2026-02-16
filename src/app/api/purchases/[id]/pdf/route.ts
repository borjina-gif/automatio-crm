import { prisma } from "@/lib/prisma";
import { generatePurchaseInvoicePDF } from "@/lib/pdf-purchase";
import { NextResponse } from "next/server";

// GET /api/purchases/[id]/pdf — Download purchase invoice PDF
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const purchase = await prisma.purchaseInvoice.findUnique({
            where: { id, deletedAt: null },
            include: {
                provider: true,
                lines: { include: { tax: true }, orderBy: { position: "asc" } },
            },
        });

        if (!purchase) {
            return NextResponse.json({ error: "Factura de proveedor no encontrada" }, { status: 404 });
        }

        const company = await prisma.company.findFirst();
        if (!company) {
            return NextResponse.json({ error: "Empresa no configurada" }, { status: 500 });
        }

        const pdfBuffer = generatePurchaseInvoicePDF(purchase, company);

        const filename = purchase.number
            ? `FP-${purchase.year}-${String(purchase.number).padStart(4, "0")}.pdf`
            : `factura-proveedor-borrador-${id.slice(0, 8)}.pdf`;

        return new Response(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Error generating purchase invoice PDF:", error);
        return NextResponse.json({ error: "Error al generar PDF" }, { status: 500 });
    }
}
