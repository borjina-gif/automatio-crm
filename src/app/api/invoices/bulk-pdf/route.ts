import { prisma } from "@/lib/prisma";
import { generateInvoicePDF } from "@/lib/pdf";
import { NextResponse } from "next/server";
import JSZip from "jszip";

// POST /api/invoices/bulk-pdf — Download multiple invoice PDFs as ZIP
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

        const invoices = await prisma.invoice.findMany({
            where: { id: { in: ids } },
            include: {
                client: true,
                lines: { include: { tax: true }, orderBy: { position: "asc" } },
            },
        });

        if (invoices.length === 1) {
            // Single invoice — return PDF directly
            const pdf = generateInvoicePDF(invoices[0], company);
            const docNumber = invoices[0].number || "borrador";
            return new Response(new Uint8Array(pdf), {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="factura-${docNumber}.pdf"`,
                },
            });
        }

        // Multiple invoices — ZIP
        const zip = new JSZip();
        for (const inv of invoices) {
            const pdf = generateInvoicePDF(inv, company);
            const docNumber = inv.number || `borrador-${inv.id.slice(0, 8)}`;
            zip.file(`factura-${docNumber}.pdf`, pdf);
        }

        const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

        return new Response(new Uint8Array(zipBuffer), {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="facturas-${new Date().toISOString().slice(0, 10)}.zip"`,
            },
        });
    } catch (error: any) {
        console.error("Error generating bulk PDFs:", error);
        return NextResponse.json({ error: error.message || "Error" }, { status: 500 });
    }
}
