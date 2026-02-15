// ============================================================
// Automatio CRM — PDF Generation
// jsPDF-based document generator for quotes and invoices
// ============================================================

import { jsPDF } from "jspdf";

// ─── TYPES ──────────────────────────────────────────────────

interface DocumentLine {
    position: number;
    description: string;
    quantity: number;
    unitPriceCents: number;
    lineSubtotalCents: number;
    lineTaxCents: number;
    lineTotalCents: number;
    tax?: { name: string; rate: number } | null;
}

interface CompanyInfo {
    legalName: string;
    tradeName?: string | null;
    taxId?: string | null;
    addressLine1?: string | null;
    city?: string | null;
    postalCode?: string | null;
    province?: string | null;
    country?: string;
    email?: string | null;
    phone?: string | null;
    bankIban?: string | null;
}

interface ClientInfo {
    name: string;
    taxId?: string | null;
    email?: string | null;
    billingAddressLine1?: string | null;
    billingCity?: string | null;
    billingPostalCode?: string | null;
    billingProvince?: string | null;
}

interface DocumentData {
    docType: "quote" | "invoice";
    docNumber: string; // e.g. "PRE-2026-0001"
    status: string;
    issueDate?: Date | string | null;
    validUntil?: Date | string | null;
    dueDate?: Date | string | null;
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
    lines: DocumentLine[];
    company: CompanyInfo;
    client: ClientInfo;
    publicNotes?: string | null;
    invoiceType?: string; // "INVOICE" | "CREDIT_NOTE"
}

// ─── HELPERS ────────────────────────────────────────────────

