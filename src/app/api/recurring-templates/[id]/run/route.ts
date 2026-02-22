import { prisma } from "@/lib/prisma";
import { getNextNumber } from "@/lib/numbering";
import { generateInvoicePDF } from "@/lib/pdf";
import { sendDocumentEmail, buildInvoiceEmailBody } from "@/lib/email";
import { logActivity } from "@/lib/audit";
import { NextResponse } from "next/server";

// POST /api/recurring-templates/[id]/run — Manual "Ejecutar ahora"
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const template = await prisma.recurringTemplate.findUnique({
            where: { id },
            include: {
                client: true,
                lines: { include: { tax: true }, orderBy: { position: "asc" } },
            },
        });

        if (!template) {
            return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
        }

        const company = await prisma.company.findFirst();
        if (!company) {
            return NextResponse.json({ error: "Empresa no configurada" }, { status: 500 });
        }

        // Generate idempotency key for manual run
        const now = new Date();
        const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const idempotencyKey = `${id}-${periodKey}-manual-${now.getTime()}`;

        // Create invoice from template lines
        const processedLines = template.lines.map((line) => {
            const qty = Number(line.quantity);
            const unitCents = line.unitPriceCents;
            const lineSubtotalCents = Math.round(qty * unitCents);
            const taxRate = line.tax ? Number(line.tax.rate) : 0;
            const lineTaxCents = Math.round(lineSubtotalCents * taxRate / 100);
            const lineTotalCents = lineSubtotalCents + lineTaxCents;

            return {
                position: line.position,
                description: line.description,
                quantity: line.quantity,
                unitPriceCents: line.unitPriceCents,
                taxId: line.taxId,
                lineSubtotalCents,
                lineTaxCents,
                lineTotalCents,
            };
        });

        const subtotalCents = processedLines.reduce((sum, l) => sum + l.lineSubtotalCents, 0);
        const taxCents = processedLines.reduce((sum, l) => sum + l.lineTaxCents, 0);
        const totalCents = subtotalCents + taxCents;

        // Create DRAFT invoice
        const invoice = await prisma.invoice.create({
            data: {
                companyId: company.id,
                clientId: template.clientId,
                type: "INVOICE",
                status: "DRAFT",
                currency: template.currency,
                notes: template.notes,
                subtotalCents,
                taxCents,
                totalCents,
                paidCents: 0,
                lines: {
                    create: processedLines,
                },
            },
            include: {
                client: true,
                lines: { include: { tax: true }, orderBy: { position: "asc" } },
            },
        });

        let runStatus: "SUCCESS" | "GENERATED" = "GENERATED";
        let errorMessage: string | null = null;

        // If GENERATE_AND_SEND mode: emit + PDF + send email
        if (template.mode === "GENERATE_AND_SEND") {
            try {
                const year = now.getFullYear();
                const { formatted } = await getNextNumber("INVOICE", year, company.id);

                // Calculate due date
                const termsDays = template.client?.paymentTermsDays ?? 30;
                const dueDate = new Date(now);
                dueDate.setDate(dueDate.getDate() + termsDays);

                // Emit the invoice
                const emittedInvoice = await prisma.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        number: formatted,
                        year,
                        status: "ISSUED",
                        issueDate: now,
                        dueDate,
                    },
                    include: {
                        client: true,
                        lines: { include: { tax: true }, orderBy: { position: "asc" } },
                    },
                });

                // Generate PDF and send email
                if (template.client?.email) {
                    const pdfBuffer = generateInvoicePDF(emittedInvoice, company);
                    const docNumber = emittedInvoice.number || "BORRADOR";
                    const totalFormatted = (totalCents / 100).toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                    });
                    const dueDateStr = dueDate.toLocaleDateString("es-ES");

                    await sendDocumentEmail(
                        template.client.email,
                        `Factura ${docNumber} — Automatio solutions S.L`,
                        buildInvoiceEmailBody(template.client.name, docNumber, totalFormatted, dueDateStr),
                        pdfBuffer,
                        `${docNumber.replace(/\//g, "-")}.pdf`
                    );
                }

                runStatus = "SUCCESS";
            } catch (err: any) {
                errorMessage = err.message || "Error al emitir/enviar";
                runStatus = "SUCCESS"; // Invoice was created, just sending failed
            }
        }

        // Record the run
        await prisma.recurringRun.create({
            data: {
                recurringTemplateId: id,
                runDate: now,
                status: runStatus,
                generatedInvoiceId: invoice.id,
                idempotencyKey,
                errorMessage,
            },
        });

        // Advance nextRunDate
        const nextRun = new Date(template.nextRunDate);
        nextRun.setMonth(nextRun.getMonth() + 1);
        await prisma.recurringTemplate.update({
            where: { id },
            data: { nextRunDate: nextRun },
        });

        await logActivity(company.id, null, "recurring_template", id, "CREATE", {
            action: "manual_run",
            invoiceId: invoice.id,
        });

        return NextResponse.json({
            success: true,
            invoiceId: invoice.id,
            runStatus,
            errorMessage,
        });
    } catch (error: any) {
        console.error("Error executing recurring template:", error);
        return NextResponse.json({ error: error.message || "Error al ejecutar plantilla" }, { status: 500 });
    }
}
