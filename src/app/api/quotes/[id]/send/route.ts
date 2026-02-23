import { prisma } from "@/lib/prisma";
import { generateQuotePDF } from "@/lib/pdf";
import { sendDocumentEmail, buildQuoteEmailBody } from "@/lib/email";
import { logActivity } from "@/lib/audit";
import { NextResponse } from "next/server";

// POST /api/quotes/[id]/send — Send quote PDF by email
export async function POST(
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

        if (!quote.client?.email) {
            return NextResponse.json(
                { error: "El cliente no tiene email configurado" },
                { status: 400 }
            );
        }

        if (quote.status === "DRAFT") {
            return NextResponse.json(
                { error: "No se puede enviar un presupuesto en borrador. Emítalo primero." },
                { status: 400 }
            );
        }

        const company = await prisma.company.findFirst();
        if (!company) {
            return NextResponse.json({ error: "Empresa no configurada" }, { status: 500 });
        }

        // Generate PDF
        const pdfBuffer = generateQuotePDF(quote, company);
        const docNumber = quote.number
            ? `PRE-${quote.year}-${String(quote.number).padStart(4, "0")}`
            : "BORRADOR";
        const totalFormatted = (quote.totalCents / 100).toLocaleString("es-ES", {
            minimumFractionDigits: 2,
        });

        // Send email
        await sendDocumentEmail(
            quote.client.email,
            `Presupuesto ${docNumber} — Automatio solutions S.L`,
            buildQuoteEmailBody(quote.client.name, docNumber, totalFormatted),
            pdfBuffer,
            `${docNumber}.pdf`
        );

        // Audit log
        await logActivity(quote.companyId, null, "quote", id, "SEND", {
            sentTo: quote.client.email,
            docNumber,
        });

        return NextResponse.json({ success: true, sentTo: quote.client.email });
    } catch (error: any) {
        console.error("Error sending quote:", error);
        const msg = error?.message || "Error desconocido";
        return NextResponse.json(
            { error: `Error al enviar presupuesto por email: ${msg}` },
            { status: 500 }
        );
    }
}
