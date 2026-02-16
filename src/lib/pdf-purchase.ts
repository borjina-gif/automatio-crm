// ============================================================
// Automatio CRM — Purchase Invoice PDF Generation
// Generates simple PDF for purchase invoices
// ============================================================

import { jsPDF } from "jspdf";
import { LOGO_BASE64 } from "./logo-base64";

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

// ─── PDF GENERATOR ──────────────────────────────────────────

export function generatePurchaseInvoicePDF(purchase: any, company: any): Buffer {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = 210;
    const pageHeight = 297;
    const marginLeft = 20;
    const marginRight = 20;
    const contentWidth = pageWidth - marginLeft - marginRight;
    const rightEdge = pageWidth - marginRight;
    let y = 20;

    // ── 1. HEADER ──────────────────────────────────────
    doc.setTextColor(...TEXT_DARK);
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.text("Factura de Proveedor", marginLeft, y + 8);

    try {
        doc.addImage(LOGO_BASE64, "PNG", rightEdge - 35, y - 5, 35, 35);
    } catch { }

    y += 18;

    // ── 2. METADATA ────────────────────────────────────
    doc.setFontSize(9);
    const metaLabelX = marginLeft + 2;
    const metaValueX = marginLeft + 40;

    const docNumber = purchase.number
        ? `FP-${purchase.year}-${String(purchase.number).padStart(4, "0")}`
        : "BORRADOR";

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT_MEDIUM);
    doc.text("Número #", metaLabelX, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT_DARK);
    doc.text(docNumber, metaValueX, y);
    y += 5;

    if (purchase.providerInvoiceNumber) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...TEXT_MEDIUM);
        doc.text("Nº Proveedor", metaLabelX, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...TEXT_DARK);
        doc.text(purchase.providerInvoiceNumber, metaValueX, y);
        y += 5;
    }

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT_MEDIUM);
    doc.text("Fecha", metaLabelX, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT_DARK);
    doc.text(fmtDate(purchase.issueDate), metaValueX, y);
    y += 5;

    if (purchase.dueDate) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...TEXT_MEDIUM);
        doc.text("Vencimiento", metaLabelX, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...TEXT_DARK);
        doc.text(fmtDate(purchase.dueDate), metaValueX, y);
        y += 5;
    }

    y += 8;

    // ── 3. PROVIDER & COMPANY INFO ─────────────────────
    const col1X = marginLeft;
    const col2X = marginLeft + contentWidth * 0.55;
    const blockStartY = y;

    // Provider (left)
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT_MEDIUM);
    doc.text("Proveedor", col1X, y);
    y += 4.5;
    doc.setFont("helvetica", "normal");

    const providerDetails = [
        purchase.provider?.name,
        purchase.provider?.taxId,
        purchase.provider?.addressLine1,
        [purchase.provider?.postalCode, purchase.provider?.city, purchase.provider?.province]
            .filter(Boolean).join(", ") || null,
        purchase.provider?.email,
    ].filter(Boolean) as string[];

    providerDetails.forEach((line) => {
        doc.text(line, col1X, y);
        y += 4;
    });

    // Company (right)
    let yCol2 = blockStartY;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT_MEDIUM);
    doc.text("Nuestra empresa", col2X, yCol2);
    yCol2 += 4.5;
    doc.setFont("helvetica", "normal");

    const companyDetails = [
        company.legalName,
        company.taxId,
        company.addressLine1,
        [company.postalCode, company.city, company.province]
            .filter(Boolean).join(", ") || null,
        company.email,
    ].filter(Boolean) as string[];

    companyDetails.forEach((line) => {
        doc.text(line, col2X, yCol2);
        yCol2 += 4;
    });

    y = Math.max(y, yCol2) + 8;

    // Separator
    doc.setDrawColor(...LINE_COLOR);
    doc.line(marginLeft, y, rightEdge, y);
    y += 6;

    // ── 4. LINES TABLE ─────────────────────────────────
    const colConcepto = marginLeft;
    const colPrecio = marginLeft + 85;
    const colUnidades = marginLeft + 107;
    const colSubtotal = marginLeft + 127;
    const colIva = marginLeft + 147;

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

    // Rows
    doc.setFontSize(9);
    (purchase.lines || []).forEach((line: any) => {
        if (y + 10 > pageHeight - 20) {
            doc.addPage();
            y = 20;
        }

        doc.setFont("helvetica", "normal");
        doc.setTextColor(...TEXT_DARK);

        const descLines = doc.splitTextToSize(line.description, 78);
        doc.text(descLines, colConcepto, y);
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

    // ── 5. TOTALS ──────────────────────────────────────
    const totalsLabelX = marginLeft + contentWidth * 0.5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT_DARK);
    doc.text("BASE IMPONIBLE", totalsLabelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${fmtCents(purchase.subtotalCents)}€`, rightEdge, y, { align: "right" });
    y += 7;

    const taxRate = purchase.lines?.find((l: any) => l.tax?.rate)?.tax?.rate;
    const ivaLabel = taxRate ? `IVA ${taxRate}%` : "IVA";
    doc.setFont("helvetica", "bold");
    doc.text(ivaLabel, totalsLabelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${fmtCents(purchase.taxCents)}€`, rightEdge, y, { align: "right" });
    y += 7;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TOTAL", totalsLabelX, y);
    doc.text(`${fmtCents(purchase.totalCents)}€`, rightEdge, y, { align: "right" });

    // ── 6. FOOTER ──────────────────────────────────────
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        const footerY = pageHeight - 12;
        doc.setDrawColor(...LINE_COLOR);
        doc.line(marginLeft, footerY - 4, rightEdge, footerY - 4);
        doc.setFontSize(7);
        doc.setTextColor(...TEXT_LIGHT);
        doc.setFont("helvetica", "normal");
        doc.text(docNumber, marginLeft, footerY);
        doc.text(`Pág. ${p} de ${totalPages}`, rightEdge, footerY, { align: "right" });
    }

    const arrayBuffer = doc.output("arraybuffer");
    return Buffer.from(arrayBuffer);
}
