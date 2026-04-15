"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useNotification } from "@/components/NotificationContext";

interface Client {
    id: string;
    name: string;
    taxId: string | null;
    email: string | null;
    phone: string | null;
    billingAddressLine1: string | null;
    billingCity: string | null;
    billingPostalCode: string | null;
    billingProvince: string | null;
    billingCountry: string | null;
    paymentTermsDays: number;
    notes: string | null;
    createdAt: string;
}

interface ClientSummary {
    totalInvoiced: number;
    totalPaid: number;
    pendingBalance: number;
    overdueAmount: number;
    overdueCount: number;
    invoiceCount: number;
    averageTicket: number;
    quoteCount: number;
    acceptedQuotes: number;
    conversionRate: number;
    lastInvoiceDate: string | null;
}

interface HistoryItem {
    id: string;
    number: string | null;
    status: string;
    issueDate: string | null;
    totalCents: number;
    type: string;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: "Borrador", cls: "badge-draft" },
    ISSUED: { label: "Emitida", cls: "badge-info" },
    SENT: { label: "Enviada", cls: "badge-info" },
    ACCEPTED: { label: "Aceptado", cls: "badge-success" },
    REJECTED: { label: "Rechazado", cls: "badge-danger" },
    PAID: { label: "Pagada", cls: "badge-success" },
    PARTIALLY_PAID: { label: "Parcial", cls: "badge-warning" },
    VOID: { label: "Anulada", cls: "badge-danger" },
    OVERDUE: { label: "Vencida", cls: "badge-warning" },
};

function fmtCents(c: number) {
    return (c / 100).toLocaleString("es-ES", { minimumFractionDigits: 2 });
}
function fmtDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-ES");
}

