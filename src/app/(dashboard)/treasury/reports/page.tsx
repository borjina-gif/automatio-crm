"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface TaxBreakdown {
    taxName: string;
    taxType: string;
    rate: number;
    baseCents: number;
    taxAmountCents: number;
}

interface InvoiceRow {
    id: string;
    number: string;
    counterpartyName: string;
    issueDate: string;
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
    status: string;
}

interface ReportSide {
    count: number;
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
    averageTicketCents: number;
    topCounterparties: { name: string; totalCents: number }[];
    taxBreakdown: TaxBreakdown[];
    rows: InvoiceRow[];
}

interface QuarterlyReport {
    year: number;
    quarter: number;
    label: string;
    from: string;
    to: string;
    type: string;
    sales: ReportSide;
    purchases: ReportSide;
    ivaDifferenceCents: number;
}

function fmtCents(c: number) {
    return (c / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

const QUARTERS = [
    { value: 1, label: "Q1 (Ene–Mar)" },
    { value: 2, label: "Q2 (Abr–Jun)" },
    { value: 3, label: "Q3 (Jul–Sep)" },
    { value: 4, label: "Q4 (Oct–Dic)" },
];

const TYPES = [
    { value: "all", label: "Todo" },
    { value: "sales", label: "Ventas" },
    { value: "purchases", label: "Compras" },
];

export default function TreasuryReportsPage() {
    const currentYear = new Date().getFullYear();
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

    const [year, setYear] = useState(currentYear);
    const [quarter, setQuarter] = useState(currentQuarter);
    const [type, setType] = useState<"all" | "sales" | "purchases">("all");
    const [report, setReport] = useState<QuarterlyReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"summary" | "sales" | "purchases">("summary");

    useEffect(() => {
        fetchReport();
    }, [year, quarter, type]);

    async function fetchReport() {
        setLoading(true);
        try {
            const res = await fetch(`/api/treasury/reports/quarter?year=${year}&quarter=${quarter}&type=${type}`);
            const data = await res.json();
            setReport(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    function downloadFile(format: "csv" | "excel" | "pdf") {
        const url = `/api/treasury/reports/quarter/${format}?year=${year}&quarter=${quarter}&type=${type}`;
        window.open(url, "_blank");
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Informes Trimestrales</h1>
                    <p className="page-header-sub">Análisis de ventas, compras e impuestos</p>
                </div>
                <Link href="/treasury" className="btn btn-ghost">
                    ← Volver a Tesorería
                </Link>
            </div>

            {/* Selectors */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Año</label>
                    <select className="form-input" value={year} onChange={(e) => setYear(parseInt(e.target.value))} style={{ width: 100 }}>
                        {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Trimestre</label>
                    <div style={{ display: "flex", gap: 4 }}>
                        {QUARTERS.map((q) => (
                            <button
                                key={q.value}
                                className={`btn btn-sm ${quarter === q.value ? "btn-primary" : "btn-ghost"}`}
                                onClick={() => setQuarter(q.value)}
                            >
                                Q{q.value}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Tipo</label>
                    <div style={{ display: "flex", gap: 4 }}>
                        {TYPES.map((t) => (
                            <button
                                key={t.value}
                                className={`btn btn-sm ${type === t.value ? "btn-primary" : "btn-ghost"}`}
                                onClick={() => setType(t.value as any)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => downloadFile("csv")}>📄 CSV</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => downloadFile("excel")}>📊 Excel</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => downloadFile("pdf")}>📕 PDF</button>
                </div>
            </div>

            {loading ? (
                <div className="loading-center"><div className="spinner" /></div>
            ) : !report ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📄</div>
                    <h3>Selecciona un trimestre</h3>
                </div>
            ) : (
                <>
                    {/* Tabs */}
                    <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
                        {[
                            { key: "summary", label: "Resumen" },
                            { key: "sales", label: `Ventas (${report.sales.count})` },
                            { key: "purchases", label: `Compras (${report.purchases.count})` },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                className={`btn btn-sm ${activeTab === tab.key ? "btn-primary" : "btn-ghost"}`}
                                onClick={() => setActiveTab(tab.key as any)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === "summary" && (
                        <>
                            {/* Executive summary */}
                            <div className="card" style={{ marginBottom: 20 }}>
                                <div className="card-header">
                                    <h3 style={{ margin: 0 }}>Resumen Ejecutivo — {report.label}</h3>
                                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                        {report.from} — {report.to}
                                    </span>
                                </div>
                                <div className="card-body" style={{ padding: 0 }}>
                                    <table className="data-table" style={{ marginBottom: 0 }}>
                                        <thead>
                                            <tr>
                                                <th></th>
                                                <th className="text-right">Ventas</th>
                                                <th className="text-right">Compras</th>
                                                <th className="text-right">Diferencia</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>Nº Facturas</td>
                                                <td className="text-right">{report.sales.count}</td>
                                                <td className="text-right">{report.purchases.count}</td>
                                                <td className="text-right">{report.sales.count - report.purchases.count}</td>
                                            </tr>
                                            <tr>
                                                <td>Base Imponible</td>
                                                <td className="text-right cell-mono">{fmtCents(report.sales.subtotalCents)}</td>
                                                <td className="text-right cell-mono">{fmtCents(report.purchases.subtotalCents)}</td>
                                                <td className="text-right cell-mono">{fmtCents(report.sales.subtotalCents - report.purchases.subtotalCents)}</td>
                                            </tr>
                                            <tr>
                                                <td>IVA</td>
                                                <td className="text-right cell-mono">{fmtCents(report.sales.taxCents)}</td>
                                                <td className="text-right cell-mono">{fmtCents(report.purchases.taxCents)}</td>
                                                <td className="text-right cell-mono" style={{ color: report.ivaDifferenceCents >= 0 ? "var(--color-success, green)" : "var(--color-danger, red)" }}>
                                                    {fmtCents(report.ivaDifferenceCents)}
                                                </td>
                                            </tr>
                                            <tr style={{ fontWeight: 700 }}>
                                                <td>Total</td>
                                                <td className="text-right cell-mono">{fmtCents(report.sales.totalCents)}</td>
                                                <td className="text-right cell-mono">{fmtCents(report.purchases.totalCents)}</td>
                                                <td className="text-right cell-mono">{fmtCents(report.sales.totalCents - report.purchases.totalCents)}</td>
                                            </tr>
                                            <tr>
                                                <td>Ticket Medio</td>
                                                <td className="text-right cell-mono">{fmtCents(report.sales.averageTicketCents)}</td>
                                                <td className="text-right cell-mono">{fmtCents(report.purchases.averageTicketCents)}</td>
                                                <td className="text-right">—</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* IVA highlight */}
                            <div className="card" style={{ marginBottom: 20, borderLeft: `4px solid ${report.ivaDifferenceCents >= 0 ? "var(--color-success, green)" : "var(--color-danger, red)"}` }}>
                                <div className="card-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>Liquidación IVA Trimestral</div>
                                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                            IVA repercutido − IVA soportado = {report.ivaDifferenceCents >= 0 ? "a ingresar" : "a compensar"}
                                        </div>
                                    </div>
                                    <div style={{
                                        fontSize: 28,
                                        fontWeight: 700,
                                        fontFamily: "var(--font-mono)",
                                        color: report.ivaDifferenceCents >= 0 ? "var(--color-success, green)" : "var(--color-danger, red)",
                                    }}>
                                        {fmtCents(report.ivaDifferenceCents)}
                                    </div>
                                </div>
                            </div>

                            {/* Top counterparties */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                                {report.sales.topCounterparties.length > 0 && (
                                    <div className="card">
                                        <div className="card-header"><h3 style={{ margin: 0 }}>Top 5 Clientes</h3></div>
                                        <div className="card-body" style={{ padding: 0 }}>
                                            <table className="data-table" style={{ marginBottom: 0 }}>
                                                <tbody>
                                                    {report.sales.topCounterparties.map((c, i) => (
                                                        <tr key={i}>
                                                            <td style={{ width: 24, textAlign: "center", color: "var(--text-secondary)" }}>{i + 1}</td>
                                                            <td>{c.name}</td>
                                                            <td className="text-right cell-mono">{fmtCents(c.totalCents)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                                {report.purchases.topCounterparties.length > 0 && (
                                    <div className="card">
                                        <div className="card-header"><h3 style={{ margin: 0 }}>Top 5 Proveedores</h3></div>
                                        <div className="card-body" style={{ padding: 0 }}>
                                            <table className="data-table" style={{ marginBottom: 0 }}>
                                                <tbody>
                                                    {report.purchases.topCounterparties.map((p, i) => (
                                                        <tr key={i}>
                                                            <td style={{ width: 24, textAlign: "center", color: "var(--text-secondary)" }}>{i + 1}</td>
                                                            <td>{p.name}</td>
                                                            <td className="text-right cell-mono">{fmtCents(p.totalCents)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Tax breakdown */}
                            {(report.sales.taxBreakdown.length > 0 || report.purchases.taxBreakdown.length > 0) && (
                                <div className="card">
                                    <div className="card-header"><h3 style={{ margin: 0 }}>Desglose de Impuestos</h3></div>
                                    <div className="card-body" style={{ padding: 0 }}>
                                        <table className="data-table" style={{ marginBottom: 0 }}>
                                            <thead>
                                                <tr>
                                                    <th>Concepto</th>
                                                    <th>Impuesto</th>
                                                    <th className="text-right">Tasa</th>
                                                    <th className="text-right">Base</th>
                                                    <th className="text-right">Cuota</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {report.sales.taxBreakdown.map((t, i) => (
                                                    <tr key={`s-${i}`}>
                                                        <td>Ventas (repercutido)</td>
                                                        <td>{t.taxName}</td>
                                                        <td className="text-right">{t.rate}%</td>
                                                        <td className="text-right cell-mono">{fmtCents(t.baseCents)}</td>
                                                        <td className="text-right cell-mono">{fmtCents(t.taxAmountCents)}</td>
                                                    </tr>
                                                ))}
                                                {report.purchases.taxBreakdown.map((t, i) => (
                                                    <tr key={`p-${i}`}>
                                                        <td>Compras (soportado)</td>
                                                        <td>{t.taxName}</td>
                                                        <td className="text-right">{t.rate}%</td>
                                                        <td className="text-right cell-mono">{fmtCents(t.baseCents)}</td>
                                                        <td className="text-right cell-mono">{fmtCents(t.taxAmountCents)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Detail tabs */}
                    {(activeTab === "sales" || activeTab === "purchases") && (
                        <DetailTable
                            title={activeTab === "sales" ? "Detalle Ventas" : "Detalle Compras"}
                            rows={activeTab === "sales" ? report.sales.rows : report.purchases.rows}
                            linkPrefix={activeTab === "sales" ? "/invoices" : "/purchases"}
                        />
                    )}
                </>
            )}
        </>
    );
}

function DetailTable({ title, rows, linkPrefix }: { title: string; rows: InvoiceRow[]; linkPrefix: string }) {
    if (rows.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">📂</div>
                <h3>Sin datos en este trimestre</h3>
            </div>
        );
    }

    const totalSub = rows.reduce((s, r) => s + r.subtotalCents, 0);
    const totalTax = rows.reduce((s, r) => s + r.taxCents, 0);
    const totalAll = rows.reduce((s, r) => s + r.totalCents, 0);

    return (
        <div className="card">
            <div className="card-header">
                <h3 style={{ margin: 0 }}>{title} ({rows.length})</h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
                <table className="data-table" style={{ marginBottom: 0 }}>
                    <thead>
                        <tr>
                            <th>Número</th>
                            <th>Contrapartida</th>
                            <th>Fecha</th>
                            <th className="text-right">Base</th>
                            <th className="text-right">IVA</th>
                            <th className="text-right">Total</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.id}>
                                <td className="cell-mono">
                                    <Link href={`${linkPrefix}/${r.id}`} style={{ color: "var(--color-primary)" }}>
                                        {r.number}
                                    </Link>
                                </td>
                                <td>{r.counterpartyName}</td>
                                <td>{r.issueDate}</td>
                                <td className="text-right cell-mono">{fmtCents(r.subtotalCents)}</td>
                                <td className="text-right cell-mono">{fmtCents(r.taxCents)}</td>
                                <td className="text-right cell-mono">{fmtCents(r.totalCents)}</td>
                                <td><span className="badge badge-info">{r.status}</span></td>
                            </tr>
                        ))}
                        <tr style={{ fontWeight: 700, borderTop: "2px solid var(--border-color)" }}>
                            <td colSpan={3}>TOTAL</td>
                            <td className="text-right cell-mono">{fmtCents(totalSub)}</td>
                            <td className="text-right cell-mono">{fmtCents(totalTax)}</td>
                            <td className="text-right cell-mono">{fmtCents(totalAll)}</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
