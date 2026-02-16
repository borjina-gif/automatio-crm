// ============================================================
// Treasury — Quarterly Report Logic
// Shared calculations for JSON/PDF/CSV/Excel exports
// ============================================================

import { prisma } from "@/lib/prisma";

// ─── TYPES ──────────────────────────────────────────────────

export interface QuarterRange {
    year: number;
    quarter: number; // 1-4
    from: Date;
    to: Date;
}

export interface InvoiceSummaryRow {
    id: string;
    number: string;
    counterpartyName: string;
    issueDate: string;
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
    status: string;
}

export interface TaxBreakdown {
    taxName: string;
    taxType: string;
    rate: number;
    baseCents: number;
    taxAmountCents: number;
}

export interface QuarterlyReport {
    year: number;
    quarter: number;
    label: string; // "Q1 2026"
    from: string;
    to: string;
    type: "sales" | "purchases" | "all";
    sales: {
        count: number;
        subtotalCents: number;
        taxCents: number;
        totalCents: number;
        averageTicketCents: number;
        topCounterparties: { name: string; totalCents: number }[];
        taxBreakdown: TaxBreakdown[];
        rows: InvoiceSummaryRow[];
    };
    purchases: {
        count: number;
        subtotalCents: number;
        taxCents: number;
        totalCents: number;
        averageTicketCents: number;
        topCounterparties: { name: string; totalCents: number }[];
        taxBreakdown: TaxBreakdown[];
        rows: InvoiceSummaryRow[];
    };
    ivaDifferenceCents: number; // repercutido - soportado
}

// ─── HELPERS ────────────────────────────────────────────────

export function getQuarterRange(year: number, quarter: number): QuarterRange {
    const startMonth = (quarter - 1) * 3; // 0-indexed
    const from = new Date(year, startMonth, 1);
    const to = new Date(year, startMonth + 3, 0, 23, 59, 59, 999); // last day of quarter
    return { year, quarter, from, to };
}

// ─── MAIN QUERY ─────────────────────────────────────────────

