"use client";

import { useEffect, useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    PieChart, Pie, Cell,
} from "recharts";

interface DashboardStats {
    invoicedThisMonth: number;
    invoicedPrevMonth: number;
    monthGrowth: number;
    pendingCollection: number;
    pendingCount: number;
    clientCount: number;
    providerCount: number;
    quotesThisMonth: number;
    invoicedThisYear: number;
    purchasedThisYear: number;
    overdueInvoices: number;
    monthName: string;
    monthlyChart: Array<{ name: string; ingresos: number; gastos: number }>;
    topClients: Array<{ name: string; value: number }>;
    recentActivity: Array<{
        id: string;
        entityType: string;
        entityId: string;
        action: string;
        metadata: any;
        createdAt: string;
        user: { name: string; email: string } | null;
    }>;
}

function formatCents(cents: number): string {
    return (cents / 100).toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function formatEuros(euros: number): string {
    return euros.toLocaleString("es-ES", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
}

const ACTION_LABELS: Record<string, string> = {
    CREATE: "Creado",
    UPDATE: "Actualizado",
    STATUS_CHANGE: "Cambio de estado",
    EMIT: "Emitido",
    SEND: "Enviado",
    DELETE: "Eliminado",
    CONVERT: "Convertido",
    PAYMENT: "Pago registrado",
};

const ENTITY_LABELS: Record<string, string> = {
    quote: "Presupuesto",
    invoice: "Factura",
    client: "Cliente",
    provider: "Proveedor",
    service: "Servicio",
    purchase_invoice: "Factura compra",
    recurring_template: "Recurrente",
};

const ENTITY_ICONS: Record<string, string> = {
    quote: "📋",
    invoice: "📄",
    client: "👤",
    provider: "🏢",
    service: "⚙️",
    purchase_invoice: "🧾",
    recurring_template: "🔄",
};

const PIE_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: "rgba(22, 24, 34, 0.95)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                borderRadius: 8,
                padding: "10px 14px",
                backdropFilter: "blur(8px)",
            }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#f1f5f9", marginBottom: 6 }}>{label}</p>
                {payload.map((entry: any, idx: number) => (
                    <p key={idx} style={{ fontSize: 12, color: entry.color, margin: 0 }}>
                        {entry.name}: {formatEuros(entry.value)} €
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/dashboard/stats")
            .then((r) => r.json())
            .then(setStats)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="loading-center">
                <div className="spinner" />
            </div>
        );
    }

    if (!stats) {
        return <p>Error al cargar el dashboard</p>;
    }

    const profitThisYear = stats.invoicedThisYear - stats.purchasedThisYear;

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Dashboard</h1>
                    <p className="page-header-sub">
                        Resumen de {stats.monthName}
                    </p>
                </div>
            </div>

            {/* Stats Grid — Row 1 */}
            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <div className="stat-card">
                    <div className="stat-label">Facturado este mes</div>
                    <div className="stat-value">{formatCents(stats.invoicedThisMonth)} €</div>
                    <div className="stat-sub">
                        {stats.monthGrowth !== 0 && (
                            <span style={{
                                color: stats.monthGrowth > 0 ? "var(--color-success)" : "var(--color-danger)",
                                fontWeight: 600,
                            }}>
                                {stats.monthGrowth > 0 ? "↑" : "↓"} {Math.abs(stats.monthGrowth)}%
                            </span>
                        )}
                        {stats.monthGrowth !== 0 ? " vs mes anterior" : ""}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Pendiente de cobro</div>
                    <div className="stat-value" style={{ color: stats.pendingCollection > 0 ? "var(--color-warning)" : "var(--color-success)" }}>
                        {formatCents(stats.pendingCollection)} €
                    </div>
                    <div className="stat-sub">
                        {stats.pendingCount} factura{stats.pendingCount !== 1 ? "s" : ""}
                        {stats.overdueInvoices > 0 && (
                            <span style={{ color: "var(--color-danger)", marginLeft: 8, fontWeight: 600 }}>
                                ⚠️ {stats.overdueInvoices} vencida{stats.overdueInvoices !== 1 ? "s" : ""}
                            </span>
                        )}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Clientes / Proveedores</div>
                    <div className="stat-value">{stats.clientCount}<span style={{ color: "var(--color-text-muted)", fontSize: 18 }}> / {stats.providerCount}</span></div>
                    <div className="stat-sub">Activos</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Presupuestos</div>
                    <div className="stat-value">{stats.quotesThisMonth}</div>
                    <div className="stat-sub">Este mes</div>
                </div>
            </div>

            {/* Year Summary Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
                <div className="card">
                    <div className="card-body" style={{ textAlign: "center" }}>
                        <span style={{ fontSize: 12, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Ingresos {new Date().getFullYear()}</span>
                        <p style={{ fontSize: 26, fontWeight: 700, fontFamily: "var(--font-mono)", marginTop: 6, color: "var(--color-success)" }}>
                            {formatCents(stats.invoicedThisYear)} €
                        </p>
                    </div>
                </div>
                <div className="card">
                    <div className="card-body" style={{ textAlign: "center" }}>
                        <span style={{ fontSize: 12, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Gastos {new Date().getFullYear()}</span>
                        <p style={{ fontSize: 26, fontWeight: 700, fontFamily: "var(--font-mono)", marginTop: 6, color: "var(--color-danger)" }}>
                            {formatCents(stats.purchasedThisYear)} €
                        </p>
                    </div>
                </div>
                <div className="card">
                    <div className="card-body" style={{ textAlign: "center" }}>
                        <span style={{ fontSize: 12, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Beneficio {new Date().getFullYear()}</span>
                        <p style={{
                            fontSize: 26, fontWeight: 700, fontFamily: "var(--font-mono)", marginTop: 6,
                            color: profitThisYear >= 0 ? "var(--color-success)" : "var(--color-danger)",
                        }}>
                            {formatCents(profitThisYear)} €
                        </p>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24 }}>
                {/* Monthly Revenue Chart */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">📊 Facturación Mensual {new Date().getFullYear()}</span>
                    </div>
                    <div className="card-body" style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.monthlyChart} barCategoryGap="20%">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => `${v}€`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                                    iconType="circle"
                                    iconSize={8}
                                />
                                <Bar dataKey="ingresos" name="Ingresos" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="gastos" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.7} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Clients Pie */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">🏆 Top Clientes</span>
                    </div>
                    <div className="card-body" style={{ height: 300 }}>
                        {stats.topClients.length === 0 ? (
                            <div className="empty-state" style={{ padding: 20 }}>
                                <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Sin datos de clientes</p>
                            </div>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height={180}>
                                    <PieChart>
                                        <Pie
                                            data={stats.topClients}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={45}
                                            outerRadius={75}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {stats.topClients.map((_, idx) => (
                                                <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: any) => [`${formatEuros(Number(value))} €`, "Facturado"]}
                                            contentStyle={{
                                                background: "rgba(22, 24, 34, 0.95)",
                                                border: "1px solid rgba(99, 102, 241, 0.3)",
                                                borderRadius: 8,
                                                fontSize: 12,
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    {stats.topClients.map((c, idx) => (
                                        <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                                <span style={{ color: "var(--color-text-secondary)" }}>{c.name.substring(0, 20)}</span>
                                            </div>
                                            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--color-text)" }}>{formatEuros(c.value)} €</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="card">
                <div className="card-header">
                    <span className="card-title">⚡ Actividad Reciente</span>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                    {stats.recentActivity.length === 0 ? (
                        <div className="empty-state" style={{ padding: 32 }}>
                            <div className="empty-state-icon">📋</div>
                            <h3>Sin actividad reciente</h3>
                            <p>Empieza creando tu primer cliente o presupuesto</p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            {stats.recentActivity.map((a) => (
                                <div
                                    key={a.id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        padding: "12px 20px",
                                        borderBottom: "1px solid var(--color-border-subtle)",
                                        transition: "background 0.15s ease",
                                    }}
                                >
                                    <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{ENTITY_ICONS[a.entityType] || "📌"}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: 13, fontWeight: 500 }}>
                                            {ACTION_LABELS[a.action] || a.action}{" "}
                                            <span style={{ color: "var(--color-text-secondary)" }}>
                                                {ENTITY_LABELS[a.entityType] || a.entityType}
                                            </span>
                                        </p>
                                        <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                                            {new Date(a.createdAt).toLocaleString("es-ES", {
                                                day: "2-digit",
                                                month: "short",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                            {a.user && ` · ${a.user.name || a.user.email}`}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
