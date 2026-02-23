"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

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
    ISSUED: { label: "Emitida", cls: "badge-success" },
    SENT: { label: "Enviada", cls: "badge-info" },
    ACCEPTED: { label: "Aceptado", cls: "badge-success" },
    REJECTED: { label: "Rechazado", cls: "badge-danger" },
    PAID: { label: "Pagada", cls: "badge-success" },
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
    const [client, setClient] = useState<Client | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [tab, setTab] = useState<"datos" | "historial">("datos");
    const [invoices, setInvoices] = useState<HistoryItem[]>([]);
    const [quotes, setQuotes] = useState<HistoryItem[]>([]);
    const [histLoading, setHistLoading] = useState(false);

    useEffect(() => { fetchClient(); }, [id]);

    async function fetchClient() {
        try {
            const res = await fetch(`/api/clients/${id}`);
            if (!res.ok) throw new Error("Cliente no encontrado");
            const data = await res.json();
            setClient(data);
        } catch {
            setError("Cliente no encontrado");
        } finally {
            setLoading(false);
        }
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
        setError("");

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
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!confirm("¿Estás seguro de que quieres eliminar este cliente?")) return;

        try {
            const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Error al eliminar");
            router.push("/clients");
        } catch (err: any) {
            setError(err.message);
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

            {error && (
                <div className="toast toast-error" style={{ position: "static", marginBottom: 16 }}>
                    {error}
                </div>
            )}

            {/* ── Tab Switcher ── */}
            <div className="detail-tabs" style={{ display: "flex", gap: 0, marginBottom: 20 }}>
                <button
                    className={`btn ${tab === "datos" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setTab("datos")}
                    style={{ borderRadius: "8px 0 0 8px" }}
                >
                    📋 Datos
                </button>
                <button
                    className={`btn ${tab === "historial" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => { setTab("historial"); fetchHistory(); }}
                    style={{ borderRadius: "0 8px 8px 0" }}
                >
                    📊 Historial
                </button>
            </div>

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

            {/* ── Tab: Historial ── */}
            {tab === "historial" && (
                <div>
                    {/* Counter badges */}
                    <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                        <span className="badge badge-primary">{invoices.length} facturas</span>
                        <span className="badge badge-info">{quotes.length} presupuestos</span>
                    </div>

                    {histLoading ? (
                        <div className="loading-center"><div className="spinner" /></div>
                    ) : (
                        <>
                            {/* Invoices */}
                            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>📄 Facturas</h3>
                            {invoices.length === 0 ? (
                                <div className="card" style={{ marginBottom: 24 }}><div className="card-body"><p style={{ color: "var(--color-text-muted)" }}>Sin facturas</p></div></div>
                            ) : (
                                <div className="table-container" style={{ marginBottom: 24 }}>
                                    <div style={{ overflowX: "auto" }}>
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
                                                            <td className="cell-amount">{fmtCents(inv.totalCents)}€</td>
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
                                </div>
                            )}

                            {/* Quotes */}
                            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>📝 Presupuestos</h3>
                            {quotes.length === 0 ? (
                                <div className="card"><div className="card-body"><p style={{ color: "var(--color-text-muted)" }}>Sin presupuestos</p></div></div>
                            ) : (
                                <div className="table-container">
                                    <div style={{ overflowX: "auto" }}>
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
                                                            <td className="cell-amount">{fmtCents(q.totalCents)}€</td>
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
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </>
    );
}
