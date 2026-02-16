"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface TreasurySummary {
    period: { from: string; to: string };
    totalBalanceCents: number;
    accounts: { id: string; name: string; iban: string | null; balanceCents: number }[];
    cashInCents: number;
    cashOutCents: number;
    netCashCents: number;
    pendingCollectionCents: number;
    pendingPaymentCents: number;
    evolution: { month: string; inCents: number; outCents: number }[];
}

const PERIOD_PRESETS = [
    { label: "Este mes", value: "month" },
    { label: "Este trimestre", value: "quarter" },
    { label: "Este año", value: "year" },
];

function fmtCents(c: number) {
    return (c / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function getPeriodDates(preset: string): { from: string; to: string } {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    switch (preset) {
        case "quarter": {
            const q = Math.floor(m / 3);
            return {
                from: new Date(y, q * 3, 1).toISOString().split("T")[0],
                to: new Date(y, q * 3 + 3, 0).toISOString().split("T")[0],
            };
        }
        case "year":
            return {
                from: `${y}-01-01`,
                to: `${y}-12-31`,
            };
        default: // month
            return {
                from: new Date(y, m, 1).toISOString().split("T")[0],
                to: new Date(y, m + 1, 0).toISOString().split("T")[0],
            };
    }
}

export default function TreasuryDashboardPage() {
    const [summary, setSummary] = useState<TreasurySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState("quarter");

    useEffect(() => {
        fetchSummary();
    }, [period]);

    async function fetchSummary() {
        setLoading(true);
        try {
            const { from, to } = getPeriodDates(period);
            const res = await fetch(`/api/treasury/summary?from=${from}&to=${to}`);
            const data = await res.json();
            setSummary(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    if (loading || !summary) {
        return (
            <div className="loading-center">
                <div className="spinner" />
            </div>
        );
    }

    const maxBar = Math.max(
        ...summary.evolution.map((e) => Math.max(e.inCents, e.outCents)),
        1
    );

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Tesorería</h1>
                    <p className="page-header-sub">Resumen de caja y posición financiera</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/treasury/reports" className="btn btn-secondary">
                        📊 Informes
                    </Link>
                    <Link href="/treasury/movements" className="btn btn-secondary">
                        📋 Movimientos
                    </Link>
                </div>
            </div>

            {/* Period selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {PERIOD_PRESETS.map((p) => (
                    <button
                        key={p.value}
                        className={`btn btn-sm ${period === p.value ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => setPeriod(p.value)}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Metric cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
                <div className="card">
                    <div className="card-body" style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Saldo Total</div>
                        <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                            {fmtCents(summary.totalBalanceCents)}
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="card-body" style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Ingresos</div>
                        <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-success, #22c55e)" }}>
                            +{fmtCents(summary.cashInCents)}
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="card-body" style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Gastos</div>
                        <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-danger, #ef4444)" }}>
                            -{fmtCents(summary.cashOutCents)}
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="card-body" style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Balance Neto</div>
                        <div style={{
                            fontSize: 24, fontWeight: 700, fontFamily: "var(--font-mono)",
                            color: summary.netCashCents >= 0 ? "var(--color-success, #22c55e)" : "var(--color-danger, #ef4444)"
                        }}>
                            {summary.netCashCents >= 0 ? "+" : ""}{fmtCents(summary.netCashCents)}
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="card-body" style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Pendiente de cobro</div>
                        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-warning, #f59e0b)" }}>
                            {fmtCents(summary.pendingCollectionCents)}
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="card-body" style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Pendiente de pago</div>
                        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-warning, #f59e0b)" }}>
                            {fmtCents(summary.pendingPaymentCents)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Evolution chart */}
            {summary.evolution.length > 0 && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-header">
                        <h3 style={{ margin: 0 }}>Evolución de Caja</h3>
                    </div>
                    <div className="card-body">
                        <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 180 }}>
                            {summary.evolution.map((e, i) => (
                                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 140, width: "100%" }}>
                                        <div
                                            style={{
                                                flex: 1,
                                                background: "var(--color-success, #22c55e)",
                                                borderRadius: "4px 4px 0 0",
                                                height: `${Math.max((e.inCents / maxBar) * 140, 2)}px`,
                                                opacity: 0.7,
                                            }}
                                            title={`Ingresos: ${fmtCents(e.inCents)}`}
                                        />
                                        <div
                                            style={{
                                                flex: 1,
                                                background: "var(--color-danger, #ef4444)",
                                                borderRadius: "4px 4px 0 0",
                                                height: `${Math.max((e.outCents / maxBar) * 140, 2)}px`,
                                                opacity: 0.7,
                                            }}
                                            title={`Gastos: ${fmtCents(e.outCents)}`}
                                        />
                                    </div>
                                    <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{e.month}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 12 }}>
                            <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ width: 10, height: 10, background: "var(--color-success, #22c55e)", borderRadius: 2, display: "inline-block" }} />
                                Ingresos
                            </span>
                            <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ width: 10, height: 10, background: "var(--color-danger, #ef4444)", borderRadius: 2, display: "inline-block" }} />
                                Gastos
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Accounts list */}
            {summary.accounts.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <h3 style={{ margin: 0 }}>Cuentas</h3>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <table className="data-table" style={{ marginBottom: 0 }}>
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>IBAN</th>
                                    <th className="text-right">Saldo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.accounts.map((acc) => (
                                    <tr key={acc.id}>
                                        <td className="cell-primary">{acc.name}</td>
                                        <td className="cell-mono">{acc.iban || "—"}</td>
                                        <td className="text-right cell-mono">{fmtCents(acc.balanceCents)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {summary.accounts.length === 0 && (
                <div className="card">
                    <div className="card-body" style={{ textAlign: "center", padding: 40 }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>🏦</div>
                        <h3 style={{ marginBottom: 8 }}>Sin cuentas bancarias</h3>
                        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
                            Añade tu primera cuenta para empezar a registrar movimientos
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
