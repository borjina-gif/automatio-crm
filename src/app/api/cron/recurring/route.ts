import { prisma } from "@/lib/prisma";
import { getNextNumber } from "@/lib/numbering";
import { generateInvoicePDF } from "@/lib/pdf";
import { sendDocumentEmail, buildInvoiceEmailBody } from "@/lib/email";
import { logActivity } from "@/lib/audit";
import { NextResponse } from "next/server";

// POST /api/cron/recurring — Cron endpoint for recurring invoices
// Protected by CRON_SECRET (Vercel Cron or manual call)
export async function POST(request: Request) {
    // Validate authorization
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const results: Array<{ templateId: string; name: string; status: string; error?: string }> = [];

    try {
        // Find all ACTIVE templates where nextRunDate <= now
        const templates = await prisma.recurringTemplate.findMany({
            where: {
                status: "ACTIVE",
                nextRunDate: { lte: now },
            },
            include: {
                client: true,
                lines: { include: { tax: true }, orderBy: { position: "asc" } },
            },
        });

        const company = await prisma.company.findFirst();
        if (!company) {
            return NextResponse.json({ error: "Empresa no configurada" }, { status: 500 });
        }

        for (const template of templates) {
            const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
            const idempotencyKey = `${template.id}-${periodKey}`;

            // Check for duplicate
            const existingRun = await prisma.recurringRun.findUnique({
                where: { idempotencyKey },
            });

            if (existingRun) {
                results.push({
                    templateId: template.id,
                    name: template.name,
                    status: "SKIPPED",
                    error: "Already executed for this period",
                });
                continue;
            }

            try {
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

                let errorMessage: string | null = null;

                // If GENERATE_AND_SEND: emit + PDF + send
                if (template.mode === "GENERATE_AND_SEND") {
                    try {
                        const year = now.getFullYear();
                        const { formatted } = await getNextNumber("INVOICE", year, company.id);

                        const termsDays = template.client?.paymentTermsDays ?? 30;
                        const dueDate = new Date(now);
                        dueDate.setDate(dueDate.getDate() + termsDays);

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
                    } catch (sendErr: any) {
                        errorMessage = sendErr.message || "Error al emitir/enviar";
                    }
                }

                // Record SUCCESS run
                await prisma.recurringRun.create({
                    data: {
                        recurringTemplateId: template.id,
                        runDate: now,
                        status: errorMessage ? "FAILED" : "SUCCESS",
                        generatedInvoiceId: invoice.id,
                        idempotencyKey,
                        errorMessage,
                    },
                });

                // Advance nextRunDate
                const nextRun = new Date(template.nextRunDate);
                nextRun.setMonth(nextRun.getMonth() + 1);
                await prisma.recurringTemplate.update({
                    where: { id: template.id },
                    data: { nextRunDate: nextRun },
                });

                await logActivity(company.id, null, "recurring_template", template.id, "CREATE", {
                    action: "cron_run",
                    invoiceId: invoice.id,
                    periodKey,
                });

                results.push({
                    templateId: template.id,
                    name: template.name,
                    status: errorMessage ? "FAILED" : "SUCCESS",
                    error: errorMessage || undefined,
                });
            } catch (templateErr: any) {
                // Record FAILED run
                await prisma.recurringRun.create({
                    data: {
                        recurringTemplateId: template.id,
                        runDate: now,
                        status: "FAILED",
                        idempotencyKey,
                        errorMessage: templateErr.message || "Error desconocido",
                    },
                });

                results.push({
                    templateId: template.id,
                    name: template.name,
                    status: "FAILED",
                    error: templateErr.message,
                });
            }
        }

        return NextResponse.json({
            processed: templates.length,
            results,
            timestamp: now.toISOString(),
        });
    } catch (error: any) {
        console.error("Error in recurring cron:", error);
        return NextResponse.json({ error: error.message || "Error en cron recurrente" }, { status: 500 });
    }
}

// Also support GET for Vercel Cron (Vercel sends GET requests for cron jobs)
export async function GET(request: Request) {
    // Vercel Cron Jobs send a GET request, so we redirect to POST logic
    return POST(request);
}