function fmtCents(cents: number): string {
    return (cents / 100).toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function fmtDate(d: Date | string | null | undefined): string {
    if (!d) return "—";
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

// ─── LEGAL FOOTER ───────────────────────────────────────────

const LEGAL_FOOTER = [
    "1. Este documento se emite conforme a los datos facilitados por el cliente. Revíselo y comunique cualquier error a la mayor brevedad.",
    "2. Salvo pacto por escrito, la forma de pago es transferencia bancaria a ES4120854503000330904034.",
    "3. Los importes e impuestos aplicados se calculan según la información y configuración fiscal disponible en el momento de emisión.",
    "4. Presupuestos: validez indicada en el propio documento. La aceptación implica conformidad con el alcance y precios descritos.",
    "5. Facturas: el impago en plazo podrá dar lugar a reclamación de cantidades conforme a la normativa aplicable.",
    "6. Protección de datos: los datos se tratan para la gestión administrativa y contractual. Puede ejercer sus derechos contactando en info@automatio.es.",
    "7. En caso de controversia, las partes se someten a la jurisdicción que corresponda legalmente.",
];

const IBAN = "ES4120854503000330904034";

// ─── PDF GENERATOR ──────────────────────────────────────────

export function generateDocumentPDF(data: DocumentData): Buffer {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = 210;
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    // ── HEADER BAR ──────────────────────────────────────
    doc.setFillColor(30, 30, 50);
    doc.rect(0, 0, pageWidth, 40, "F");

    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(data.company.tradeName || data.company.legalName, margin, 18);

    // Document type title
    const docTitle =
        data.docType === "quote"
            ? "PRESUPUESTO"
            : data.invoiceType === "CREDIT_NOTE"
                ? "FACTURA RECTIFICATIVA"
                : "FACTURA";
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(docTitle, margin, 28);

    // Document number (right)
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(data.docNumber, pageWidth - margin, 18, { align: "right" });

    // Date (right)
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(fmtDate(data.issueDate), pageWidth - margin, 28, { align: "right" });

    y = 50;

    // ── COMPANY & CLIENT BLOCKS ─────────────────────────
    doc.setTextColor(80, 80, 100);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("EMISOR", margin, y);
    doc.text("CLIENTE", margin + contentWidth / 2 + 5, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 60);

    // Company info (left column)
    const companyLines = [
        data.company.legalName,
        data.company.taxId ? `CIF: ${data.company.taxId}` : null,
        data.company.addressLine1,
        [data.company.postalCode, data.company.city, data.company.province]
            .filter(Boolean)
            .join(", ") || null,
        data.company.email,
        data.company.phone,
    ].filter(Boolean) as string[];

    companyLines.forEach((line) => {
        doc.text(line, margin, y);
        y += 4.5;
    });

    // Client info (right column)
    let yRight = 55;
    const clientLines = [
        data.client.name,
        data.client.taxId ? `NIF: ${data.client.taxId}` : null,
        data.client.billingAddressLine1,
        [data.client.billingPostalCode, data.client.billingCity, data.client.billingProvince]
            .filter(Boolean)
            .join(", ") || null,
        data.client.email,
    ].filter(Boolean) as string[];

    clientLines.forEach((line) => {
        doc.text(line, margin + contentWidth / 2 + 5, yRight);
        yRight += 4.5;
    });

    y = Math.max(y, yRight) + 5;

    // ── DATES ROW ───────────────────────────────────────
    doc.setFillColor(245, 245, 250);
    doc.rect(margin, y, contentWidth, 8, "F");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 100);

    const dateParts: string[] = [];
    if (data.issueDate) dateParts.push(`Fecha: ${fmtDate(data.issueDate)}`);
    if (data.validUntil) dateParts.push(`Válido hasta: ${fmtDate(data.validUntil)}`);
    if (data.dueDate) dateParts.push(`Vencimiento: ${fmtDate(data.dueDate)}`);

    doc.text(dateParts.join("   |   "), margin + 3, y + 5.5);
    y += 14;

    // ── LINES TABLE ─────────────────────────────────────
    // Header
    doc.setFillColor(30, 30, 50);
    doc.rect(margin, y, contentWidth, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");

    const cols = [
        { label: "#", x: margin + 2, w: 8 },
        { label: "Descripción", x: margin + 12, w: 65 },
        { label: "Cant.", x: margin + 80, w: 15 },
        { label: "Precio", x: margin + 97, w: 22 },
        { label: "Impuesto", x: margin + 121, w: 22 },
        { label: "Subtotal", x: margin + 145, w: 25 },
    ];

    cols.forEach((col) => doc.text(col.label, col.x, y + 5.5));
    y += 10;

    // Data rows
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 60);

    data.lines.forEach((line, idx) => {
        // Check page break
        if (y > 250) {
            doc.addPage();
            y = 20;
        }

        // Alternate row bg
        if (idx % 2 === 0) {
            doc.setFillColor(250, 250, 252);
            doc.rect(margin, y - 3, contentWidth, 8, "F");
        }

        doc.setFontSize(8);
        doc.text(String(line.position), cols[0].x, y + 2);

        // Truncate description if too long
        const desc =
            line.description.length > 40
                ? line.description.substring(0, 38) + "…"
                : line.description;
        doc.text(desc, cols[1].x, y + 2);
        doc.text(String(Number(line.quantity)), cols[2].x, y + 2);
        doc.text(`${fmtCents(line.unitPriceCents)} €`, cols[3].x, y + 2);
        doc.text(line.tax?.name || "—", cols[4].x, y + 2);
        doc.text(`${fmtCents(line.lineTotalCents)} €`, cols[5].x, y + 2);

        y += 7;
    });

    y += 5;

    // ── TOTALS ──────────────────────────────────────────
    const totalsX = margin + contentWidth - 60;

    doc.setDrawColor(220, 220, 230);
    doc.line(totalsX, y, margin + contentWidth, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal:", totalsX, y);
    doc.text(`${fmtCents(data.subtotalCents)} €`, margin + contentWidth, y, {
        align: "right",
    });
    y += 5;

    doc.text("Impuestos:", totalsX, y);
    doc.text(`${fmtCents(data.taxCents)} €`, margin + contentWidth, y, {
        align: "right",
    });
    y += 6;

    doc.setFillColor(30, 30, 50);
    doc.rect(totalsX - 2, y - 4, contentWidth - totalsX + 4, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", totalsX, y + 2);
    doc.text(`${fmtCents(data.totalCents)} €`, margin + contentWidth, y + 2, {
        align: "right",
    });

    y += 14;
    doc.setTextColor(40, 40, 60);

    // ── IBAN ────────────────────────────────────────────
    doc.setFillColor(240, 245, 255);
    doc.rect(margin, y, contentWidth, 10, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Forma de pago: Transferencia bancaria", margin + 3, y + 4);
    doc.setFont("helvetica", "normal");
    doc.text(`IBAN: ${IBAN}`, margin + 3, y + 8.5);
    y += 16;

    // ── PUBLIC NOTES ────────────────────────────────────
    if (data.publicNotes) {
        if (y > 240) {
            doc.addPage();
            y = 20;
        }
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(80, 80, 100);
        doc.text("Observaciones:", margin, y);
        y += 4;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 80);
        const noteLines = doc.splitTextToSize(data.publicNotes, contentWidth);
        doc.text(noteLines, margin, y);
        y += noteLines.length * 3.5 + 4;
    }

    // ── LEGAL FOOTER ────────────────────────────────────
    // Always on last portion of page or new page
    if (y > 230) {
        doc.addPage();
        y = 20;
    }

    doc.setDrawColor(200, 200, 210);
    doc.line(margin, y, margin + contentWidth, y);
    y += 5;

    doc.setFontSize(6);
    doc.setTextColor(130, 130, 150);
    doc.setFont("helvetica", "normal");

    LEGAL_FOOTER.forEach((clause) => {
        const wrapped = doc.splitTextToSize(clause, contentWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 2.5 + 1;
    });

    // Company name at bottom
    y += 2;
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 100);
    doc.text(data.company.legalName, pageWidth / 2, y, { align: "center" });

    // Convert to Buffer
    const arrayBuffer = doc.output("arraybuffer");
    return Buffer.from(arrayBuffer);
}

// ─── CONVENIENCE WRAPPERS ───────────────────────────────────

export function generateQuotePDF(quote: any, company: CompanyInfo): Buffer {
    const docNumber = quote.number
        ? `PRE-${quote.year}-${String(quote.number).padStart(4, "0")}`
        : "BORRADOR";

    return generateDocumentPDF({
        docType: "quote",
        docNumber,
        status: quote.status,
        issueDate: quote.issueDate,
        validUntil: quote.validUntil,
        subtotalCents: quote.subtotalCents,
        taxCents: quote.taxCents,
        totalCents: quote.totalCents,
        lines: quote.lines,
        company,
        client: quote.client,
        publicNotes: quote.publicNotes,
    });
}

export function generateInvoicePDF(invoice: any, company: CompanyInfo): Buffer {
    const prefix = invoice.type === "CREDIT_NOTE" ? "REC" : "FAC";
    const docNumber = invoice.number
        ? `${prefix}-${invoice.year}-${String(invoice.number).padStart(4, "0")}`
        : "BORRADOR";

    return generateDocumentPDF({
        docType: "invoice",
        docNumber,
        status: invoice.status,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        subtotalCents: invoice.subtotalCents,
        taxCents: invoice.taxCents,
        totalCents: invoice.totalCents,
        lines: invoice.lines,
        company,
        client: invoice.client,
        publicNotes: invoice.publicNotes,
        invoiceType: invoice.type,
    });
}