export default function ClientDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { showError, showConfirm } = useNotification();
    const [client, setClient] = useState<Client | null>(null);
    const [summary, setSummary] = useState<ClientSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<"resumen" | "datos" | "facturas" | "presupuestos">("resumen");
    const [invoices, setInvoices] = useState<HistoryItem[]>([]);
    const [quotes, setQuotes] = useState<HistoryItem[]>([]);
    const [histLoading, setHistLoading] = useState(false);

    useEffect(() => { fetchClient(); fetchSummary(); }, [id]);

    async function fetchClient() {
        try {
            const res = await fetch(`/api/clients/${id}`);
            if (!res.ok) throw new Error("Cliente no encontrado");
            const data = await res.json();
            setClient(data);
        } catch {
            showError("Cliente no encontrado");
        } finally {
            setLoading(false);
        }
    }

    async function fetchSummary() {
        try {
            const res = await fetch(`/api/clients/${id}/summary`);
            if (res.ok) setSummary(await res.json());
        } catch { /* ignore */ }
    }

    async function fetchHistory() {
        if (invoices.length || quotes.length) return;
        setHistLoading(true);
        try {
            const res = await fetch(`/api/clients/${id}/history`);
            if (res.ok) {
                const data = await res.json();
                setInvoices(data.invoices || []);
                setQuotes(data.quotes || []);
            }
        } finally {
            setHistLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);

        const form = new FormData(e.currentTarget);
        const data = Object.fromEntries(form.entries());

        try {
            const res = await fetch(`/api/clients/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Error al actualizar");
            }

            const updated = await res.json();
            setClient(updated);
            setEditing(false);
        } catch (err: any) {
            showError(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!await showConfirm("¿Estás seguro de que quieres eliminar este cliente?")) return;

        try {
            const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Error al eliminar");
            router.push("/clients");
        } catch (err: any) {
            showError(err.message);
        }
    }

    if (loading) {
        return (
            <div className="loading-center">
                <div className="spinner" />
            </div>
        );
    }

    if (!client) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <h3>Cliente no encontrado</h3>
                <Link href="/clients" className="btn btn-primary mt-4">
                    ← Volver a clientes
                </Link>
            </div>
        );
    }

    const tabs = [
        { key: "resumen", label: "📊 Resumen", onClick: () => setTab("resumen") },
        { key: "datos", label: "📋 Datos", onClick: () => setTab("datos") },
        { key: "facturas", label: "📄 Facturas", onClick: () => { setTab("facturas"); fetchHistory(); } },
        { key: "presupuestos", label: "📝 Presupuestos", onClick: () => { setTab("presupuestos"); fetchHistory(); } },
    ];

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>{client.name}</h1>
                    <p className="page-header-sub">
                        {client.taxId || "Sin NIF"} · {client.email || "Sin email"}
                    </p>
                </div>
                <div className="flex gap-2">
                    {!editing && (
                        <>
                            <button
                                onClick={() => setEditing(true)}
                                className="btn btn-secondary"
                            >
                                ✏️ Editar
                            </button>
                            <button onClick={handleDelete} className="btn btn-danger">
                                🗑️ Eliminar
                            </button>
                        </>
                    )}
                    <Link href="/clients" className="btn btn-ghost">
                        ← Volver
                    </Link>
                </div>
            </div>

            {/* ── Tab Switcher ── */}
            <div style={{ display: "flex", gap: 0, marginBottom: 20 }}>
                {tabs.map((t, idx) => (
                    <button
                        key={t.key}
                        className={`btn ${tab === t.key ? "btn-primary" : "btn-secondary"}`}
                        onClick={t.onClick}
                        style={{
                            borderRadius: idx === 0 ? "8px 0 0 8px" : idx === tabs.length - 1 ? "0 8px 8px 0" : 0,
                            borderRight: idx < tabs.length - 1 ? "none" : undefined,
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Tab: Resumen 360° ── */}
            {tab === "resumen" && summary && (
                <>
                    {/* KPI Cards */}
                    <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 20 }}>
                        <div className="stat-card">
                            <div className="stat-label">Total Facturado</div>
                            <div className="stat-value" style={{ color: "var(--color-success)" }}>{fmtCents(summary.totalInvoiced)} €</div>
                            <div className="stat-sub">{summary.invoiceCount} facturas</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Pendiente de Cobro</div>
                            <div className="stat-value" style={{ color: summary.pendingBalance > 0 ? "var(--color-warning)" : "var(--color-success)" }}>
                                {fmtCents(summary.pendingBalance)} €
                            </div>
                            <div className="stat-sub">
                                {summary.overdueCount > 0 && (
                                    <span style={{ color: "var(--color-danger)", fontWeight: 600 }}>
                                        ⚠️ {summary.overdueCount} vencida{summary.overdueCount !== 1 ? "s" : ""}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Ticket Medio</div>
                            <div className="stat-value">{fmtCents(summary.averageTicket)} €</div>
                            <div className="stat-sub">Por factura</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Conversión</div>
                            <div className="stat-value">{summary.conversionRate}%</div>
                            <div className="stat-sub">{summary.acceptedQuotes}/{summary.quoteCount} presupuestos</div>
                        </div>
                    </div>

                    {/* Details Card */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div className="card">
                            <div className="card-header">
                                <span className="card-title">💰 Desglose Financiero</span>
                            </div>
                            <div className="card-body">
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Total facturado</span>
                                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--color-text)" }}>{fmtCents(summary.totalInvoiced)} €</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Total cobrado</span>
                                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--color-success)" }}>{fmtCents(summary.totalPaid)} €</span>
                                    </div>
                                    <div style={{ borderTop: "1px solid var(--color-border-subtle)", paddingTop: 12 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Pendiente</span>
                                            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: summary.pendingBalance > 0 ? "var(--color-warning)" : "var(--color-success)" }}>{fmtCents(summary.pendingBalance)} €</span>
                                        </div>
                                    </div>
                                    {summary.overdueAmount > 0 && (
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span style={{ fontSize: 13, color: "var(--color-danger)" }}>⚠️ Vencido</span>
                                            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-danger)" }}>{fmtCents(summary.overdueAmount)} €</span>
                                        </div>
                                    )}
                                    {/* Payment progress bar */}
                                    {summary.totalInvoiced > 0 && (
                                        <div style={{ marginTop: 8 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4 }}>
                                                <span>Cobrado</span>
                                                <span>{Math.round((summary.totalPaid / summary.totalInvoiced) * 100)}%</span>
                                            </div>
                                            <div style={{ width: "100%", height: 6, background: "var(--color-border)", borderRadius: 3, overflow: "hidden" }}>
                                                <div style={{
                                                    height: "100%",
                                                    width: `${Math.min((summary.totalPaid / summary.totalInvoiced) * 100, 100)}%`,
                                                    background: "var(--color-success)",
                                                    borderRadius: 3,
                                                    transition: "width 0.5s ease",
                                                }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header">
                                <span className="card-title">📋 Información Rápida</span>
                            </div>
                            <div className="card-body">
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>NIF/CIF</span>
                                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>{client.taxId || "—"}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Email</span>
                                        <span>{client.email || "—"}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Teléfono</span>
                                        <span>{client.phone || "—"}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Ciudad</span>
                                        <span>{client.billingCity || "—"}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Plazo de pago</span>
                                        <span>{client.paymentTermsDays} días</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Última factura</span>
                                        <span>{fmtDate(summary.lastInvoiceDate)}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Cliente desde</span>
                                        <span>{fmtDate(client.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {tab === "resumen" && !summary && (
                <div className="loading-center"><div className="spinner" /></div>
            )}

            {/* ── Tab: Datos ── */}
            {tab === "datos" && (
                <div className="card">
                    <div className="card-body">
                        {editing ? (
                            <form onSubmit={handleSubmit}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Nombre / Razón social *</label>
                                        <input name="name" type="text" className="form-input" defaultValue={client.name} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">NIF / CIF</label>
                                        <input name="taxId" type="text" className="form-input" defaultValue={client.taxId || ""} />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input name="email" type="email" className="form-input" defaultValue={client.email || ""} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Teléfono</label>
                                        <input name="phone" type="text" className="form-input" defaultValue={client.phone || ""} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Dirección</label>
                                    <input name="billingAddressLine1" type="text" className="form-input" defaultValue={client.billingAddressLine1 || ""} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Ciudad</label>
                                        <input name="billingCity" type="text" className="form-input" defaultValue={client.billingCity || ""} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Código Postal</label>
                                        <input name="billingPostalCode" type="text" className="form-input" defaultValue={client.billingPostalCode || ""} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Provincia</label>
                                        <input name="billingProvince" type="text" className="form-input" defaultValue={client.billingProvince || ""} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">País</label>
                                        <input name="billingCountry" type="text" className="form-input" defaultValue={client.billingCountry || "ES"} />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Plazo de pago (días)</label>
                                        <input name="paymentTermsDays" type="number" className="form-input" defaultValue={client.paymentTermsDays} min={0} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Notas internas</label>
                                    <textarea name="notes" className="form-textarea" defaultValue={client.notes || ""} />
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {saving ? "Guardando..." : "Guardar cambios"}
                                    </button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Nombre</label>
                                        <p style={{ fontSize: 14 }}>{client.name}</p>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">NIF / CIF</label>
                                        <p style={{ fontSize: 14, fontFamily: "var(--font-mono)" }}>{client.taxId || "—"}</p>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <p style={{ fontSize: 14 }}>{client.email || "—"}</p>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Teléfono</label>
                                        <p style={{ fontSize: 14 }}>{client.phone || "—"}</p>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Dirección</label>
                                    <p style={{ fontSize: 14 }}>
                                        {[client.billingAddressLine1, client.billingPostalCode, client.billingCity, client.billingProvince, client.billingCountry].filter(Boolean).join(", ") || "—"}
                                    </p>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Plazo de pago</label>
                                        <p style={{ fontSize: 14 }}>{client.paymentTermsDays} días</p>
                                    </div>
                                </div>
                                {client.notes && (
                                    <div className="form-group">
                                        <label className="form-label">Notas</label>
                                        <p style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{client.notes}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Tab: Facturas ── */}
            {tab === "facturas" && (
                <div>
                    <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                        <span className="badge badge-primary">{invoices.length} facturas</span>
                    </div>
                    {histLoading ? (
                        <div className="loading-center"><div className="spinner" /></div>
                    ) : invoices.length === 0 ? (
                        <div className="card"><div className="card-body"><p style={{ color: "var(--color-text-muted)" }}>Sin facturas</p></div></div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Nº Documento</th>
                                        <th>Estado</th>
                                        <th style={{ textAlign: "right" }}>Total</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((inv) => {
                                        const st = STATUS_MAP[inv.status] || { label: inv.status, cls: "badge-draft" };
                                        return (
                                            <tr key={inv.id}>
                                                <td>{fmtDate(inv.issueDate)}</td>
                                                <td className="cell-primary">{inv.number || "Borrador"}</td>
                                                <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                                                <td className="cell-amount">{fmtCents(inv.totalCents)} €</td>
                                                <td>
                                                    <div style={{ display: "flex", gap: 6 }}>
                                                        <Link href={`/invoices/${inv.id}`} className="btn btn-ghost btn-sm">Ver</Link>
                                                        <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">PDF</a>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Presupuestos ── */}
            {tab === "presupuestos" && (
                <div>
                    <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                        <span className="badge badge-info">{quotes.length} presupuestos</span>
                    </div>
                    {histLoading ? (
                        <div className="loading-center"><div className="spinner" /></div>
                    ) : quotes.length === 0 ? (
                        <div className="card"><div className="card-body"><p style={{ color: "var(--color-text-muted)" }}>Sin presupuestos</p></div></div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Nº Documento</th>
                                        <th>Estado</th>
                                        <th style={{ textAlign: "right" }}>Total</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quotes.map((q) => {
                                        const st = STATUS_MAP[q.status] || { label: q.status, cls: "badge-draft" };
                                        return (
                                            <tr key={q.id}>
                                                <td>{fmtDate(q.issueDate)}</td>
                                                <td className="cell-primary">{q.number || "Borrador"}</td>
                                                <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                                                <td className="cell-amount">{fmtCents(q.totalCents)} €</td>
                                                <td>
                                                    <div style={{ display: "flex", gap: 6 }}>
                                                        <Link href={`/quotes/${q.id}`} className="btn btn-ghost btn-sm">Ver</Link>
                                                        <a href={`/api/quotes/${q.id}/pdf`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">PDF</a>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
