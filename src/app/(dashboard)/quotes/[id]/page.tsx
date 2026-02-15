"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Tax {
    id: string;
    name: string;
    rate: number;
}

interface Client {
    id: string;
    name: string;
}

interface LineItem {
    key: string;
    description: string;
    quantity: string;
    unitPriceEuros: string;
    taxId: string;
    taxRate: number;
}

function calcLine(line: LineItem) {
    const qty = parseFloat(line.quantity) || 0;
    const unitCents = Math.round((parseFloat(line.unitPriceEuros) || 0) * 100);
    const subtotalCents = Math.round(qty * unitCents);
    const taxCents = Math.round(subtotalCents * line.taxRate / 100);
    return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents, unitCents };
}

function formatCents(cents: number): string {
    return (cents / 100).toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
    DRAFT: { label: "Borrador", class: "badge-draft" },
    SENT: { label: "Enviado", class: "badge-info" },
    ACCEPTED: { label: "Aceptado", class: "badge-success" },
    REJECTED: { label: "Rechazado", class: "badge-danger" },
    EXPIRED: { label: "Expirado", class: "badge-warning" },
};

export default function QuoteDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [quote, setQuote] = useState<any>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [clientId, setClientId] = useState("");
    const [notes, setNotes] = useState("");
    const [publicNotes, setPublicNotes] = useState("");
    const [validUntil, setValidUntil] = useState("");
    const [lines, setLines] = useState<LineItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [actionLoading, setActionLoading] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        Promise.all([
            fetch(`/api/quotes/${id}`).then((r) => r.json()),
            fetch("/api/clients").then((r) => r.json()),
            fetch("/api/taxes").then((r) => r.json()),
        ]).then(([q, c, t]) => {
            setQuote(q);
            setClients(Array.isArray(c) ? c : []);
            const taxList = Array.isArray(t) ? t : [];
            setTaxes(taxList);
            setClientId(q.clientId || "");
            setNotes(q.notes || "");
            setPublicNotes(q.publicNotes || "");
            setValidUntil(q.validUntil ? q.validUntil.split("T")[0] : "");
            setLines(
                (q.lines || []).map((l: any) => ({
                    key: l.id || crypto.randomUUID(),
                    description: l.description,
                    quantity: String(l.quantity),
                    unitPriceEuros: (l.unitPriceCents / 100).toFixed(2),
                    taxId: l.taxId || "",
                    taxRate: l.tax ? Number(l.tax.rate) : 0,
                }))
            );
            setLoading(false);
        }).catch(() => {
            setError("Presupuesto no encontrado");
            setLoading(false);
        });
    }, [id]);

    const updateLine = useCallback((key: string, field: string, value: string) => {
        setLines((prev) =>
            prev.map((l) => {
                if (l.key !== key) return l;
                if (field === "taxId") {
                    const tax = taxes.find((t) => t.id === value);
                    return { ...l, taxId: value, taxRate: tax ? Number(tax.rate) : 0 };
                }
                return { ...l, [field]: value };
            })
        );
    }, [taxes]);

    const addLine = () => {
        const defaultTax = taxes.find((t) => t.name.includes("21"));
        setLines((prev) => [
            ...prev,
            {
                key: crypto.randomUUID(),
                description: "",
                quantity: "1",
                unitPriceEuros: "",
                taxId: defaultTax?.id || "",
                taxRate: defaultTax ? Number(defaultTax.rate) : 0,
            },
        ]);
    };

    const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

    const lineCalcs = lines.map(calcLine);
    const subtotalCents = lineCalcs.reduce((s, l) => s + l.subtotalCents, 0);
    const taxCents = lineCalcs.reduce((s, l) => s + l.taxCents, 0);
    const totalCents = subtotalCents + taxCents;

    async function handleSave() {
        setSaving(true);
        setError("");

        const apiLines = lines.filter((l) => l.description).map((l) => {
            const c = calcLine(l);
            return {
                description: l.description,
                quantity: parseFloat(l.quantity) || 0,
                unitPriceCents: c.unitCents,
                taxId: l.taxId || null,
                taxRate: l.taxRate,
            };
        });

        try {
            const res = await fetch(`/api/quotes/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientId,
                    notes,
                    publicNotes,
                    validUntil: validUntil || null,
                    lines: apiLines,
                }),
            });

            if (!res.ok) throw new Error((await res.json()).error);
            const updated = await res.json();
            setQuote(updated);
            setEditing(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    // ── ACTION HANDLERS ─────────────────────────────────

    async function handleEmit() {
        if (!confirm("¿Emitir presupuesto? Se asignará número definitivo y no podrá volver a borrador.")) return;
        setActionLoading("emit");
        setError("");
        try {
            const res = await fetch(`/api/quotes/${id}/emit`, { method: "POST" });
            if (!res.ok) throw new Error((await res.json()).error);
            const updated = await res.json();
            setQuote(updated);
            setSuccess("✅ Presupuesto emitido correctamente");
            setTimeout(() => setSuccess(""), 4000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading("");
        }
    }

    async function handleStatusChange(newStatus: string) {
        try {
            const res = await fetch(`/api/quotes/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error("Error al cambiar estado");
            const updated = await res.json();
            setQuote(updated);
        } catch (err: any) {
            setError(err.message);
        }
    }

    async function handleDownloadPDF() {
        setActionLoading("pdf");
        try {
            const res = await fetch(`/api/quotes/${id}/pdf`);
            if (!res.ok) throw new Error("Error al generar PDF");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "presupuesto.pdf";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading("");
        }
    }

    async function handleSendEmail() {
        if (!confirm("¿Enviar presupuesto por email al cliente?")) return;
        setActionLoading("send");
        setError("");
        try {
            const res = await fetch(`/api/quotes/${id}/send`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSuccess(`📧 Enviado a ${data.sentTo}`);
            setTimeout(() => setSuccess(""), 5000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading("");
        }
    }

    async function handleConvert() {
        if (!confirm("¿Convertir presupuesto a factura? Se creará una factura borrador con las mismas líneas.")) return;
        setActionLoading("convert");
        setError("");
        try {
            const res = await fetch(`/api/quotes/${id}/convert`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSuccess("🔄 Factura creada. Redirigiendo...");
            setTimeout(() => router.push(`/invoices/${data.id}`), 1500);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading("");
        }
    }

    async function handleDelete() {
        if (!confirm("¿Eliminar este presupuesto?")) return;
        try {
            await fetch(`/api/quotes/${id}`, { method: "DELETE" });
            router.push("/quotes");
        } catch (err: any) {
            setError(err.message);
        }
    }

    if (loading) {
        return <div className="loading-center"><div className="spinner" /></div>;
    }

    if (!quote) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <h3>Presupuesto no encontrado</h3>
                <Link href="/quotes" className="btn btn-primary mt-4">← Volver</Link>
            </div>
        );
    }

    const st = STATUS_LABELS[quote.status] || { label: quote.status, class: "badge-draft" };
    const isDraft = quote.status === "DRAFT";
    const isSent = quote.status === "SENT";
    const isAccepted = quote.status === "ACCEPTED";
    const hasNumber = !!quote.number;

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>
                        {quote.number
                            ? `PRE-${quote.year}-${String(quote.number).padStart(4, "0")}`
                            : "Presupuesto (Borrador)"}
                    </h1>
                    <p className="page-header-sub">
                        <span className={`badge ${st.class}`}>{st.label}</span>
                        {" · "}
                        {quote.client?.name}
                        {quote.convertedInvoiceId && (
                            <> · <Link href={`/invoices/${quote.convertedInvoiceId}`} style={{ color: "var(--color-primary)" }}>Ver factura →</Link></>
                        )}
                    </p>
                </div>
                <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                    {/* DRAFT actions */}
                    {isDraft && !editing && (
                        <>
                            <button onClick={handleEmit} className="btn btn-primary" disabled={!!actionLoading}>
                                {actionLoading === "emit" ? "Emitiendo..." : "📋 Emitir"}
                            </button>
                            <button onClick={() => setEditing(true)} className="btn btn-secondary">
                                ✏️ Editar
                            </button>
                        </>
                    )}
                    {/* SENT: PDF, Send email, Accept, Reject */}
                    {isSent && (
                        <>
                            <button onClick={handleDownloadPDF} className="btn btn-secondary" disabled={!!actionLoading}>
                                {actionLoading === "pdf" ? "Generando..." : "📄 PDF"}
                            </button>
                            <button onClick={handleSendEmail} className="btn btn-primary" disabled={!!actionLoading}>
                                {actionLoading === "send" ? "Enviando..." : "📧 Enviar"}
                            </button>
                            <button onClick={() => handleStatusChange("ACCEPTED")} className="btn btn-primary btn-sm">
                                ✅ Aceptar
                            </button>
                            <button onClick={() => handleStatusChange("REJECTED")} className="btn btn-danger btn-sm">
                                ❌ Rechazar
                            </button>
                        </>
                    )}
                    {/* ACCEPTED: PDF, Send, Convert */}
                    {isAccepted && (
                        <>
                            <button onClick={handleDownloadPDF} className="btn btn-secondary" disabled={!!actionLoading}>
                                {actionLoading === "pdf" ? "Generando..." : "📄 PDF"}
                            </button>
                            <button onClick={handleSendEmail} className="btn btn-primary" disabled={!!actionLoading}>
                                {actionLoading === "send" ? "Enviando..." : "📧 Enviar"}
                            </button>
                            {!quote.convertedInvoiceId && (
                                <button onClick={handleConvert} className="btn btn-primary" disabled={!!actionLoading}>
                                    {actionLoading === "convert" ? "Convirtiendo..." : "🔄 Convertir a factura"}
                                </button>
                            )}
                        </>
                    )}
                    {/* REJECTED/EXPIRED: just PDF */}
                    {(quote.status === "REJECTED" || quote.status === "EXPIRED") && hasNumber && (
                        <button onClick={handleDownloadPDF} className="btn btn-secondary" disabled={!!actionLoading}>
                            📄 PDF
                        </button>
                    )}
                    {isDraft && (
                        <button onClick={handleDelete} className="btn btn-danger btn-sm">🗑️</button>
                    )}
                    <Link href="/quotes" className="btn btn-ghost">← Volver</Link>
                </div>
            </div>

            {error && (
                <div className="toast toast-error" style={{ position: "static", marginBottom: 16 }}>
                    {error}
                </div>
            )}
            {success && (
                <div className="toast toast-success" style={{ position: "static", marginBottom: 16 }}>
                    {success}
                </div>
            )}

            {/* Edit mode or read-only */}
            {editing ? (
                <>
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header">
                            <span className="card-title">Datos del presupuesto</span>
                        </div>
                        <div className="card-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Cliente *</label>
                                    <select className="form-select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                                        <option value="">Seleccionar...</option>
                                        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Válido hasta</label>
                                    <input type="date" className="form-input" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header">
                            <span className="card-title">Líneas</span>
                            <button className="btn btn-primary btn-sm" onClick={addLine}>+ Añadir</button>
                        </div>
                        <div className="card-body">
                            <div className="lines-editor">
                                <div className="line-row line-row-header">
                                    <span>Descripción</span><span>Cant.</span><span>Precio (€)</span><span>Impuesto</span>
                                    <span>Subtotal</span><span>IVA</span><span>Total</span><span></span>
                                </div>
                                {lines.map((line) => {
                                    const c = calcLine(line);
                                    return (
                                        <div className="line-row" key={line.key}>
                                            <input className="line-input" value={line.description} onChange={(e) => updateLine(line.key, "description", e.target.value)} placeholder="Concepto..." />
                                            <input className="line-input" type="number" step="0.01" min="0" value={line.quantity} onChange={(e) => updateLine(line.key, "quantity", e.target.value)} />
                                            <input className="line-input" type="number" step="0.01" min="0" value={line.unitPriceEuros} onChange={(e) => updateLine(line.key, "unitPriceEuros", e.target.value)} />
                                            <select className="line-input" value={line.taxId} onChange={(e) => updateLine(line.key, "taxId", e.target.value)}>
                                                <option value="">Sin IVA</option>
                                                {taxes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                            </select>
                                            <span className="line-computed">{formatCents(c.subtotalCents)}</span>
                                            <span className="line-computed">{formatCents(c.taxCents)}</span>
                                            <span className="line-computed" style={{ fontWeight: 600, color: "var(--color-text)" }}>{formatCents(c.totalCents)}</span>
                                            <button className="line-delete-btn" onClick={() => removeLine(line.key)}>✕</button>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="lines-footer">
                                <button className="btn btn-secondary btn-sm" onClick={addLine}>+ Añadir línea</button>
                                <div className="lines-totals">
                                    <div className="lines-totals-row"><span className="lines-totals-label">Subtotal</span><span className="lines-totals-value">{formatCents(subtotalCents)} €</span></div>
                                    <div className="lines-totals-row"><span className="lines-totals-label">Impuestos</span><span className="lines-totals-value">{formatCents(taxCents)} €</span></div>
                                    <div className="lines-totals-row total"><span className="lines-totals-label">Total</span><span className="lines-totals-value">{formatCents(totalCents)} €</span></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Notas internas</label>
                                    <textarea className="form-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Notas visibles (PDF)</label>
                                    <textarea className="form-textarea" value={publicNotes} onChange={(e) => setPublicNotes(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
                            {saving ? "Guardando..." : "💾 Guardar"}
                        </button>
                        <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancelar</button>
                    </div>
                </>
            ) : (
                /* Read-only view */
                <>
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header">
                            <span className="card-title">Detalle</span>
                        </div>
                        <div className="card-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Cliente</label>
                                    <p style={{ fontSize: 14, fontWeight: 500 }}>{quote.client?.name}</p>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Fecha creación</label>
                                    <p style={{ fontSize: 14 }}>{new Date(quote.createdAt).toLocaleDateString("es-ES")}</p>
                                </div>
                                {quote.issueDate && (
                                    <div className="form-group">
                                        <label className="form-label">Fecha emisión</label>
                                        <p style={{ fontSize: 14 }}>{new Date(quote.issueDate).toLocaleDateString("es-ES")}</p>
                                    </div>
                                )}
                                {quote.validUntil && (
                                    <div className="form-group">
                                        <label className="form-label">Válido hasta</label>
                                        <p style={{ fontSize: 14 }}>{new Date(quote.validUntil).toLocaleDateString("es-ES")}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="table-container" style={{ marginBottom: 20 }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 30 }}>#</th>
                                    <th>Descripción</th>
                                    <th>Cant.</th>
                                    <th>Precio</th>
                                    <th>Impuesto</th>
                                    <th>Subtotal</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(quote.lines || []).map((line: any) => (
                                    <tr key={line.id}>
                                        <td>{line.position}</td>
                                        <td className="cell-primary">{line.description}</td>
                                        <td>{Number(line.quantity)}</td>
                                        <td className="cell-amount">{formatCents(line.unitPriceCents)} €</td>
                                        <td>{line.tax?.name || "—"}</td>
                                        <td className="cell-amount">{formatCents(line.lineSubtotalCents)} €</td>
                                        <td className="cell-amount" style={{ fontWeight: 600 }}>{formatCents(line.lineTotalCents)} €</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="card">
                        <div className="card-body">
                            <div className="lines-totals" style={{ marginLeft: "auto" }}>
                                <div className="lines-totals-row"><span className="lines-totals-label">Subtotal</span><span className="lines-totals-value">{formatCents(quote.subtotalCents)} €</span></div>
                                <div className="lines-totals-row"><span className="lines-totals-label">Impuestos</span><span className="lines-totals-value">{formatCents(quote.taxCents)} €</span></div>
                                <div className="lines-totals-row total"><span className="lines-totals-label">Total</span><span className="lines-totals-value">{formatCents(quote.totalCents)} €</span></div>
                            </div>
                        </div>
                    </div>

                    {(quote.notes || quote.publicNotes) && (
                        <div className="card mt-4">
                            <div className="card-body">
                                <div className="form-row">
                                    {quote.notes && (
                                        <div className="form-group">
                                            <label className="form-label">Notas internas</label>
                                            <p style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{quote.notes}</p>
                                        </div>
                                    )}
                                    {quote.publicNotes && (
                                        <div className="form-group">
                                            <label className="form-label">Notas visibles</label>
                                            <p style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{quote.publicNotes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </>
    );
}
