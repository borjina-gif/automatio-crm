"use client";

import { useEffect, useState } from "react";
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
                        <p>Las facturas se generan a partir de presupuestos aceptados</p>
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
                                <th></th>
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
                                            {inv.number
                                                ? `${inv.type === "CREDIT_NOTE" ? "R" : "F"}-${inv.year}-${String(inv.number).padStart(4, "0")}`
                                                : "Borrador"}
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
                                        <td className="text-right">
                                            <Link
                                                href={`/invoices/${inv.id}`}
                                                className="btn btn-ghost btn-sm"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Ver →
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
