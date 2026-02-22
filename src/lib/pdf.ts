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

const BRAND_NAVY: [number, number, number] = [27, 22, 96];   // #1b1660
const TEXT_DARK: [number, number, number] = [40, 40, 50];
const TEXT_MEDIUM: [number, number, number] = [100, 100, 115];
const TEXT_LIGHT: [number, number, number] = [140, 140, 155];
const LINE_COLOR: [number, number, number] = [210, 210, 220];

const IBAN = "ES4120854503000330904034";

// ─── PDF GENERATOR ──────────────────────────────────────────

export function generateDocumentPDF(data: DocumentData): Buffer {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = 210;
    const pageHeight = 297;
    const marginLeft = 20;
    const marginRight = 20;
    const contentWidth = pageWidth - marginLeft - marginRight;
    const rightEdge = pageWidth - marginRight;
    let y = 20;
    let pageNumber = 1;

    // ── HELPER: draw footer on current page ─────────────
    function drawPageFooter() {
        const footerY = pageHeight - 12;
        doc.setDrawColor(...LINE_COLOR);
        doc.line(marginLeft, footerY - 4, rightEdge, footerY - 4);

        doc.setFontSize(7);
        doc.setTextColor(...TEXT_LIGHT);
        doc.setFont("helvetica", "normal");

        // Left: doc number + total + due date
        const footerParts: string[] = [data.docNumber];
        if (data.totalCents) footerParts.push(`${fmtCents(data.totalCents)}€`);
        if (data.dueDate) footerParts.push(`Vencimiento ${fmtDate(data.dueDate)}`);
        if (data.validUntil) footerParts.push(`Válido hasta ${fmtDate(data.validUntil)}`);
        doc.text(footerParts.join(" - "), marginLeft, footerY);

        // Right: page number
        doc.text(`Pág. ${pageNumber} de {PAGES}`, rightEdge, footerY, { align: "right" });
    }

    // ── HELPER: check page break ────────────────────────
    function checkPageBreak(neededSpace: number) {
        if (y + neededSpace > pageHeight - 20) {
            drawPageFooter();
            doc.addPage();
            pageNumber++;
            y = 20;
        }
    }

    // ══════════════════════════════════════════════════════
    // 1. HEADER: Title + Logo
    // ══════════════════════════════════════════════════════

    // Document type title (left)
    const docTitle =
        data.docType === "quote"
            ? "Presupuesto"
            : data.invoiceType === "CREDIT_NOTE"
                ? "Factura Rectificativa"
                : "Factura";

    doc.setTextColor(...TEXT_DARK);
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.text(docTitle, marginLeft, y + 8);

    // Logo (top-right corner)
    try {
        const logoW = 35;
        const logoH = 35;
        doc.addImage(LOGO_BASE64, "PNG", rightEdge - logoW, y - 5, logoW, logoH);
    } catch {
        // If logo fails, skip silently
    }

    y += 18;

    // ══════════════════════════════════════════════════════
    // 2. DOCUMENT METADATA (Number, Date, Due Date)
    // ══════════════════════════════════════════════════════

    doc.setFontSize(9);
    const metaLabelX = marginLeft + 2;
    const metaValueX = marginLeft + 32;

    // Number
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT_MEDIUM);
    doc.text("Número #", metaLabelX, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT_DARK);
    doc.text(data.docNumber, metaValueX, y);
    y += 5;

    // Issue date
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT_MEDIUM);
    doc.text("Fecha", metaLabelX, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT_DARK);
    doc.text(fmtDate(data.issueDate), metaValueX, y);
    y += 5;

    // Due date / Valid until
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
    // ══════════════════════════════════════════════════════

    const col1X = marginLeft;
    const col2X = marginLeft + contentWidth * 0.38;
    const col3X = marginLeft + contentWidth * 0.68;

    const blockStartY = y;

    // ── Column 1: Emisor (Company) ──
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT_DARK);
    doc.text(data.company.legalName, col1X, y);
    y += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT_MEDIUM);

    const companyDetails = [
        data.company.tradeName && data.company.tradeName !== data.company.legalName
            ? data.company.tradeName
            : null,
        data.company.addressLine1,
        [data.company.postalCode ? `${data.company.postalCode} (${data.company.city})` : data.company.city, data.company.province, data.company.country === "ES" ? "España" : data.company.country]
            .filter(Boolean)
            .join(", ") || null,
        data.company.taxId,
        data.company.phone,
        data.company.email,
    ].filter(Boolean) as string[];

    companyDetails.forEach((line) => {
        doc.text(line, col1X, y);
        y += 4;
    });

    // ── Column 2: Dirección de envío ──
    let yCol2 = blockStartY;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT_MEDIUM);
    doc.text("Dirección de envío", col2X, yCol2);
    yCol2 += 4.5;

    doc.setFont("helvetica", "normal");
    const shippingAddress = [
        data.client.billingAddressLine1,
        [data.client.billingPostalCode, data.client.billingCity, data.client.billingProvince]
            .filter(Boolean)
            .join(", ") || null,
        "España",
    ].filter(Boolean) as string[];

    shippingAddress.forEach((line) => {
        doc.text(line, col2X, yCol2);
        yCol2 += 4;
    });

    // ── Column 3: Cliente ──
    let yCol3 = blockStartY;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT_MEDIUM);
    doc.text("Cliente", col3X, yCol3);
    yCol3 += 4.5;

    doc.setFont("helvetica", "normal");
    const clientDetails = [
        data.client.name,
        data.client.billingAddressLine1,
        [data.client.billingPostalCode, data.client.billingCity, data.client.billingProvince]
            .filter(Boolean)
            .join(", ") || null,
        "España",
        data.client.taxId,
    ].filter(Boolean) as string[];

    clientDetails.forEach((line) => {
        doc.text(line, col3X, yCol3);
        yCol3 += 4;
    });

    y = Math.max(y, yCol2, yCol3) + 8;

    // ── Separator line ──
    doc.setDrawColor(...LINE_COLOR);
    doc.line(marginLeft, y, rightEdge, y);
    y += 6;

    // ══════════════════════════════════════════════════════
    // 4. TABLE HEADER
    // ══════════════════════════════════════════════════════

    const colConcepto = marginLeft;
    const colPrecio = marginLeft + 85;
    const colUnidades = marginLeft + 107;
    const colSubtotal = marginLeft + 127;
    const colIva = marginLeft + 147;
    const colTotal = marginLeft + 160;

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT_LIGHT);

    doc.text("CONCEPTO", colConcepto, y);
    doc.text("PRECIO", colPrecio, y, { align: "right" });
    doc.text("UNIDADES", colUnidades, y, { align: "right" });
    doc.text("SUBTOTAL", colSubtotal, y, { align: "right" });
    doc.text("IVA", colIva, y, { align: "right" });
    doc.text("TOTAL", rightEdge, y, { align: "right" });

    y += 3;
    doc.setDrawColor(...LINE_COLOR);
    doc.line(marginLeft, y, rightEdge, y);
    y += 6;

    // ══════════════════════════════════════════════════════
    // 5. TABLE ROWS
    // ══════════════════════════════════════════════════════

    doc.setFontSize(9);

    data.lines.forEach((line) => {
        checkPageBreak(10);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(...TEXT_DARK);

        // Description — wrap if too long
        const descMaxW = 78;
        const descLines = doc.splitTextToSize(line.description, descMaxW);
        doc.text(descLines, colConcepto, y);

        // Numeric columns
        doc.text(`${fmtCents(line.unitPriceCents)}€`, colPrecio, y, { align: "right" });
        doc.text(String(Number(line.quantity)), colUnidades, y, { align: "right" });
        doc.text(`${fmtCents(line.lineSubtotalCents)}€`, colSubtotal, y, { align: "right" });
        doc.text(line.tax ? `${line.tax.rate}%` : "—", colIva, y, { align: "right" });
        doc.text(`${fmtCents(line.lineTotalCents)}€`, rightEdge, y, { align: "right" });

        y += Math.max(descLines.length * 4.5, 7);
    });

    y += 2;
    doc.setDrawColor(...LINE_COLOR);
    doc.line(marginLeft + contentWidth * 0.5, y, rightEdge, y);
    y += 8;

    // ══════════════════════════════════════════════════════
    // 6. TOTALS BLOCK (right-aligned)
    // ══════════════════════════════════════════════════════

    checkPageBreak(35);

    const totalsLabelX = marginLeft + contentWidth * 0.5;

    // Base Imponible
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT_DARK);
    doc.text("BASE IMPONIBLE", totalsLabelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${fmtCents(data.subtotalCents)}€`, rightEdge, y, { align: "right" });
    y += 7;

    // IVA — detect rate from lines
    const taxRate = data.lines.find((l) => l.tax?.rate)?.tax?.rate;
    const ivaLabel = taxRate ? `IVA ${taxRate}%` : "IVA";
    doc.setFont("helvetica", "bold");
    doc.text(ivaLabel, totalsLabelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${fmtCents(data.taxCents)}€`, rightEdge, y, { align: "right" });
    y += 7;

    // TOTAL
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TOTAL", totalsLabelX, y);
    doc.text(`${fmtCents(data.totalCents)}€`, rightEdge, y, { align: "right" });

    y += 14;

    // ══════════════════════════════════════════════════════
    // 7. PAYMENT CONDITIONS
    // ══════════════════════════════════════════════════════

    checkPageBreak(25);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT_DARK);
    doc.text("Condiciones de pago", marginLeft, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT_MEDIUM);
    doc.text(
        `Pagar por transferencia bancaria al siguiente número de cuenta: ${IBAN}`,
        marginLeft,
        y
    );
    y += 8;

    // ══════════════════════════════════════════════════════
    // 8. PUBLIC NOTES (optional)
    // ══════════════════════════════════════════════════════

    if (data.publicNotes) {
        checkPageBreak(20);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...TEXT_MEDIUM);
        doc.text("Observaciones:", marginLeft, y);
        y += 4.5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...TEXT_DARK);
        const noteLines = doc.splitTextToSize(data.publicNotes, contentWidth);
        doc.text(noteLines, marginLeft, y);
        y += noteLines.length * 3.5 + 4;
    }

    // ══════════════════════════════════════════════════════
    // 9. DRAW FOOTER ON ALL PAGES
    // ══════════════════════════════════════════════════════

    const totalPages = doc.getNumberOfPages();

    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        const footerY = pageHeight - 12;

        doc.setDrawColor(...LINE_COLOR);
        doc.line(marginLeft, footerY - 4, rightEdge, footerY - 4);

        doc.setFontSize(7);
        doc.setTextColor(...TEXT_LIGHT);
        doc.setFont("helvetica", "normal");

        // Left: doc info
        const footerParts: string[] = [data.docNumber];
        if (data.totalCents) footerParts.push(`${fmtCents(data.totalCents)}€`);
        if (data.dueDate) footerParts.push(`Vencimiento ${fmtDate(data.dueDate)}`);
        if (data.validUntil) footerParts.push(`Válido hasta ${fmtDate(data.validUntil)}`);
        doc.text(footerParts.join(" - "), marginLeft, footerY);

        // Right: page X of Y
        doc.text(`Pág. ${p} de ${totalPages}`, rightEdge, footerY, { align: "right" });
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
