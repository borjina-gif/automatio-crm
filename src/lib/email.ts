// ============================================================
// Automatio CRM — Email Service
// SMTP-based email sending with nodemailer
// Env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
// ============================================================

import nodemailer from "nodemailer";

function getTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "465");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        throw new Error(
            "SMTP no configurado. Añade SMTP_HOST, SMTP_USER y SMTP_PASS en las variables de entorno."
        );
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // SSL for 465, STARTTLS for 587
        auth: { user, pass },
        tls: {
            // Allow self-signed certs from mail.automatio.es
            rejectUnauthorized: false,
        },
    });
}

const FROM = process.env.SMTP_FROM || "Automatio solutions S.L <info@automatio.es>";

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
    const transporter = getTransporter();

    await transporter.sendMail({
        from: FROM,
        to,
        subject,
        html: htmlBody,
        attachments: [
            {
                filename: pdfFilename,
                content: pdfBuffer,
                contentType: "application/pdf",
            },
        ],
    });
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
