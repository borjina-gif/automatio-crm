import { prisma } from "@/lib/prisma";
import { generateInvoicePDF } from "@/lib/pdf";
import { sendDocumentEmail, buildInvoiceEmailBody } from "@/lib/email";
import { logActivity } from "@/lib/audit";
import { NextResponse } from "next/server";

// POST /api/invoices/[id]/send — Send invoice PDF by email
export async function POST(
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

        if (!invoice.client?.email) {
            return NextResponse.json(
                { error: "El cliente no tiene email configurado" },
                { status: 400 }
            );
        }

        if (invoice.status === "DRAFT") {
            return NextResponse.json(
                { error: "No se puede enviar una factura en borrador. Emítala primero." },
                { status: 400 }
            );
        }

        const company = await prisma.company.findFirst();
        if (!company) {
            return NextResponse.json({ error: "Empresa no configurada" }, { status: 500 });
        }

        // Generate PDF
        const pdfBuffer = generateInvoicePDF(invoice, company);
        const docNumber = invoice.number || "BORRADOR";
        const totalFormatted = (invoice.totalCents / 100).toLocaleString("es-ES", {
            minimumFractionDigits: 2,
        });
        const dueDateStr = invoice.dueDate
            ? new Date(invoice.dueDate).toLocaleDateString("es-ES")
            : undefined;

        // Send email
        await sendDocumentEmail(
            invoice.client.email,
            `Factura ${docNumber} — Automatio solutions S.L`,
            buildInvoiceEmailBody(invoice.client.name, docNumber, totalFormatted, dueDateStr),
            pdfBuffer,
            `${docNumber}.pdf`
        );

        // Audit log
        await logActivity(invoice.companyId, null, "invoice", id, "SEND", {
            sentTo: invoice.client.email,
            docNumber,
        });

        return NextResponse.json({ success: true, sentTo: invoice.client.email });
    } catch (error: any) {
        console.error("Error sending invoice:", error);
        const msg = error?.message || "Error desconocido";
        return NextResponse.json(
            { error: `Error al enviar factura por email: ${msg}` },
            { status: 500 }
        );
    }
}
