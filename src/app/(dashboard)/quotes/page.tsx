"use client";

import { useEffect, useState } from "react";
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
                                <th></th>
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
                                        <td className="text-right">
                                            <Link
                                                href={`/quotes/${q.id}`}
                                                className="btn btn-ghost btn-sm"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Editar →
                                            </Link>
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
