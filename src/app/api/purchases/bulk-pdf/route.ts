import { prisma } from "@/lib/prisma";
import { generateDocumentPDF } from "@/lib/pdf";
import { NextResponse } from "next/server";
import JSZip from "jszip";

// POST /api/purchases/bulk-pdf — Download multiple purchase PDFs as ZIP
export async function POST(request: Request) {
    try {
        const { ids } = await request.json();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "No se han seleccionado facturas" }, { status: 400 });
        }

        const company = await prisma.company.findFirst();
        if (!company) {
            return NextResponse.json({ error: "Empresa no configurada" }, { status: 500 });
        }

        const purchases = await prisma.purchaseInvoice.findMany({
            where: { id: { in: ids } },
            include: {
                provider: true,
                lines: { include: { tax: true }, orderBy: { position: "asc" } },
            },
        });

        function makePDF(pur: any) {
            const docNumber = pur.number ? `FP-${pur.year}-${String(pur.number).padStart(4, "0")}` : (pur.providerInvoiceNumber || "BORRADOR");
            return generateDocumentPDF({
                docType: "invoice",
                docNumber,
                status: pur.status,
                issueDate: pur.issueDate,
                dueDate: pur.dueDate,
                subtotalCents: pur.subtotalCents,
                taxCents: pur.taxCents,
                totalCents: pur.totalCents,
                lines: pur.lines,
                company: company!,
                client: { ...pur.provider, name: pur.provider.name },
                publicNotes: pur.notes,
            });
        }

        if (purchases.length === 1) {
            const pdf = makePDF(purchases[0]);
            const docNumber = purchases[0].number ? `FP-${purchases[0].year}-${String(purchases[0].number).padStart(4, "0")}` : "borrador";
            return new Response(new Uint8Array(pdf), {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="factura-proveedor-${docNumber}.pdf"`,
                },
            });
        }

        // Multiple invoices — ZIP
        const zip = new JSZip();
        for (const pur of purchases) {
            const pdf = makePDF(pur);
            const docNumber = pur.number ? `FP-${pur.year}-${String(pur.number).padStart(4, "0")}` : `borrador-${pur.id.slice(0, 8)}`;
            zip.file(`factura-proveedor-${docNumber}.pdf`, pdf);
        }

        const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

        return new Response(new Uint8Array(zipBuffer), {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="facturas-proveedor-${new Date().toISOString().slice(0, 10)}.zip"`,
            },
        });
    } catch (error: any) {
        console.error("Error generating bulk PDFs:", error);
        return NextResponse.json({ error: error.message || "Error" }, { status: 500 });
    }
}
