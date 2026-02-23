// ============================================================
// Automatio CRM — PDF Generation
// jsPDF-based document generator for quotes and invoices
// Style: Clean white background, branded header with logo
// ============================================================

import { jsPDF } from "jspdf";
import { LOGO_BASE64 } from "./logo-base64";

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
    docNumber: string;
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
    invoiceType?: string;
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

// ─── COLORS ─────────────────────────────────────────────────

const BRAND_NAVY: [number, number, number] = [27, 22, 96];
const TEXT_DARK: [number, number, number] = [40, 40, 50];
const TEXT_MEDIUM: [number, number, number] = [100, 100, 115];
const TEXT_LIGHT: [number, number, number] = [140, 140, 155];
const LINE_COLOR: [number, number, number] = [210, 210, 220];

const IBAN = "ES4120854503000330904034";

// ─── LAYOUT CONSTANTS ───────────────────────────────────────

const PAGE_W = 210;
const PAGE_H = 297;
const ML = 20;           // margin left
const MR = 20;           // margin right
const MT = 20;           // margin top
const MB = 25;           // margin bottom (footer space)
const CW = PAGE_W - ML - MR;   // content width
const RE = PAGE_W - MR;        // right edge
const PAGE_BOTTOM = PAGE_H - MB;
const LINE_H = 4;        // standard line height for 8.5-9pt text

// ─── TABLE COLUMN POSITIONS ─────────────────────────────────

const COL_CONCEPTO = ML;
const COL_PRECIO = ML + 90;
const COL_UNIDADES = ML + 112;
const COL_SUBTOTAL = ML + 132;
const COL_IVA = ML + 150;
const DESC_MAX_W = 82;  // max width for description text wrapping

// ─── PDF GENERATOR ──────────────────────────────────────────

