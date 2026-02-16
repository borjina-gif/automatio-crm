import { buildQuarterlyReport, fmtCents, type QuarterlyReport } from "@/lib/treasury-report";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

// GET /api/treasury/reports/quarter/excel?year&quarter&type
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
        const buffer = await generateExcel(report);
        const filename = `informe-Q${quarter}-${year}-${type}.xlsx`;

        return new Response(new Uint8Array(buffer), {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (err) {
        console.error("Excel export error:", err);
        return NextResponse.json({ error: "Error al exportar Excel" }, { status: 500 });
    }
}

async function generateExcel(report: QuarterlyReport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Automatio CRM";
    workbook.created = new Date();

    // ── Summary sheet ───────────────────────────────────
    const summarySheet = workbook.addWorksheet("Resumen");

    // Title
    summarySheet.mergeCells("A1:D1");
    const titleCell = summarySheet.getCell("A1");
    titleCell.value = `Informe Trimestral ${report.label}`;
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: "center" };

    summarySheet.addRow([]);

    // Summary table
    const headerStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, color: { argb: "FFFFFFFF" } },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B1660" } },
        alignment: { horizontal: "center" },
    };

    summarySheet.addRow(["", "Ventas", "Compras", "Diferencia"]);
    summarySheet.getRow(3).eachCell((cell) => {
        Object.assign(cell, { style: headerStyle });
    });

    summarySheet.addRow(["Nº facturas", report.sales.count, report.purchases.count, report.sales.count - report.purchases.count]);
    summarySheet.addRow(["Base imponible", report.sales.subtotalCents / 100, report.purchases.subtotalCents / 100, (report.sales.subtotalCents - report.purchases.subtotalCents) / 100]);
    summarySheet.addRow(["IVA", report.sales.taxCents / 100, report.purchases.taxCents / 100, report.ivaDifferenceCents / 100]);
    summarySheet.addRow(["Total", report.sales.totalCents / 100, report.purchases.totalCents / 100, (report.sales.totalCents - report.purchases.totalCents) / 100]);
    summarySheet.addRow(["Ticket medio", report.sales.averageTicketCents / 100, report.purchases.averageTicketCents / 100, ""]);

    // Format currency columns
    for (let row = 4; row <= 8; row++) {
        for (let col = 2; col <= 4; col++) {
            const cell = summarySheet.getCell(row, col);
            if (typeof cell.value === "number") {
                cell.numFmt = '#,##0.00 €';
            }
        }
    }

    // Column widths
    summarySheet.getColumn(1).width = 20;
    summarySheet.getColumn(2).width = 18;
    summarySheet.getColumn(3).width = 18;
    summarySheet.getColumn(4).width = 18;

    // ── Sales detail sheet ──────────────────────────────
    if (report.sales.rows.length > 0) {
        const salesSheet = workbook.addWorksheet("Ventas");
        salesSheet.addRow(["Número", "Cliente", "Fecha", "Base (€)", "IVA (€)", "Total (€)", "Estado"]);
        salesSheet.getRow(1).eachCell((cell) => {
            Object.assign(cell, { style: headerStyle });
        });
        report.sales.rows.forEach((r) => {
            salesSheet.addRow([r.number, r.counterpartyName, r.issueDate, r.subtotalCents / 100, r.taxCents / 100, r.totalCents / 100, r.status]);
        });
        // Totals row
        salesSheet.addRow(["", "TOTAL", "", report.sales.subtotalCents / 100, report.sales.taxCents / 100, report.sales.totalCents / 100, ""]);
        const lastRow = salesSheet.lastRow;
        lastRow?.eachCell((cell) => { cell.font = { bold: true }; });

        [1, 2, 3, 4, 5, 6, 7].forEach((col, i) => {
            salesSheet.getColumn(col).width = [14, 30, 12, 14, 14, 14, 12][i];
        });

        // Currency format
        for (let row = 2; row <= salesSheet.rowCount; row++) {
            for (const col of [4, 5, 6]) {
                const cell = salesSheet.getCell(row, col);
                if (typeof cell.value === "number") cell.numFmt = '#,##0.00 €';
            }
        }
    }

    // ── Purchases detail sheet ──────────────────────────
    if (report.purchases.rows.length > 0) {
        const purchSheet = workbook.addWorksheet("Compras");
        purchSheet.addRow(["Número", "Proveedor", "Fecha", "Base (€)", "IVA (€)", "Total (€)", "Estado"]);
        purchSheet.getRow(1).eachCell((cell) => {
            Object.assign(cell, { style: headerStyle });
        });
        report.purchases.rows.forEach((r) => {
            purchSheet.addRow([r.number, r.counterpartyName, r.issueDate, r.subtotalCents / 100, r.taxCents / 100, r.totalCents / 100, r.status]);
        });
        purchSheet.addRow(["", "TOTAL", "", report.purchases.subtotalCents / 100, report.purchases.taxCents / 100, report.purchases.totalCents / 100, ""]);
        const lastRow = purchSheet.lastRow;
        lastRow?.eachCell((cell) => { cell.font = { bold: true }; });

        [1, 2, 3, 4, 5, 6, 7].forEach((col, i) => {
            purchSheet.getColumn(col).width = [14, 30, 12, 14, 14, 14, 12][i];
        });

        for (let row = 2; row <= purchSheet.rowCount; row++) {
            for (const col of [4, 5, 6]) {
                const cell = purchSheet.getCell(row, col);
                if (typeof cell.value === "number") cell.numFmt = '#,##0.00 €';
            }
        }
    }

    // ── Tax breakdown sheet ─────────────────────────────
    const allTaxes = [
        ...report.sales.taxBreakdown.map((t) => ({ ...t, side: "Ventas (repercutido)" })),
        ...report.purchases.taxBreakdown.map((t) => ({ ...t, side: "Compras (soportado)" })),
    ];
    if (allTaxes.length > 0) {
        const taxSheet = workbook.addWorksheet("Desglose IVA");
        taxSheet.addRow(["Concepto", "Impuesto", "Tipo", "Tasa (%)", "Base (€)", "Cuota (€)"]);
        taxSheet.getRow(1).eachCell((cell) => {
            Object.assign(cell, { style: headerStyle });
        });
        allTaxes.forEach((t) => {
            taxSheet.addRow([t.side, t.taxName, t.taxType, t.rate, t.baseCents / 100, t.taxAmountCents / 100]);
        });
        [1, 2, 3, 4, 5, 6].forEach((col, i) => {
            taxSheet.getColumn(col).width = [28, 20, 12, 10, 16, 16][i];
        });
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
}
