"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotification } from "@/components/NotificationContext";

interface InvoiceItem {
    id: string;
    year: number | null;
    number: string | null;
    type: string;
    status: string;
    totalCents: number;
    paidCents: number;
    createdAt: string;
    issueDate: string | null;
    client: { name: string };
}

function formatCents(cents: number): string {
    return (cents / 100).toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }) + " €";
}

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
    DRAFT: { label: "Borrador", class: "badge-draft" },
    ISSUED: { label: "Emitida", class: "badge-info" },
    PARTIALLY_PAID: { label: "Parcial", class: "badge-warning" },
    PAID: { label: "Pagada", class: "badge-success" },
    VOID: { label: "Anulada", class: "badge-danger" },
};

// ── Actions Dropdown ──────────────────────────────────────

function ActionsDropdown({ invoice, onRefresh }: { invoice: InvoiceItem; onRefresh: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState("");
    const ref = useRef<HTMLDivElement>(null);
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
            const res = await fetch(`/api/invoices/${invoice.id}/pdf`);
            if (!res.ok) throw new Error("Error al generar PDF");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "factura.pdf";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) { console.error(err); } finally { setLoading(""); setOpen(false); }
    }

    async function handleEmit() {
        if (!await showConfirm("¿Emitir factura? Se asignará número definitivo.")) return;
        setLoading("emit");
        try {
            const res = await fetch(`/api/invoices/${invoice.id}/emit`, { method: "POST" });
            if (!res.ok) throw new Error((await res.json()).error);
            onRefresh();
        } catch (err: any) { showError(err.message); } finally { setLoading(""); setOpen(false); }
    }

    async function handleSendEmail() {
        if (!await showConfirm("¿Enviar factura por email al cliente?")) return;
        setLoading("send");
        try {
            const res = await fetch(`/api/invoices/${invoice.id}/send`, { method: "POST" });
            if (!res.ok) throw new Error((await res.json()).error);
            showSuccess("Factura enviada por email");
            onRefresh();
        } catch (err: any) { showError(err.message); } finally { setLoading(""); setOpen(false); }
    }

    async function handleDelete() {
        if (!await showConfirm("¿Eliminar esta factura?")) return;
        try {
            const res = await fetch(`/api/invoices/${invoice.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Error al eliminar");
            onRefresh();
        } catch (err: any) { showError(err.message); } finally { setOpen(false); }
    }

    const isDraft = invoice.status === "DRAFT";
    const isIssued = invoice.status === "ISSUED";

    return (
        <div className="actions-dropdown" ref={ref}>
            <button className="btn btn-ghost btn-sm actions-dropdown-trigger" onClick={(e) => { e.stopPropagation(); setOpen(!open); }} disabled={!!loading}>
                {loading ? <span className="spinner-sm" /> : "⋯"}
            </button>
            {open && (
                <div className="actions-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                    <Link href={`/invoices/${invoice.id}`} className="actions-dropdown-item">👁️ Ver detalle</Link>
                    <button className="actions-dropdown-item" onClick={handleDownloadPDF}>📄 Descargar PDF</button>
                    <div className="actions-dropdown-divider" />
                    {isDraft && (<>
                        <button className="actions-dropdown-item" onClick={handleEmit}>📋 Emitir</button>
                        <div className="actions-dropdown-divider" />
                        <button className="actions-dropdown-item actions-dropdown-danger" onClick={handleDelete}>🗑️ Eliminar</button>
                    </>)}
                    {isIssued && <button className="actions-dropdown-item" onClick={handleSendEmail}>📧 Enviar email</button>}
                </div>
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [downloading, setDownloading] = useState(false);
    const router = useRouter();

    // Date range — default to current year
    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const yearEnd = `${now.getFullYear()}-12-31`;
    const [dateFrom, setDateFrom] = useState(yearStart);
    const [dateTo, setDateTo] = useState(yearEnd);

    useEffect(() => {
        fetchInvoices();
        setSelected(new Set()); // clear selection on filter change
    }, [filter, dateFrom, dateTo]);

    async function fetchInvoices() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter) params.set("status", filter);
            if (dateFrom) params.set("from", dateFrom);
            if (dateTo) params.set("to", dateTo);
            const res = await fetch(`/api/invoices?${params}`);
            const data = await res.json();
            setInvoices(Array.isArray(data) ? data : []);
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
        if (selected.size === invoices.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(invoices.map((i) => i.id)));
        }
    };

    async function handleBulkDownload() {
        setDownloading(true);
        try {
            const res = await fetch("/api/invoices/bulk-pdf", {
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
            a.download = ct.includes("zip") ? `facturas-${new Date().toISOString().slice(0, 10)}.zip` : "factura.pdf";
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
                    <h1>Facturas</h1>
                    <p className="page-header-sub">{invoices.length} facturas</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/invoices/recurring" className="btn btn-secondary">🔄 Recurrentes</Link>
                    <Link href="/invoices/new" className="btn btn-primary">+ Nueva factura</Link>
                </div>
            </div>

            {/* Filters */}
            <div className="filter-bar">
                {[
                    { value: "", label: "Todas" },
                    { value: "DRAFT", label: "Borradores" },
                    { value: "ISSUED", label: "Emitidas" },
                    { value: "PAID", label: "Pagadas" },
                    { value: "VOID", label: "Anuladas" },
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
                ) : invoices.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📄</div>
                        <h3>No hay facturas</h3>
                        <p>Crea una factura directamente o conviértelas desde presupuestos</p>
                        <Link href="/invoices/new" className="btn btn-primary" style={{ marginTop: 12 }}>+ Nueva factura</Link>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="cell-checkbox">
                                    <input type="checkbox" checked={selected.size === invoices.length && invoices.length > 0} onChange={toggleAll} />
                                </th>
                                <th>Número</th>
                                <th>Cliente</th>
                                <th>Tipo</th>
                                <th>Estado</th>
                                <th>Total</th>
                                <th>Pagado</th>
                                <th>Fecha</th>
                                <th style={{ width: 50 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((inv) => {
                                const st = STATUS_LABELS[inv.status] || { label: inv.status, class: "badge-draft" };
                                const isSelected = selected.has(inv.id);
                                return (
                                    <tr key={inv.id} className={isSelected ? "row-selected" : ""} style={{ cursor: "pointer" }} onClick={() => router.push(`/invoices/${inv.id}`)}>
                                        <td className="cell-checkbox" onClick={(e) => e.stopPropagation()}>
                                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(inv.id)} />
                                        </td>
                                        <td className="cell-mono cell-primary">{inv.number || "Borrador"}</td>
                                        <td className="cell-primary">{inv.client.name}</td>
                                        <td>
                                            <span className={`badge ${inv.type === "CREDIT_NOTE" ? "badge-danger" : "badge-primary"}`}>
                                                {inv.type === "CREDIT_NOTE" ? "Rectificativa" : "Factura"}
                                            </span>
                                        </td>
                                        <td><span className={`badge ${st.class}`}>{st.label}</span></td>
                                        <td className="cell-amount">{formatCents(inv.totalCents)}</td>
                                        <td className="cell-amount">{formatCents(inv.paidCents)}</td>
                                        <td>{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString("es-ES") : new Date(inv.createdAt).toLocaleDateString("es-ES")}</td>
                                        <td className="text-right" style={{ position: "relative" }}>
                                            <ActionsDropdown invoice={inv} onRefresh={fetchInvoices} />
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
                    <span className="bulk-count">{selected.size} seleccionada{selected.size !== 1 ? "s" : ""}</span>
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
