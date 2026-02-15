"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
    return (cents / 100).toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }) + " €";
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
            const res = await fetch(`/api/quotes/${quote.id}/pdf`);
            if (!res.ok) throw new Error("Error al generar PDF");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download =
                res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") ||
                "presupuesto.pdf";
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
        if (!confirm("¿Emitir presupuesto? Se asignará número definitivo.")) return;
        setLoading("emit");
        try {
            const res = await fetch(`/api/quotes/${quote.id}/emit`, { method: "POST" });
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
        if (!confirm("¿Enviar presupuesto por email al cliente?")) return;
        setLoading("send");
        try {
            const res = await fetch(`/api/quotes/${quote.id}/send`, { method: "POST" });
            if (!res.ok) throw new Error((await res.json()).error);
            alert("📧 Presupuesto enviado");
            onRefresh();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading("");
            setOpen(false);
        }
    }

    async function handleStatusChange(newStatus: string) {
        try {
            const res = await fetch(`/api/quotes/${quote.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error("Error al cambiar estado");
            onRefresh();
        } catch (err) {
            console.error(err);
        } finally {
            setOpen(false);
        }
    }

    async function handleConvert() {
        if (!confirm("¿Convertir a factura? Se creará una factura borrador.")) return;
        setLoading("convert");
        try {
            const res = await fetch(`/api/quotes/${quote.id}/convert`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            router.push(`/invoices/${data.id}`);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading("");
            setOpen(false);
        }
    }

    async function handleDelete() {
        if (!confirm("¿Eliminar este presupuesto?")) return;
        try {
            await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
            onRefresh();
        } catch (err) {
            console.error(err);
        } finally {
            setOpen(false);
        }
    }

    const isDraft = quote.status === "DRAFT";
    const isSent = quote.status === "SENT";
    const isAccepted = quote.status === "ACCEPTED";

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
                    <Link href={`/quotes/${quote.id}`} className="actions-dropdown-item">
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

                    {/* SENT */}
                    {isSent && (
                        <>
                            <button className="actions-dropdown-item" onClick={handleSendEmail}>
                                📧 Enviar email
                            </button>
                            <div className="actions-dropdown-divider" />
                            <button className="actions-dropdown-item" onClick={() => handleStatusChange("ACCEPTED")}>
                                ✅ Aceptar
                            </button>
                            <button className="actions-dropdown-item" onClick={() => handleStatusChange("REJECTED")}>
                                ❌ Rechazar
                            </button>
                        </>
                    )}

                    {/* ACCEPTED */}
                    {isAccepted && (
                        <>
                            <button className="actions-dropdown-item" onClick={handleSendEmail}>
                                📧 Enviar email
                            </button>
                            <button className="actions-dropdown-item" onClick={handleConvert}>
                                🔄 Convertir a factura
                            </button>
                        </>
                    )}
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
    const router = useRouter();

    useEffect(() => {
        fetchQuotes();
    }, [filter]);

    async function fetchQuotes() {
        setLoading(true);
        try {
            const url = filter ? `/api/quotes?status=${filter}` : "/api/quotes";
            const res = await fetch(url);
            const data = await res.json();
            setQuotes(Array.isArray(data) ? data : []);
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
                    <h1>Presupuestos</h1>
                    <p className="page-header-sub">{quotes.length} presupuestos</p>
                </div>
                <Link href="/quotes/new" className="btn btn-primary">
                    + Nuevo Presupuesto
                </Link>
            </div>

            {/* Status filter tabs */}
            <div className="flex gap-2" style={{ marginBottom: 20 }}>
                {[
                    { value: "", label: "Todos" },
                    { value: "DRAFT", label: "Borradores" },
                    { value: "SENT", label: "Enviados" },
                    { value: "ACCEPTED", label: "Aceptados" },
                    { value: "REJECTED", label: "Rechazados" },
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
                ) : quotes.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📝</div>
                        <h3>No hay presupuestos</h3>
                        <p>Crea tu primer presupuesto para empezar a trabajar</p>
                        <Link href="/quotes/new" className="btn btn-primary">
                            + Nuevo Presupuesto
                        </Link>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
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
                                return (
                                    <tr
                                        key={q.id}
                                        style={{ cursor: "pointer" }}
                                        onClick={() => router.push(`/quotes/${q.id}`)}
                                    >
                                        <td className="cell-mono cell-primary">
                                            {q.number ? `P-${q.year}-${String(q.number).padStart(4, "0")}` : "Borrador"}
                                        </td>
                                        <td className="cell-primary">{q.client.name}</td>
                                        <td>
                                            <span className={`badge ${st.class}`}>{st.label}</span>
                                        </td>
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
        </>
    );
}
