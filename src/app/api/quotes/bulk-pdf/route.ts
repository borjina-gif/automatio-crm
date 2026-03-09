import { prisma } from "@/lib/prisma";
import { generateQuotePDF } from "@/lib/pdf";
import { NextResponse } from "next/server";
import JSZip from "jszip";

// POST /api/quotes/bulk-pdf — Download multiple quote PDFs as ZIP
export async function POST(request: Request) {
    try {
        const { ids } = await request.json();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "No se han seleccionado presupuestos" }, { status: 400 });
        }

        const company = await prisma.company.findFirst();
        if (!company) {
            return NextResponse.json({ error: "Empresa no configurada" }, { status: 500 });
        }

        const quotes = await prisma.quote.findMany({
            where: { id: { in: ids } },
            include: {
                client: true,
                lines: { include: { tax: true }, orderBy: { position: "asc" } },
            },
        });

        if (quotes.length === 1) {
            const pdf = generateQuotePDF(quotes[0], company);
            const docNumber = quotes[0].number || "borrador";
            return new Response(new Uint8Array(pdf), {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="presupuesto-${docNumber}.pdf"`,
                },
            });
        }

        const zip = new JSZip();
        for (const q of quotes) {
            const pdf = generateQuotePDF(q, company);
            const docNumber = q.number || `borrador-${q.id.slice(0, 8)}`;
            zip.file(`presupuesto-${docNumber}.pdf`, pdf);
        }

        const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

        return new Response(new Uint8Array(zipBuffer), {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="presupuestos-${new Date().toISOString().slice(0, 10)}.zip"`,
            },
        });
    } catch (error: any) {
        console.error("Error generating bulk PDFs:", error);
        return NextResponse.json({ error: error.message || "Error" }, { status: 500 });
    }
}
