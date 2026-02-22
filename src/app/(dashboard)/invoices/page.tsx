"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface InvoiceItem {
    id: string;
    year: number | null;
    number: number | null;
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

    // Close on click outside
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
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
            a.download =
                res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") ||
                "factura.pdf";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading("");
            setOpen(false);
        }
    }

    async function handleEmit() {
        if (!confirm("¿Emitir factura? Se asignará número definitivo.")) return;
        setLoading("emit");
        try {
            const res = await fetch(`/api/invoices/${invoice.id}/emit`, { method: "POST" });
            if (!res.ok) throw new Error((await res.json()).error);
            onRefresh();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading("");
            setOpen(false);
        }
    }

    async function handleSendEmail() {
        if (!confirm("¿Enviar factura por email al cliente?")) return;
        setLoading("send");
        try {
            const res = await fetch(`/api/invoices/${invoice.id}/send`, { method: "POST" });
            if (!res.ok) throw new Error((await res.json()).error);
            alert("📧 Factura enviada");
            onRefresh();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading("");
            setOpen(false);
        }
    }

    async function handleDelete() {
        if (!confirm("¿Eliminar esta factura?")) return;
        try {
            const res = await fetch(`/api/invoices/${invoice.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Error al eliminar");
            onRefresh();
        } catch (err) {
            console.error(err);
        } finally {
            setOpen(false);
        }
    }

    const isDraft = invoice.status === "DRAFT";
    const isIssued = invoice.status === "ISSUED";

    return (
        <div className="actions-dropdown" ref={ref}>
            <button
                className="btn btn-ghost btn-sm actions-dropdown-trigger"
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen(!open);
                }}
                disabled={!!loading}
            >
                {loading ? <span className="spinner-sm" /> : "⋯"}
            </button>
            {open && (
                <div className="actions-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                    {/* Always: Ver detalle */}
                    <Link href={`/invoices/${invoice.id}`} className="actions-dropdown-item">
                        👁️ Ver detalle
                    </Link>

                    {/* Always: PDF */}
                    <button className="actions-dropdown-item" onClick={handleDownloadPDF}>
                        📄 Descargar PDF
                    </button>

                    <div className="actions-dropdown-divider" />

                    {/* DRAFT */}
                    {isDraft && (
                        <>
                            <button className="actions-dropdown-item" onClick={handleEmit}>
                                📋 Emitir
                            </button>
                            <div className="actions-dropdown-divider" />
                            <button className="actions-dropdown-item actions-dropdown-danger" onClick={handleDelete}>
                                🗑️ Eliminar
                            </button>
                        </>
                    )}

                    {/* ISSUED */}
                    {isIssued && (
                        <button className="actions-dropdown-item" onClick={handleSendEmail}>
                            📧 Enviar email
                        </button>
                    )}
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
    const router = useRouter();

    useEffect(() => {
        fetchInvoices();
    }, [filter]);

    async function fetchInvoices() {
        setLoading(true);
        try {
            const url = filter ? `/api/invoices?status=${filter}` : "/api/invoices";
            const res = await fetch(url);
            const data = await res.json();
            setInvoices(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Facturas</h1>
                    <p className="page-header-sub">{invoices.length} facturas</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/invoices/recurring" className="btn btn-secondary">
                        🔄 Recurrentes
                    </Link>
                    <Link href="/invoices/new" className="btn btn-primary">
                        + Nueva factura
                    </Link>
                </div>
            </div>

            {/* Status filter tabs */}
            <div className="flex gap-2" style={{ marginBottom: 20 }}>
                {[
                    { value: "", label: "Todas" },
                    { value: "DRAFT", label: "Borradores" },
                    { value: "ISSUED", label: "Emitidas" },
                    { value: "PAID", label: "Pagadas" },
                    { value: "VOID", label: "Anuladas" },
                ].map((f) => (
                    <button
                        key={f.value}
                        className={`btn ${filter === f.value ? "btn-primary" : "btn-secondary"} btn-sm`}
                        onClick={() => setFilter(f.value)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="table-container">
                {loading ? (
                    <div className="loading-center"><div className="spinner" /></div>
                ) : invoices.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📄</div>
                        <h3>No hay facturas</h3>
                        <p>Crea una factura directamente o conviértelas desde presupuestos</p>
                        <Link href="/invoices/new" className="btn btn-primary" style={{ marginTop: 12 }}>
                            + Nueva factura
                        </Link>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
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
                                return (
                                    <tr
                                        key={inv.id}
                                        style={{ cursor: "pointer" }}
                                        onClick={() => router.push(`/invoices/${inv.id}`)}
                                    >
                                        <td className="cell-mono cell-primary">
                                            {inv.number || "Borrador"}
                                        </td>
                                        <td className="cell-primary">{inv.client.name}</td>
                                        <td>
                                            <span className={`badge ${inv.type === "CREDIT_NOTE" ? "badge-danger" : "badge-primary"}`}>
                                                {inv.type === "CREDIT_NOTE" ? "Rectificativa" : "Factura"}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${st.class}`}>{st.label}</span>
                                        </td>
                                        <td className="cell-amount">{formatCents(inv.totalCents)}</td>
                                        <td className="cell-amount">{formatCents(inv.paidCents)}</td>
                                        <td>
                                            {inv.issueDate
                                                ? new Date(inv.issueDate).toLocaleDateString("es-ES")
                                                : new Date(inv.createdAt).toLocaleDateString("es-ES")}
                                        </td>
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
        </>
    );
}
