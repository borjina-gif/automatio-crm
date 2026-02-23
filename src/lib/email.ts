// ============================================================
// Automatio CRM — Email Service
// Uses Resend API for reliable email delivery
// Env var needed: RESEND_API_KEY
// ============================================================

import { Resend } from "resend";

function getResend(): Resend {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        throw new Error(
            "RESEND_API_KEY no configurada. Añádela en Vercel → Settings → Environment Variables."
        );
    }
    return new Resend(apiKey);
}

const FROM = process.env.EMAIL_FROM || "Automatio CRM <onboarding@resend.dev>";

/**
 * Send a document email with PDF attachment.
 */
export async function sendDocumentEmail(
    to: string,
    subject: string,
    htmlBody: string,
    pdfBuffer: Buffer,
    pdfFilename: string
): Promise<void> {
    const resend = getResend();

    const { error } = await resend.emails.send({
        from: FROM,
        to: [to],
        subject,
        html: htmlBody,
        attachments: [
            {
                filename: pdfFilename,
                content: pdfBuffer.toString("base64"),
            },
        ],
    });

    if (error) {
        console.error("Resend error:", error);
        throw new Error(`Error enviando email: ${error.message}`);
    }
}

/**
 * Build HTML email body for a quote.
 */
export function buildQuoteEmailBody(
    clientName: string,
    docNumber: string,
    totalFormatted: string
): string {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e1e32; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #fff; margin: 0; font-size: 20px;">Automatio solutions S.L</h1>
            <p style="color: #a0a0c0; margin: 4px 0 0;">Presupuesto ${docNumber}</p>
        </div>
        <div style="padding: 24px; background: #f8f9fa; border: 1px solid #e0e0e0;">
            <p>Estimado/a <strong>${clientName}</strong>,</p>
            <p>Adjunto encontrará el presupuesto <strong>${docNumber}</strong> por un importe total de <strong>${totalFormatted} €</strong>.</p>
            <p>Quedamos a su disposición para cualquier consulta.</p>
            <br>
            <p style="color: #888; font-size: 12px;">
                Automatio solutions S.L · info@automatio.es
            </p>
        </div>
    </div>`;
}

/**
 * Build HTML email body for an invoice.
 */
export function buildInvoiceEmailBody(
    clientName: string,
    docNumber: string,
    totalFormatted: string,
    dueDate?: string
): string {
    const dueLine = dueDate
        ? `<p>Fecha de vencimiento: <strong>${dueDate}</strong></p>`
        : "";

    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e1e32; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #fff; margin: 0; font-size: 20px;">Automatio solutions S.L</h1>
            <p style="color: #a0a0c0; margin: 4px 0 0;">Factura ${docNumber}</p>
        </div>
        <div style="padding: 24px; background: #f8f9fa; border: 1px solid #e0e0e0;">
            <p>Estimado/a <strong>${clientName}</strong>,</p>
            <p>Adjunto encontrará la factura <strong>${docNumber}</strong> por un importe total de <strong>${totalFormatted} €</strong>.</p>
            ${dueLine}
            <p>Forma de pago: transferencia bancaria a <strong>ES4120854503000330904034</strong>.</p>
            <p>Quedamos a su disposición para cualquier consulta.</p>
            <br>
            <p style="color: #888; font-size: 12px;">
                Automatio solutions S.L · info@automatio.es
            </p>
        </div>
    </div>`;
}
