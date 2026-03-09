"use client";

import { useEffect, useState } from "react";

interface DashboardStats {
    invoicedThisMonth: number;
    pendingCollection: number;
    pendingCount: number;
    clientCount: number;
    quotesThisMonth: number;
    invoicedThisYear: number;
    overdueInvoices: number;
    monthName: string;
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

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-label">Facturado este mes</div>
                    <div className="stat-value">{formatCents(stats.invoicedThisMonth)} €</div>
                    <div className="stat-sub" style={{ textTransform: "capitalize" }}>{stats.monthName}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Pendiente de cobro</div>
                    <div className="stat-value">{formatCents(stats.pendingCollection)} €</div>
                    <div className="stat-sub">
                        {stats.pendingCount} factura{stats.pendingCount !== 1 ? "s" : ""}
                        {stats.overdueInvoices > 0 && (
                            <span style={{ color: "var(--color-danger)", marginLeft: 8 }}>
                                ⚠️ {stats.overdueInvoices} vencida{stats.overdueInvoices !== 1 ? "s" : ""}
                            </span>
                        )}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Clientes</div>
                    <div className="stat-value">{stats.clientCount}</div>
                    <div className="stat-sub">Activos</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Presupuestos</div>
                    <div className="stat-value">{stats.quotesThisMonth}</div>
                    <div className="stat-sub">Este mes</div>
                </div>
            </div>

            {/* Year summary */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Facturado {new Date().getFullYear()}</span>
                        <p style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--font-mono)", marginTop: 4 }}>
                            {formatCents(stats.invoicedThisYear)} €
                        </p>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="card">
                <div className="card-header">
                    <span className="card-title">Actividad reciente</span>
                </div>
                <div className="card-body">
                    {stats.recentActivity.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📋</div>
                            <h3>Sin actividad reciente</h3>
                            <p>Empieza creando tu primer cliente o presupuesto</p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                            {stats.recentActivity.map((a) => (
                                <div
                                    key={a.id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        padding: "10px 0",
                                        borderBottom: "1px solid var(--color-border-subtle)",
                                    }}
                                >
                                    <span style={{ fontSize: 20 }}>{ENTITY_ICONS[a.entityType] || "📌"}</span>
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