export function generateDocumentPDF(data: DocumentData): Buffer {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    let y = MT;
    let pageNumber = 1;

    // ── HELPER: page break if needed ───────────────────
    function needsBreak(space: number): boolean {
        return y + space > PAGE_BOTTOM;
    }

    function pageBreak() {
        doc.addPage();
        pageNumber++;
        y = MT;
    }

    function ensureSpace(space: number) {
        if (needsBreak(space)) pageBreak();
    }

    // ── HELPER: draw wrapped text in a column ──────────
    // Returns array of lines and the height consumed
    function drawWrappedText(
        text: string,
        x: number,
        startY: number,
        maxW: number,
        fontSize: number,
        fontStyle: "normal" | "bold" = "normal",
        color: [number, number, number] = TEXT_MEDIUM,
        lineHeight: number = LINE_H
    ): { lines: string[]; height: number } {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", fontStyle);
        doc.setTextColor(...color);

        const lines = doc.splitTextToSize(text, maxW) as string[];
        for (let i = 0; i < lines.length; i++) {
            doc.text(lines[i], x, startY + i * lineHeight);
        }
        return { lines, height: lines.length * lineHeight };
    }

    // ══════════════════════════════════════════════════════
    // 1. HEADER: Title + Logo
    // ══════════════════════════════════════════════════════

    const docTitle =
        data.docType === "quote"
            ? "Presupuesto"
            : data.invoiceType === "CREDIT_NOTE"
                ? "Factura Rectificativa"
                : "Factura";

    doc.setTextColor(...TEXT_DARK);
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.text(docTitle, ML, y + 8);

    // Logo (top-right corner)
    try {
        const logoW = 35;
        const logoH = 35;
        doc.addImage(LOGO_BASE64, "PNG", RE - logoW, y - 5, logoW, logoH);
    } catch {
        // If logo fails, skip silently
    }

    y += 18;

    // ══════════════════════════════════════════════════════
    // 2. DOCUMENT METADATA (Number, Date, Due Date)
    // ══════════════════════════════════════════════════════

    const metaLabelX = ML + 2;
    const metaValueX = ML + 32;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT_MEDIUM);
    doc.text("Número #", metaLabelX, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT_DARK);
    doc.text(data.docNumber, metaValueX, y);
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT_MEDIUM);
    doc.text("Fecha", metaLabelX, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT_DARK);
    doc.text(fmtDate(data.issueDate), metaValueX, y);
    y += 5;

    if (data.dueDate) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...TEXT_MEDIUM);
        doc.text("Vencimiento", metaLabelX, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...TEXT_DARK);
        doc.text(fmtDate(data.dueDate), metaValueX, y);
        y += 5;
    } else if (data.validUntil) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...TEXT_MEDIUM);
        doc.text("Válido hasta", metaLabelX, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...TEXT_DARK);
        doc.text(fmtDate(data.validUntil), metaValueX, y);
        y += 5;
    }

    y += 8;

    // ══════════════════════════════════════════════════════
    // 3. COMPANY / SHIPPING / CLIENT — 3 Columns
    //    Each column wraps text within its max width
    // ══════════════════════════════════════════════════════

    const col1X = ML;
    const col2X = ML + CW * 0.36;
    const col3X = ML + CW * 0.66;
    const col1W = CW * 0.34;   // column 1 width
    const col2W = CW * 0.28;   // column 2 width
    const col3W = CW * 0.32;   // column 3 width

    const blockStartY = y;

    // — Pre-compute all column content as wrapped lines —

    // Column 1: Emisor (Company)
    const companyLines: string[] = [];
    companyLines.push(data.company.legalName);
    if (data.company.tradeName && data.company.tradeName !== data.company.legalName)
        companyLines.push(data.company.tradeName);
    if (data.company.addressLine1) companyLines.push(data.company.addressLine1);
    const companyLoc = [
        data.company.postalCode,
        data.company.city,
        data.company.province,
    ].filter(Boolean).join(", ");
    if (companyLoc) companyLines.push(companyLoc);
    const companyCountry = data.company.country === "ES" ? "España" : data.company.country;
    if (companyCountry) companyLines.push(companyCountry);
    if (data.company.taxId) companyLines.push(data.company.taxId);
    if (data.company.email) companyLines.push(data.company.email);

    // Column 2: Dirección de envío
    const shippingLines: string[] = [];
    if (data.client.billingAddressLine1) shippingLines.push(data.client.billingAddressLine1);
    const shipLoc = [
        data.client.billingPostalCode,
        data.client.billingCity,
        data.client.billingProvince,
    ].filter(Boolean).join(", ");
    if (shipLoc) shippingLines.push(shipLoc);
    shippingLines.push("España");

    // Column 3: Cliente
    const clientLines: string[] = [];
    clientLines.push(data.client.name);
    if (data.client.billingAddressLine1) clientLines.push(data.client.billingAddressLine1);
    const clientLoc = [
        data.client.billingPostalCode,
        data.client.billingCity,
        data.client.billingProvince,
    ].filter(Boolean).join(", ");
    if (clientLoc) clientLines.push(clientLoc);
    clientLines.push("España");
    if (data.client.taxId) clientLines.push(data.client.taxId);

    // — Draw columns with splitTextToSize for proper wrapping —

    function drawColumn(
        lines: string[],
        x: number,
        startY: number,
        maxW: number,
        title?: string,
    ): number {
        let cy = startY;

        if (title) {
            doc.setFontSize(8.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...TEXT_MEDIUM);
            doc.text(title, x, cy);
            cy += 5;
        }

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...TEXT_MEDIUM);

        for (let i = 0; i < lines.length; i++) {
            // First line of company is bold
            if (!title && i === 0) {
                doc.setFont("helvetica", "bold");
                doc.setTextColor(...TEXT_DARK);
            } else {
                doc.setFont("helvetica", "normal");
                doc.setTextColor(...TEXT_MEDIUM);
            }

            const wrapped = doc.splitTextToSize(lines[i], maxW) as string[];
            for (const wl of wrapped) {
                doc.text(wl, x, cy);
                cy += LINE_H;
            }
        }

        return cy;
    }

    const endCol1 = drawColumn(companyLines, col1X, blockStartY, col1W);
    const endCol2 = drawColumn(shippingLines, col2X, blockStartY, col2W, "Dirección de envío");
    const endCol3 = drawColumn(clientLines, col3X, blockStartY, col3W, "Cliente");

    y = Math.max(endCol1, endCol2, endCol3) + 8;

    // Separator line
    doc.setDrawColor(...LINE_COLOR);
    doc.line(ML, y, RE, y);
    y += 6;

    // ══════════════════════════════════════════════════════
    // 4. TABLE — Header + Rows with proper page breaks
    // ══════════════════════════════════════════════════════

    function drawTableHeader() {
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...TEXT_LIGHT);

        doc.text("CONCEPTO", COL_CONCEPTO, y);
        doc.text("PRECIO", COL_PRECIO, y, { align: "right" });
        doc.text("UNIDADES", COL_UNIDADES, y, { align: "right" });
        doc.text("SUBTOTAL", COL_SUBTOTAL, y, { align: "right" });
        doc.text("IVA", COL_IVA, y, { align: "right" });
        doc.text("TOTAL", RE, y, { align: "right" });

        y += 3;
        doc.setDrawColor(...LINE_COLOR);
        doc.line(ML, y, RE, y);
        y += 5;
    }

    drawTableHeader();

    // Draw each row
    doc.setFontSize(9);

    for (const line of data.lines) {
        // Pre-calculate row height from description wrapping
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const descLines = doc.splitTextToSize(line.description, DESC_MAX_W) as string[];
        const rowHeight = Math.max(descLines.length * 4.5, 7);

        // Page break if needed — redraw header on new page
        if (needsBreak(rowHeight + 2)) {
            pageBreak();
            drawTableHeader();
        }

        // Description
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...TEXT_DARK);
        doc.text(descLines, COL_CONCEPTO, y);

        // Numeric columns (aligned to first line of description)
        doc.text(`${fmtCents(line.unitPriceCents)}€`, COL_PRECIO, y, { align: "right" });
        doc.text(String(Number(line.quantity)), COL_UNIDADES, y, { align: "right" });
        doc.text(`${fmtCents(line.lineSubtotalCents)}€`, COL_SUBTOTAL, y, { align: "right" });
        doc.text(line.tax ? `${line.tax.rate}%` : "—", COL_IVA, y, { align: "right" });
        doc.text(`${fmtCents(line.lineTotalCents)}€`, RE, y, { align: "right" });

        y += rowHeight;
    }

    // Bottom line under table
    y += 2;
    doc.setDrawColor(...LINE_COLOR);
    doc.line(ML + CW * 0.5, y, RE, y);
    y += 8;

    // ══════════════════════════════════════════════════════
    // 5. TOTALS BLOCK (right-aligned)
    // ══════════════════════════════════════════════════════

    ensureSpace(35);

    const totalsLabelX = ML + CW * 0.5;

    // Base Imponible
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT_DARK);
    doc.text("BASE IMPONIBLE", totalsLabelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${fmtCents(data.subtotalCents)}€`, RE, y, { align: "right" });
    y += 7;

    // IVA
    const taxRate = data.lines.find((l) => l.tax?.rate)?.tax?.rate;
    const ivaLabel = taxRate ? `IVA ${taxRate}%` : "IVA";
    doc.setFont("helvetica", "bold");
    doc.text(ivaLabel, totalsLabelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${fmtCents(data.taxCents)}€`, RE, y, { align: "right" });
    y += 7;

    // TOTAL
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TOTAL", totalsLabelX, y);
    doc.text(`${fmtCents(data.totalCents)}€`, RE, y, { align: "right" });
    y += 14;

    // ══════════════════════════════════════════════════════
    // 6. PAYMENT CONDITIONS
    // ══════════════════════════════════════════════════════

    ensureSpace(25);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT_DARK);
    doc.text("Condiciones de pago", ML, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT_MEDIUM);

    const paymentText = `Pagar por transferencia bancaria al siguiente número de cuenta: ${IBAN}`;
    const payLines = doc.splitTextToSize(paymentText, CW) as string[];
    doc.text(payLines, ML, y);
    y += payLines.length * LINE_H + 4;

    // ══════════════════════════════════════════════════════
    // 7. PUBLIC NOTES (optional)
    // ══════════════════════════════════════════════════════

    if (data.publicNotes) {
        ensureSpace(20);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...TEXT_MEDIUM);
        doc.text("Observaciones:", ML, y);
        y += 4.5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...TEXT_DARK);
        const noteLines = doc.splitTextToSize(data.publicNotes, CW) as string[];
        doc.text(noteLines, ML, y);
        y += noteLines.length * 3.5 + 4;
    }

    // ══════════════════════════════════════════════════════
    // 8. DRAW FOOTER ON ALL PAGES
    // ══════════════════════════════════════════════════════

    const totalPages = doc.getNumberOfPages();

    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        const footerY = PAGE_H - 12;

        doc.setDrawColor(...LINE_COLOR);
        doc.line(ML, footerY - 4, RE, footerY - 4);

        doc.setFontSize(7);
        doc.setTextColor(...TEXT_LIGHT);
        doc.setFont("helvetica", "normal");

        // Left: doc info
        const footerParts: string[] = [data.docNumber];
        if (data.totalCents) footerParts.push(`${fmtCents(data.totalCents)}€`);
        if (data.dueDate) footerParts.push(`Vencimiento ${fmtDate(data.dueDate)}`);
        if (data.validUntil) footerParts.push(`Válido hasta ${fmtDate(data.validUntil)}`);
        doc.text(footerParts.join(" - "), ML, footerY);

        // Right: page X of Y
        doc.text(`Pág. ${p} de ${totalPages}`, RE, footerY, { align: "right" });
    }

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
    const docNumber = invoice.number || "BORRADOR";

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
