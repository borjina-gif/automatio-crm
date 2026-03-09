"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotification } from "@/components/NotificationContext";

interface PurchaseInvoice {
    id: string;
    providerInvoiceNumber: string | null;
    year: number | null;
    number: number | null;
    status: string;
    issueDate: string | null;
    dueDate: string | null;
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
    provider: { id: string; name: string };
    createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
    DRAFT: { label: "Borrador", class: "badge-draft" },
    BOOKED: { label: "Contabilizada", class: "badge-info" },
    PAID: { label: "Pagada", class: "badge-success" },
};

const STATUS_FILTERS = [
    { value: "", label: "Todas" },
    { value: "DRAFT", label: "Borrador" },
    { value: "BOOKED", label: "Contabilizadas" },
    { value: "PAID", label: "Pagadas" },
];

function fmtDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-ES");
}

function fmtCents(c: number) {
    return (c / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function docNumber(p: PurchaseInvoice) {
    if (p.number && p.year) return `FP-${p.year}-${String(p.number).padStart(4, "0")}`;
    return "Borrador";
}

export default function PurchasesPage() {
    const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("");
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { showConfirm } = useNotification();

    const now = new Date();
    const [dateFrom, setDateFrom] = useState(`${now.getFullYear()}-01-01`);
    const [dateTo, setDateTo] = useState(`${now.getFullYear()}-12-31`);

    useEffect(() => {
        fetchPurchases();
        setSelected(new Set());
    }, [statusFilter, dateFrom, dateTo]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpenDropdown(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    async function fetchPurchases() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.set("status", statusFilter);
            if (dateFrom) params.set("from", dateFrom);
            if (dateTo) params.set("to", dateTo);
            const res = await fetch(`/api/purchases?${params}`);
            const data = await res.json();
            setPurchases(Array.isArray(data) ? data : []);
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
        if (selected.size === purchases.length) setSelected(new Set());
        else setSelected(new Set(purchases.map((p) => p.id)));
    };

    async function handleBook(id: string) {
        if (!await showConfirm("¿Contabilizar esta factura de proveedor? Se asignará un número.")) return;
        try {
            const res = await fetch(`/api/purchases/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "BOOKED" }),
            });
            if (res.ok) fetchPurchases();
        } catch { }
        setOpenDropdown(null);
    }

    async function handlePay(id: string) {
        if (!await showConfirm("¿Marcar como pagada?")) return;
        try {
            const res = await fetch(`/api/purchases/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "PAID" }),
            });
            if (res.ok) fetchPurchases();
        } catch { }
        setOpenDropdown(null);
    }

    async function handleDownloadPDF(id: string) {
        try {
            const res = await fetch(`/api/purchases/${id}/pdf`);
            if (!res.ok) throw new Error();
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "factura-proveedor.pdf";
            a.click();
            URL.revokeObjectURL(url);
        } catch { }
        setOpenDropdown(null);
    }

    async function handleDelete(id: string) {
        if (!await showConfirm("¿Eliminar esta factura de proveedor?")) return;
        try {
            const res = await fetch(`/api/purchases/${id}`, { method: "DELETE" });
            if (res.ok) fetchPurchases();
        } catch { }
        setOpenDropdown(null);
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Facturas de Proveedor</h1>
                    <p className="page-header-sub">{purchases.length} facturas de proveedor</p>
                </div>
                <Link href="/purchases/new" className="btn btn-primary">
                    + Nueva Factura Proveedor
                </Link>
            </div>

            {/* Filters */}
            <div className="filter-bar">
                {STATUS_FILTERS.map((f) => (
                    <button key={f.value} className={`btn btn-sm ${statusFilter === f.value ? "btn-primary" : "btn-secondary"}`} onClick={() => setStatusFilter(f.value)}>
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
                ) : purchases.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📦</div>
                        <h3>No hay facturas de proveedor</h3>
                        <p>Registra tu primera factura de proveedor</p>
                        <Link href="/purchases/new" className="btn btn-primary">+ Nueva Factura Proveedor</Link>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="cell-checkbox">
                                    <input type="checkbox" checked={selected.size === purchases.length && purchases.length > 0} onChange={toggleAll} />
                                </th>
                                <th>Número</th>
                                <th>Proveedor</th>
                                <th>Nº Proveedor</th>
                                <th>Fecha</th>
                                <th>Total</th>
                                <th>Estado</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchases.map((p) => {
                                const st = STATUS_LABELS[p.status] || { label: p.status, class: "badge-draft" };
                                const isSelected = selected.has(p.id);
                                return (
                                    <tr key={p.id} className={isSelected ? "row-selected" : ""} style={{ cursor: "pointer" }} onClick={() => router.push(`/purchases/${p.id}`)}>
                                        <td className="cell-checkbox" onClick={(e) => e.stopPropagation()}>
                                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(p.id)} />
                                        </td>
                                        <td className="cell-mono">{docNumber(p)}</td>
                                        <td className="cell-primary">{p.provider?.name || "—"}</td>
                                        <td className="cell-mono">{p.providerInvoiceNumber || "—"}</td>
                                        <td>{fmtDate(p.issueDate)}</td>
                                        <td className="cell-mono">{fmtCents(p.totalCents)}</td>
                                        <td><span className={`badge ${st.class}`}>{st.label}</span></td>
                                        <td className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="dropdown-container" ref={openDropdown === p.id ? dropdownRef : null}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => setOpenDropdown(openDropdown === p.id ? null : p.id)}>⋯</button>
                                                {openDropdown === p.id && (
                                                    <div className="dropdown-menu show">
                                                        <button className="dropdown-item" onClick={() => handleDownloadPDF(p.id)}>📄 Descargar PDF</button>
                                                        {p.status === "DRAFT" && <button className="dropdown-item" onClick={() => handleBook(p.id)}>✅ Contabilizar</button>}
                                                        {p.status === "BOOKED" && <button className="dropdown-item" onClick={() => handlePay(p.id)}>💰 Marcar Pagada</button>}
                                                        {p.status === "DRAFT" && <button className="dropdown-item text-danger" onClick={() => handleDelete(p.id)}>🗑️ Eliminar</button>}
                                                    </div>
                                                )}
                                            </div>
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
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelected(new Set())}>✕ Deseleccionar</button>
                </div>
            )}
        </>
    );
}
