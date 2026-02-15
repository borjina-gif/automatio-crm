import { prisma } from "@/lib/prisma";
import { generateQuotePDF } from "@/lib/pdf";
import { NextResponse } from "next/server";

// GET /api/quotes/[id]/pdf — Download quote PDF
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const quote = await prisma.quote.findUnique({
            where: { id, deletedAt: null },
            include: {
                client: true,
                lines: { include: { tax: true }, orderBy: { position: "asc" } },
            },
        });

        if (!quote) {
            return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
        }

        // Get company info
        const company = await prisma.company.findFirst();
        if (!company) {
            return NextResponse.json({ error: "Empresa no configurada" }, { status: 500 });
        }

        const pdfBuffer = generateQuotePDF(quote, company);

        const filename = quote.number
            ? `PRE-${quote.year}-${String(quote.number).padStart(4, "0")}.pdf`
            : `presupuesto-borrador-${id.slice(0, 8)}.pdf`;

        return new Response(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Error generating quote PDF:", error);
        return NextResponse.json({ error: "Error al generar PDF" }, { status: 500 });
    }
}
