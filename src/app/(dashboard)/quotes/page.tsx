"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotification } from "@/components/NotificationContext";

interface QuoteItem {
    id: string;
    year: number | null;
    number: number | null;
    status: string;
    totalCents: number;
    createdAt: string;
    client: { name: string };
}

function formatCents(cents: number): string {
    return (cents / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
    DRAFT: { label: "Borrador", class: "badge-draft" },
    SENT: { label: "Enviado", class: "badge-info" },
    ACCEPTED: { label: "Aceptado", class: "badge-success" },
    REJECTED: { label: "Rechazado", class: "badge-danger" },
    EXPIRED: { label: "Expirado", class: "badge-warning" },
};

// ── Actions Dropdown ──────────────────────────────────────

function ActionsDropdown({ quote, onRefresh }: { quote: QuoteItem; onRefresh: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState("");
    const ref = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { showConfirm, showSuccess, showError } = useNotification();

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        if (open) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    async function handleDownloadPDF() {
        setLoading("pdf");
        try {
            const res = await fetch(`/api/quotes/${quote.id}/pdf`);
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
        } catch (err) { console.error(err); } finally { setLoading(""); setOpen(false); }
    }

    async function handleEmit() {
        if (!await showConfirm("¿Emitir presupuesto? Se asignará número definitivo.")) return;
        setLoading("emit");
        try {
            const res = await fetch(`/api/quotes/${quote.id}/emit`, { method: "POST" });
            if (!res.ok) throw new Error((await res.json()).error);
            onRefresh();
        } catch (err: any) { showError(err.message); } finally { setLoading(""); setOpen(false); }
    }

    async function handleSendEmail() {
        if (!await showConfirm("¿Enviar presupuesto por email al cliente?")) return;
        setLoading("send");
        try {
            const res = await fetch(`/api/quotes/${quote.id}/send`, { method: "POST" });
            if (!res.ok) throw new Error((await res.json()).error);
            showSuccess("Presupuesto enviado por email");
            onRefresh();
        } catch (err: any) { showError(err.message); } finally { setLoading(""); setOpen(false); }
    }

    async function handleStatusChange(newStatus: string) {
        if (!await showConfirm(`¿Cambiar estado a ${newStatus === "ACCEPTED" ? "Aceptado" : "Rechazado"}?`)) return;
        setLoading("status");
        try {
            const res = await fetch(`/api/quotes/${quote.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error("Error");
            onRefresh();
        } catch (err: any) { showError(err.message); } finally { setLoading(""); setOpen(false); }
    }

    async function handleConvert() {
        if (!await showConfirm("¿Convertir a factura? Se creará una factura borrador.")) return;
        setLoading("convert");
        try {
            const res = await fetch(`/api/quotes/${quote.id}/convert`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            router.push(`/invoices/${data.id}`);
        } catch (err: any) { showError(err.message); } finally { setLoading(""); setOpen(false); }
    }

    async function handleDelete() {
        if (!await showConfirm("¿Eliminar este presupuesto?")) return;
        try {
            await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
            onRefresh();
        } catch (err: any) { showError(err.message); } finally { setOpen(false); }
    }

    const isDraft = quote.status === "DRAFT";
    const isSent = quote.status === "SENT";
    const isAccepted = quote.status === "ACCEPTED";

    return (
        <div className="actions-dropdown" ref={ref}>
            <button className="btn btn-ghost btn-sm actions-dropdown-trigger" onClick={(e) => { e.stopPropagation(); setOpen(!open); }} disabled={!!loading}>
                {loading ? <span className="spinner-sm" /> : "⋯"}
            </button>
            {open && (
                <div className="actions-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                    <Link href={`/quotes/${quote.id}`} className="actions-dropdown-item">👁️ Ver detalle</Link>
                    <button className="actions-dropdown-item" onClick={handleDownloadPDF}>📄 Descargar PDF</button>
                    <div className="actions-dropdown-divider" />
                    {isDraft && (<>
                        <button className="actions-dropdown-item" onClick={handleEmit}>📋 Emitir</button>
                        <div className="actions-dropdown-divider" />
                        <button className="actions-dropdown-item actions-dropdown-danger" onClick={handleDelete}>🗑️ Eliminar</button>
                    </>)}
                    {isSent && (<>
                        <button className="actions-dropdown-item" onClick={handleSendEmail}>📧 Enviar email</button>
                        <div className="actions-dropdown-divider" />
                        <button className="actions-dropdown-item" onClick={() => handleStatusChange("ACCEPTED")}>✅ Aceptar</button>
                        <button className="actions-dropdown-item" onClick={() => handleStatusChange("REJECTED")}>❌ Rechazar</button>
                    </>)}
                    {isAccepted && (<>
                        <button className="actions-dropdown-item" onClick={handleSendEmail}>📧 Enviar email</button>
                        <button className="actions-dropdown-item" onClick={handleConvert}>🔄 Convertir a factura</button>
                    </>)}
                </div>
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────

export default function QuotesPage() {
    const [quotes, setQuotes] = useState<QuoteItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [downloading, setDownloading] = useState(false);
    const router = useRouter();

    const now = new Date();
    const [dateFrom, setDateFrom] = useState(`${now.getFullYear()}-01-01`);
    const [dateTo, setDateTo] = useState(`${now.getFullYear()}-12-31`);

    useEffect(() => {
        fetchQuotes();
        setSelected(new Set());
    }, [filter, dateFrom, dateTo]);

    async function fetchQuotes() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter) params.set("status", filter);
            if (dateFrom) params.set("from", dateFrom);
            if (dateTo) params.set("to", dateTo);
            const res = await fetch(`/api/quotes?${params}`);
            const data = await res.json();
            setQuotes(Array.isArray(data) ? data : []);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    }

    const toggleSelect = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === quotes.length) setSelected(new Set());
        else setSelected(new Set(quotes.map((q) => q.id)));
    };

    async function handleBulkDownload() {
        setDownloading(true);
        try {
            const res = await fetch("/api/quotes/bulk-pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: Array.from(selected) }),
            });
            if (!res.ok) throw new Error("Error al descargar");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const ct = res.headers.get("Content-Type") || "";
            a.download = ct.includes("zip") ? `presupuestos-${new Date().toISOString().slice(0, 10)}.zip` : "presupuesto.pdf";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) { console.error(err); } finally { setDownloading(false); }
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Presupuestos</h1>
                    <p className="page-header-sub">{quotes.length} presupuestos</p>
                </div>
                <Link href="/quotes/new" className="btn btn-primary">+ Nuevo Presupuesto</Link>
            </div>

            {/* Filters */}
            <div className="filter-bar">
                {[
                    { value: "", label: "Todos" },
                    { value: "DRAFT", label: "Borradores" },
                    { value: "SENT", label: "Enviados" },
                    { value: "ACCEPTED", label: "Aceptados" },
                    { value: "REJECTED", label: "Rechazados" },
                ].map((f) => (
                    <button key={f.value} className={`btn ${filter === f.value ? "btn-primary" : "btn-secondary"} btn-sm`} onClick={() => setFilter(f.value)}>
                        {f.label}
                    </button>
                ))}
                <div style={{ flex: 1 }} />
                <div className="filter-date-group">
                    <label>📅 Desde</label>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="filter-date-group">
                    <label>Hasta</label>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
            </div>

            {/* Table */}
            <div className="table-container">
                {loading ? (
                    <div className="loading-center"><div className="spinner" /></div>
                ) : quotes.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📝</div>
                        <h3>No hay presupuestos</h3>
                        <p>Crea tu primer presupuesto para empezar a trabajar</p>
                        <Link href="/quotes/new" className="btn btn-primary">+ Nuevo Presupuesto</Link>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="cell-checkbox">
                                    <input type="checkbox" checked={selected.size === quotes.length && quotes.length > 0} onChange={toggleAll} />
                                </th>
                                <th>Número</th>
                                <th>Cliente</th>
                                <th>Estado</th>
                                <th>Total</th>
                                <th>Fecha</th>
                                <th style={{ width: 50 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {quotes.map((q) => {
                                const st = STATUS_LABELS[q.status] || { label: q.status, class: "badge-draft" };
                                const isSelected = selected.has(q.id);
                                return (
                                    <tr key={q.id} className={isSelected ? "row-selected" : ""} style={{ cursor: "pointer" }} onClick={() => router.push(`/quotes/${q.id}`)}>
                                        <td className="cell-checkbox" onClick={(e) => e.stopPropagation()}>
                                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(q.id)} />
                                        </td>
                                        <td className="cell-mono cell-primary">{q.number ? `P-${q.year}-${String(q.number).padStart(4, "0")}` : "Borrador"}</td>
                                        <td className="cell-primary">{q.client.name}</td>
                                        <td><span className={`badge ${st.class}`}>{st.label}</span></td>
                                        <td className="cell-amount">{formatCents(q.totalCents)}</td>
                                        <td>{new Date(q.createdAt).toLocaleDateString("es-ES")}</td>
                                        <td className="text-right" style={{ position: "relative" }}>
                                            <ActionsDropdown quote={q} onRefresh={fetchQuotes} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Bulk Action Bar */}
            {selected.size > 0 && (
                <div className="bulk-action-bar">
                    <span className="bulk-count">{selected.size} seleccionado{selected.size !== 1 ? "s" : ""}</span>
                    <div className="bulk-divider" />
                    <button className="btn btn-primary btn-sm" onClick={handleBulkDownload} disabled={downloading}>
                        {downloading ? "Descargando..." : "📥 Descargar PDFs"}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelected(new Set())}>✕ Deseleccionar</button>
                </div>
            )}
        </>
    );
}
