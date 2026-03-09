"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useNotification } from "@/components/NotificationContext";

interface Provider {
    id: string;
    name: string;
    taxId: string | null;
    email: string | null;
    phone: string | null;
    addressLine1: string | null;
    city: string | null;
    postalCode: string | null;
    province: string | null;
    country: string | null;
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

export default function ProviderDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { showError, showConfirm } = useNotification();
    const [provider, setProvider] = useState<Provider | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<"datos" | "historial">("datos");
    const [purchaseInvoices, setPurchaseInvoices] = useState<HistoryItem[]>([]);
    const [histLoading, setHistLoading] = useState(false);

    useEffect(() => { fetchProvider(); }, [id]);

    async function fetchProvider() {
        try {
            const res = await fetch(`/api/providers/${id}`);
            if (!res.ok) throw new Error("Proveedor no encontrado");
            const data = await res.json();
            setProvider(data);
        } catch {
            showError("Proveedor no encontrado");
        } finally {
            setLoading(false);
        }
    }

    async function fetchHistory() {
        if (purchaseInvoices.length) return;
        setHistLoading(true);
        try {
            const res = await fetch(`/api/providers/${id}/history`);
            if (res.ok) {
                const data = await res.json();
                setPurchaseInvoices(data.purchaseInvoices || []);
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
            const res = await fetch(`/api/providers/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Error al actualizar");
            }

            const updated = await res.json();
            setProvider(updated);
            setEditing(false);
        } catch (err: any) {
            showError(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!await showConfirm("¿Estás seguro de que quieres eliminar este proveedor?")) return;

        try {
            const res = await fetch(`/api/providers/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Error al eliminar");
            router.push("/providers");
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

    if (!provider) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <h3>Proveedor no encontrado</h3>
                <Link href="/providers" className="btn btn-primary mt-4">
                    ← Volver a proveedores
                </Link>
            </div>
        );
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>{provider.name}</h1>
                    <p className="page-header-sub">
                        {provider.taxId || "Sin NIF"} · {provider.email || "Sin email"}
                    </p>
                </div>
                <div className="flex gap-2">
                    {!editing && (
                        <>
                            <button onClick={() => setEditing(true)} className="btn btn-secondary">
                                ✏️ Editar
                            </button>
                            <button onClick={handleDelete} className="btn btn-danger">
                                🗑️ Eliminar
                            </button>
                        </>
                    )}
                    <Link href="/providers" className="btn btn-ghost">
                        ← Volver
                    </Link>
                </div>
            </div>



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
                                        <input name="name" type="text" className="form-input" defaultValue={provider.name} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">NIF / CIF</label>
                                        <input name="taxId" type="text" className="form-input" defaultValue={provider.taxId || ""} />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input name="email" type="email" className="form-input" defaultValue={provider.email || ""} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Teléfono</label>
                                        <input name="phone" type="text" className="form-input" defaultValue={provider.phone || ""} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Dirección</label>
                                    <input name="addressLine1" type="text" className="form-input" defaultValue={provider.addressLine1 || ""} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Ciudad</label>
                                        <input name="city" type="text" className="form-input" defaultValue={provider.city || ""} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Código Postal</label>
                                        <input name="postalCode" type="text" className="form-input" defaultValue={provider.postalCode || ""} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Provincia</label>
                                        <input name="province" type="text" className="form-input" defaultValue={provider.province || ""} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">País</label>
                                        <input name="country" type="text" className="form-input" defaultValue={provider.country || "ES"} />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Plazo de pago (días)</label>
                                        <input name="paymentTermsDays" type="number" className="form-input" defaultValue={provider.paymentTermsDays} min={0} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Notas internas</label>
                                    <textarea name="notes" className="form-textarea" defaultValue={provider.notes || ""} />
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
                                        <p style={{ fontSize: 14 }}>{provider.name}</p>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">NIF / CIF</label>
                                        <p style={{ fontSize: 14, fontFamily: "var(--font-mono)" }}>{provider.taxId || "—"}</p>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <p style={{ fontSize: 14 }}>{provider.email || "—"}</p>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Teléfono</label>
                                        <p style={{ fontSize: 14 }}>{provider.phone || "—"}</p>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Dirección</label>
                                    <p style={{ fontSize: 14 }}>
                                        {[provider.addressLine1, provider.postalCode, provider.city, provider.province, provider.country].filter(Boolean).join(", ") || "—"}
                                    </p>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Plazo de pago</label>
                                        <p style={{ fontSize: 14 }}>{provider.paymentTermsDays} días</p>
                                    </div>
                                </div>
                                {provider.notes && (
                                    <div className="form-group">
                                        <label className="form-label">Notas</label>
                                        <p style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{provider.notes}</p>
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
                    <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                        <span className="badge badge-primary">{purchaseInvoices.length} facturas proveedor</span>
                    </div>

                    {histLoading ? (
                        <div className="loading-center"><div className="spinner" /></div>
                    ) : (
                        <>
                            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>📥 Facturas Proveedor</h3>
                            {purchaseInvoices.length === 0 ? (
                                <div className="card"><div className="card-body"><p style={{ color: "var(--color-text-muted)" }}>Sin facturas de proveedor</p></div></div>
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
                                                {purchaseInvoices.map((inv) => {
                                                    const st = STATUS_MAP[inv.status] || { label: inv.status, cls: "badge-draft" };
                                                    return (
                                                        <tr key={inv.id}>
                                                            <td>{fmtDate(inv.issueDate)}</td>
                                                            <td className="cell-primary">{inv.number || "Borrador"}</td>
                                                            <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                                                            <td className="cell-amount">{fmtCents(inv.totalCents)}€</td>
                                                            <td>
                                                                <Link href={`/purchases/${inv.id}`} className="btn btn-ghost btn-sm">Ver</Link>
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
