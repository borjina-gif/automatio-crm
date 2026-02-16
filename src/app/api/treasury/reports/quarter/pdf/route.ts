import { buildQuarterlyReport, fmtCents, type QuarterlyReport } from "@/lib/treasury-report";
import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { LOGO_BASE64 } from "@/lib/logo-base64";

// GET /api/treasury/reports/quarter/pdf?year&quarter&type
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
        const quarter = parseInt(searchParams.get("quarter") || "1");
        const type = (searchParams.get("type") || "all") as "sales" | "purchases" | "all";

        if (isNaN(year) || quarter < 1 || quarter > 4) {
            return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
        }

        const report = await buildQuarterlyReport(year, quarter, type);
        const pdfBuffer = generateReportPDF(report);

        const filename = `informe-Q${quarter}-${year}-${type}.pdf`;

        return new Response(new Uint8Array(pdfBuffer), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (err) {
        console.error("PDF export error:", err);
        return NextResponse.json({ error: "Error al exportar PDF" }, { status: 500 });
    }
}

function generateReportPDF(report: QuarterlyReport): Buffer {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = 210;
    const pageHeight = 297;
    const marginLeft = 20;
    const marginRight = 20;
    const rightEdge = pageWidth - marginRight;
    const contentWidth = pageWidth - marginLeft - marginRight;
    let y = 20;

    const NAVY: [number, number, number] = [27, 22, 96];
    const DARK: [number, number, number] = [40, 40, 50];
    const MEDIUM: [number, number, number] = [100, 100, 115];
    const LIGHT: [number, number, number] = [140, 140, 155];
    const LINE: [number, number, number] = [210, 210, 220];
    const GREEN: [number, number, number] = [34, 139, 34];
    const RED: [number, number, number] = [180, 40, 40];

    // ── Header ──
    try {
        doc.addImage(LOGO_BASE64, "PNG", rightEdge - 30, y - 5, 30, 30);
    } catch { }
    doc.setTextColor(...NAVY);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(`Informe Trimestral`, marginLeft, y + 6);
    doc.setFontSize(14);
    doc.text(report.label, marginLeft, y + 14);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MEDIUM);
    doc.text(`Período: ${report.from} — ${report.to}`, marginLeft, y + 20);

    y += 30;
    doc.setDrawColor(...LINE);
    doc.line(marginLeft, y, rightEdge, y);
    y += 8;

    // ── Executive Summary ──
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text("Resumen Ejecutivo", marginLeft, y);
    y += 8;

    // Summary table
    const colLabels = marginLeft;
    const colSales = marginLeft + 55;
    const colPurch = marginLeft + 100;
    const colDiff = marginLeft + 145;

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...MEDIUM);
    doc.text("", colLabels, y);
    doc.text("VENTAS", colSales, y, { align: "right" });
    doc.text("COMPRAS", colPurch, y, { align: "right" });
    doc.text("DIFERENCIA", colDiff, y, { align: "right" });
    y += 3;
    doc.line(marginLeft, y, colDiff + 10, y);
    y += 6;

    const summaryRows = [
        ["Nº Facturas", String(report.sales.count), String(report.purchases.count), String(report.sales.count - report.purchases.count)],
        ["Base imponible", `${fmtCents(report.sales.subtotalCents)} €`, `${fmtCents(report.purchases.subtotalCents)} €`, `${fmtCents(report.sales.subtotalCents - report.purchases.subtotalCents)} €`],
        ["IVA", `${fmtCents(report.sales.taxCents)} €`, `${fmtCents(report.purchases.taxCents)} €`, `${fmtCents(report.ivaDifferenceCents)} €`],
        ["Total", `${fmtCents(report.sales.totalCents)} €`, `${fmtCents(report.purchases.totalCents)} €`, `${fmtCents(report.sales.totalCents - report.purchases.totalCents)} €`],
        ["Ticket medio", `${fmtCents(report.sales.averageTicketCents)} €`, `${fmtCents(report.purchases.averageTicketCents)} €`, ""],
    ];

    doc.setFontSize(9);
    summaryRows.forEach((row, idx) => {
        const isTotal = idx === 3;
        doc.setFont("helvetica", isTotal ? "bold" : "normal");
        doc.setTextColor(...(isTotal ? NAVY : DARK));
        doc.text(row[0], colLabels, y);
        doc.text(row[1], colSales, y, { align: "right" });
        doc.text(row[2], colPurch, y, { align: "right" });
        if (row[3]) {
            const diff = idx >= 1 ? parseFloat(row[3].replace(/[^\d,-]/g, "").replace(",", ".")) : 0;
            if (idx >= 1) doc.setTextColor(...(diff >= 0 ? GREEN : RED));
            doc.text(row[3], colDiff, y, { align: "right" });
        }
        y += 6;
    });

    y += 4;
    doc.setDrawColor(...LINE);
    doc.line(marginLeft, y, rightEdge, y);
    y += 8;

    // ── IVA highlight ──
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const ivaColor = report.ivaDifferenceCents >= 0 ? GREEN : RED;
    doc.setTextColor(...NAVY);
    doc.text("Liquidación IVA trimestral:", marginLeft, y);
    doc.setTextColor(...ivaColor);
    doc.text(`${fmtCents(report.ivaDifferenceCents)} €`, marginLeft + 70, y);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MEDIUM);
    doc.text(report.ivaDifferenceCents >= 0 ? "(a ingresar)" : "(a compensar)", marginLeft + 70 + doc.getTextWidth(`${fmtCents(report.ivaDifferenceCents)} €`) + 3, y);
    y += 10;

    // ── Top counterparties ──
    function drawTopList(title: string, items: { name: string; totalCents: number }[], startY: number): number {
        if (items.length === 0) return startY;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...NAVY);
        doc.text(title, marginLeft, startY);
        startY += 6;

        doc.setFontSize(8.5);
        items.forEach((item, i) => {
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...DARK);
            doc.text(`${i + 1}. ${item.name}`, marginLeft + 3, startY);
            doc.text(`${fmtCents(item.totalCents)} €`, colPurch, startY, { align: "right" });
            startY += 5;
        });
        return startY + 3;
    }

    if (report.sales.topCounterparties.length > 0) {
        y = drawTopList("Top 5 Clientes", report.sales.topCounterparties, y);
    }
    if (report.purchases.topCounterparties.length > 0) {
        y = drawTopList("Top 5 Proveedores", report.purchases.topCounterparties, y);
    }

    // ── Detail tables (new page if needed) ──
    function drawDetailTable(title: string, rows: typeof report.sales.rows, startY: number): number {
        if (rows.length === 0) return startY;

        if (startY + 30 > pageHeight - 20) {
            doc.addPage();
            startY = 20;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...NAVY);
        doc.text(title, marginLeft, startY);
        startY += 7;

        // Table headers
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...LIGHT);
        doc.text("NÚMERO", marginLeft, startY);
        doc.text("CONTRAPARTIDA", marginLeft + 28, startY);
        doc.text("FECHA", marginLeft + 85, startY);
        doc.text("BASE", marginLeft + 110, startY, { align: "right" });
        doc.text("IVA", marginLeft + 130, startY, { align: "right" });
        doc.text("TOTAL", rightEdge, startY, { align: "right" });
        startY += 3;
        doc.setDrawColor(...LINE);
        doc.line(marginLeft, startY, rightEdge, startY);
        startY += 5;

        doc.setFontSize(8.5);
        rows.forEach((row) => {
            if (startY + 6 > pageHeight - 15) {
                doc.addPage();
                startY = 20;
            }
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...DARK);
            doc.text(row.number, marginLeft, startY);
            doc.text(row.counterpartyName.substring(0, 30), marginLeft + 28, startY);
            doc.text(row.issueDate, marginLeft + 85, startY);
            doc.text(`${fmtCents(row.subtotalCents)}`, marginLeft + 110, startY, { align: "right" });
            doc.text(`${fmtCents(row.taxCents)}`, marginLeft + 130, startY, { align: "right" });
            doc.text(`${fmtCents(row.totalCents)}`, rightEdge, startY, { align: "right" });
            startY += 5;
        });

        return startY + 5;
    }

    if (report.sales.rows.length > 0) {
        y = drawDetailTable("Detalle Ventas", report.sales.rows, y);
    }
    if (report.purchases.rows.length > 0) {
        y = drawDetailTable("Detalle Compras", report.purchases.rows, y);
    }

    // ── Footer ──
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        const footerY = pageHeight - 10;
        doc.setDrawColor(...LINE);
        doc.line(marginLeft, footerY - 4, rightEdge, footerY - 4);
        doc.setFontSize(7);
        doc.setTextColor(...LIGHT);
        doc.setFont("helvetica", "normal");
        doc.text(`Informe ${report.label} · Automatio CRM`, marginLeft, footerY);
        doc.text(`Pág. ${p} de ${totalPages}`, rightEdge, footerY, { align: "right" });
    }

    return Buffer.from(doc.output("arraybuffer"));
}