export async function buildQuarterlyReport(
    year: number,
    quarter: number,
    type: "sales" | "purchases" | "all"
): Promise<QuarterlyReport> {
    const range = getQuarterRange(year, quarter);

    const emptySide = {
        count: 0,
        subtotalCents: 0,
        taxCents: 0,
        totalCents: 0,
        averageTicketCents: 0,
        topCounterparties: [] as { name: string; totalCents: number }[],
        taxBreakdown: [] as TaxBreakdown[],
        rows: [] as InvoiceSummaryRow[],
    };

    let salesData = { ...emptySide };
    let purchasesData = { ...emptySide };

    // ── Sales (Invoices) ──────────────────────────────────
    if (type === "sales" || type === "all") {
        const invoices = await prisma.invoice.findMany({
            where: {
                deletedAt: null,
                status: { in: ["ISSUED", "PAID"] },
                issueDate: { gte: range.from, lte: range.to },
            },
            include: {
                client: { select: { name: true } },
                lines: { include: { tax: true } },
            },
            orderBy: { issueDate: "asc" },
        });

        const salesRows: InvoiceSummaryRow[] = invoices.map((inv) => ({
            id: inv.id,
            number: inv.number
                ? `${inv.year}-${String(inv.number).padStart(4, "0")}`
                : "BORRADOR",
            counterpartyName: inv.client?.name || "—",
            issueDate: inv.issueDate?.toISOString().split("T")[0] || "—",
            subtotalCents: inv.subtotalCents,
            taxCents: inv.taxCents,
            totalCents: inv.totalCents,
            status: inv.status,
        }));

        const totalSub = invoices.reduce((s, i) => s + i.subtotalCents, 0);
        const totalTax = invoices.reduce((s, i) => s + i.taxCents, 0);
        const totalAll = invoices.reduce((s, i) => s + i.totalCents, 0);

        // Top 5 clients
        const clientMap = new Map<string, number>();
        invoices.forEach((inv) => {
            const name = inv.client?.name || "—";
            clientMap.set(name, (clientMap.get(name) || 0) + inv.totalCents);
        });
        const topClients = Array.from(clientMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, totalCents]) => ({ name, totalCents }));

        // Tax breakdown
        const taxMap = new Map<string, TaxBreakdown>();
        invoices.forEach((inv) => {
            inv.lines.forEach((line) => {
                if (line.tax) {
                    const key = line.tax.id;
                    const existing = taxMap.get(key) || {
                        taxName: line.tax.name,
                        taxType: line.tax.type,
                        rate: Number(line.tax.rate),
                        baseCents: 0,
                        taxAmountCents: 0,
                    };
                    existing.baseCents += line.lineSubtotalCents;
                    existing.taxAmountCents += line.lineTaxCents;
                    taxMap.set(key, existing);
                }
            });
        });

        salesData = {
            count: invoices.length,
            subtotalCents: totalSub,
            taxCents: totalTax,
            totalCents: totalAll,
            averageTicketCents: invoices.length > 0 ? Math.round(totalAll / invoices.length) : 0,
            topCounterparties: topClients,
            taxBreakdown: Array.from(taxMap.values()),
            rows: salesRows,
        };
    }

    // ── Purchases (PurchaseInvoices) ──────────────────────
    if (type === "purchases" || type === "all") {
        const purchases = await prisma.purchaseInvoice.findMany({
            where: {
                deletedAt: null,
                status: { in: ["BOOKED", "PAID"] },
                issueDate: { gte: range.from, lte: range.to },
            },
            include: {
                provider: { select: { name: true } },
                lines: { include: { tax: true } },
            },
            orderBy: { issueDate: "asc" },
        });

        const purchaseRows: InvoiceSummaryRow[] = purchases.map((p) => ({
            id: p.id,
            number: p.number
                ? `FP-${p.year}-${String(p.number).padStart(4, "0")}`
                : "BORRADOR",
            counterpartyName: p.provider?.name || "—",
            issueDate: p.issueDate?.toISOString().split("T")[0] || "—",
            subtotalCents: p.subtotalCents,
            taxCents: p.taxCents,
            totalCents: p.totalCents,
            status: p.status,
        }));

        const totalSub = purchases.reduce((s, p) => s + p.subtotalCents, 0);
        const totalTax = purchases.reduce((s, p) => s + p.taxCents, 0);
        const totalAll = purchases.reduce((s, p) => s + p.totalCents, 0);

        const providerMap = new Map<string, number>();
        purchases.forEach((p) => {
            const name = p.provider?.name || "—";
            providerMap.set(name, (providerMap.get(name) || 0) + p.totalCents);
        });
        const topProviders = Array.from(providerMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, totalCents]) => ({ name, totalCents }));

        const taxMap = new Map<string, TaxBreakdown>();
        purchases.forEach((p) => {
            p.lines.forEach((line) => {
                if (line.tax) {
                    const key = line.tax.id;
                    const existing = taxMap.get(key) || {
                        taxName: line.tax.name,
                        taxType: line.tax.type,
                        rate: Number(line.tax.rate),
                        baseCents: 0,
                        taxAmountCents: 0,
                    };
                    existing.baseCents += line.lineSubtotalCents;
                    existing.taxAmountCents += line.lineTaxCents;
                    taxMap.set(key, existing);
                }
            });
        });

        purchasesData = {
            count: purchases.length,
            subtotalCents: totalSub,
            taxCents: totalTax,
            totalCents: totalAll,
            averageTicketCents: purchases.length > 0 ? Math.round(totalAll / purchases.length) : 0,
            topCounterparties: topProviders,
            taxBreakdown: Array.from(taxMap.values()),
            rows: purchaseRows,
        };
    }

    return {
        year,
        quarter,
        label: `Q${quarter} ${year}`,
        from: range.from.toISOString().split("T")[0],
        to: range.to.toISOString().split("T")[0],
        type,
        sales: salesData,
        purchases: purchasesData,
        ivaDifferenceCents: salesData.taxCents - purchasesData.taxCents,
    };
}

// ─── FORMAT HELPERS ─────────────────────────────────────────

export function fmtCents(cents: number): string {
    return (cents / 100).toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function reportToCSVRows(report: QuarterlyReport): string[][] {
    const headers = ["Tipo", "Número", "Contrapartida", "Fecha", "Base (€)", "IVA (€)", "Total (€)", "Estado"];
    const rows: string[][] = [headers];

    report.sales.rows.forEach((r) => {
        rows.push([
            "Venta",
            r.number,
            r.counterpartyName,
            r.issueDate,
            fmtCents(r.subtotalCents),
            fmtCents(r.taxCents),
            fmtCents(r.totalCents),
            r.status,
        ]);
    });

    report.purchases.rows.forEach((r) => {
        rows.push([
            "Compra",
            r.number,
            r.counterpartyName,
            r.issueDate,
            fmtCents(r.subtotalCents),
            fmtCents(r.taxCents),
            fmtCents(r.totalCents),
            r.status,
        ]);
    });

    return rows;
}
