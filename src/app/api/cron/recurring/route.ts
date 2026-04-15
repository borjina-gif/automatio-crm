import { prisma } from "@/lib/prisma";
import { getNextNumber } from "@/lib/numbering";
import { generateInvoicePDF } from "@/lib/pdf";
import { sendDocumentEmail, buildInvoiceEmailBody, sendNotificationEmail } from "@/lib/email";
import { logActivity } from "@/lib/audit";
import { NextResponse } from "next/server";

// Validate cron authorization — supports both Vercel Cron and manual calls
function validateCronAuth(request: Request): boolean {
    const cronSecret = process.env.CRON_SECRET;

    // If no CRON_SECRET configured, allow (for dev environments)
    if (!cronSecret) return true;

    // Vercel Cron uses this header automatically
    const vercelCronHeader = request.headers.get("x-vercel-cron-auth");
    if (vercelCronHeader === cronSecret) return true;

    // Manual call with Bearer token
    const authHeader = request.headers.get("authorization");
    if (authHeader === `Bearer ${cronSecret}`) return true;

    return false;
}

// POST /api/cron/recurring — Cron endpoint for recurring invoices
export async function POST(request: Request) {
    if (!validateCronAuth(request)) {
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

        // Send summary notification email to company
        if (company.email && results.length > 0) {
            const successCount = results.filter(r => r.status === "SUCCESS").length;
            const failedCount = results.filter(r => r.status === "FAILED").length;
            const skippedCount = results.filter(r => r.status === "SKIPPED").length;

            const rows = results.map(r => {
                const statusIcon = r.status === "SUCCESS" ? "✅" : r.status === "SKIPPED" ? "⏭️" : "❌";
                const errorLine = r.error ? `<br><small style="color:#ef4444">${r.error}</small>` : "";
                return `<tr>
                    <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${r.name}</td>
                    <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${statusIcon} ${r.status}${errorLine}</td>
                </tr>`;
            }).join("");

            const htmlBody = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                <div style="background:#1e1e32;padding:20px;border-radius:8px 8px 0 0">
                    <h1 style="color:#fff;margin:0;font-size:20px">Facturas Recurrentes — Resumen</h1>
                    <p style="color:#a0a0c0;margin:4px 0 0">${now.toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
                <div style="padding:24px;background:#f8f9fa;border:1px solid #e0e0e0">
                    <p>Se han procesado <strong>${results.length}</strong> plantillas recurrentes:</p>
                    <ul style="margin:8px 0 16px">
                        ${successCount > 0 ? `<li>✅ <strong>${successCount}</strong> generadas correctamente</li>` : ""}
                        ${failedCount > 0 ? `<li>❌ <strong>${failedCount}</strong> con errores</li>` : ""}
                        ${skippedCount > 0 ? `<li>⏭️ <strong>${skippedCount}</strong> omitidas (ya ejecutadas)</li>` : ""}
                    </ul>
                    <table style="width:100%;border-collapse:collapse;font-size:14px">
                        <thead><tr style="background:#eee">
                            <th style="padding:8px 12px;text-align:left">Plantilla</th>
                            <th style="padding:8px 12px;text-align:left">Estado</th>
                        </tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                    <br>
                    <p style="color:#888;font-size:12px">Automatio solutions S.L · info@automatio.es</p>
                </div>
            </div>`;

            try {
                await sendNotificationEmail(
                    company.email,
                    `Facturas recurrentes: ${successCount} generadas — ${now.toLocaleDateString("es-ES")}`,
                    htmlBody
                );
            } catch (emailErr) {
                console.error("Error sending recurring summary email:", emailErr);
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
