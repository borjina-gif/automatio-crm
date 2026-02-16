"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface BankAccount {
    id: string;
    name: string;
}

interface Movement {
    id: string;
    date: string;
    description: string;
    amountCents: number;
    counterpartyName: string | null;
    category: string | null;
    isReconciled: boolean;
    account: { id: string; name: string };
    linkedInvoice: { id: string; number: number | null; year: number | null } | null;
    linkedPurchaseInvoice: { id: string; number: number | null; year: number | null } | null;
}

function fmtCents(c: number) {
    return (c / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("es-ES");
}

export default function TreasuryMovementsPage() {
    const [movements, setMovements] = useState<Movement[]>([]);
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [accountFilter, setAccountFilter] = useState("");
    const [reconciledFilter, setReconciledFilter] = useState("");
    const [showModal, setShowModal] = useState(false);

    // New movement form
    const [newAccountId, setNewAccountId] = useState("");
    const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
    const [newDescription, setNewDescription] = useState("");
    const [newAmount, setNewAmount] = useState("");
    const [newIsExpense, setNewIsExpense] = useState(false);
    const [newCounterparty, setNewCounterparty] = useState("");
    const [newCategory, setNewCategory] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchMovements();
        fetchAccounts();
    }, [accountFilter, reconciledFilter]);

    async function fetchAccounts() {
        try {
            // Fetch accounts for filter/select — using summary endpoint for now
            const res = await fetch("/api/treasury/summary?from=2020-01-01&to=2030-12-31");
            const data = await res.json();
            setAccounts(data.accounts || []);
        } catch { }
    }

    async function fetchMovements() {
        setLoading(true);
        try {
            const now = new Date();
            const from = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split("T")[0];
            const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
            let url = `/api/treasury/movements?from=${from}&to=${to}`;
            if (accountFilter) url += `&accountId=${accountFilter}`;
            if (reconciledFilter) url += `&reconciled=${reconciledFilter}`;
            const res = await fetch(url);
            const data = await res.json();
            setMovements(Array.isArray(data) ? data : []);
        } catch {
        } finally {
            setLoading(false);
        }
    }

    async function handleReconcile(id: string, value: boolean) {
        try {
            await fetch(`/api/treasury/movements/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isReconciled: value }),
            });
            fetchMovements();
        } catch { }
    }

    async function handleCreateMovement() {
        if (!newAccountId || !newDescription || !newAmount) return;
        setSaving(true);
        try {
            const amountCents = Math.round(parseFloat(newAmount) * 100);
            await fetch("/api/treasury/movements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    accountId: newAccountId,
                    date: newDate,
                    description: newDescription,
                    amountCents: newIsExpense ? -amountCents : amountCents,
                    counterpartyName: newCounterparty || null,
                    category: newCategory || null,
                }),
            });
            setShowModal(false);
            setNewDescription("");
            setNewAmount("");
            setNewCounterparty("");
            setNewCategory("");
            fetchMovements();
        } catch { } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Movimientos</h1>
                    <p className="page-header-sub">{movements.length} movimientos</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        + Nuevo Movimiento
                    </button>
                    <Link href="/treasury" className="btn btn-ghost">
                        ← Volver a Tesorería
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                <select className="form-input" value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)} style={{ width: 180 }}>
                    <option value="">Todas las cuentas</option>
                    {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                </select>
                <div style={{ display: "flex", gap: 4 }}>
                    {[
                        { value: "", label: "Todos" },
                        { value: "true", label: "Conciliados" },
                        { value: "false", label: "No conciliados" },
                    ].map((f) => (
                        <button
                            key={f.value}
                            className={`btn btn-sm ${reconciledFilter === f.value ? "btn-primary" : "btn-ghost"}`}
                            onClick={() => setReconciledFilter(f.value)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="table-container">
                {loading ? (
                    <div className="loading-center"><div className="spinner" /></div>
                ) : movements.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <h3>Sin movimientos</h3>
                        <p>Añade tu primer movimiento manual</p>
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            + Nuevo Movimiento
                        </button>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Descripción</th>
                                <th>Contrapartida</th>
                                <th>Categoría</th>
                                <th className="text-right">Importe</th>
                                <th>Cuenta</th>
                                <th>Referencia</th>
                                <th>Conciliado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movements.map((m) => (
                                <tr key={m.id}>
                                    <td>{fmtDate(m.date)}</td>
                                    <td className="cell-primary">{m.description}</td>
                                    <td>{m.counterpartyName || "—"}</td>
                                    <td>{m.category || "—"}</td>
                                    <td className="text-right cell-mono" style={{
                                        color: m.amountCents >= 0 ? "var(--color-success, green)" : "var(--color-danger, red)",
                                        fontWeight: 600,
                                    }}>
                                        {m.amountCents >= 0 ? "+" : ""}{fmtCents(m.amountCents)}
                                    </td>
                                    <td>{m.account?.name || "—"}</td>
                                    <td>
                                        {m.linkedInvoice && (
                                            <Link href={`/invoices/${m.linkedInvoice.id}`} style={{ color: "var(--color-primary)" }}>
                                                F-{m.linkedInvoice.year}-{String(m.linkedInvoice.number).padStart(4, "0")}
                                            </Link>
                                        )}
                                        {m.linkedPurchaseInvoice && (
                                            <Link href={`/purchases/${m.linkedPurchaseInvoice.id}`} style={{ color: "var(--color-primary)" }}>
                                                FP-{m.linkedPurchaseInvoice.year}-{String(m.linkedPurchaseInvoice.number).padStart(4, "0")}
                                            </Link>
                                        )}
                                        {!m.linkedInvoice && !m.linkedPurchaseInvoice && "—"}
                                    </td>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={m.isReconciled}
                                            onChange={(e) => handleReconcile(m.id, e.target.checked)}
                                            style={{ cursor: "pointer", width: 18, height: 18 }}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create movement modal */}
            {showModal && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex",
                    alignItems: "center", justifyContent: "center", zIndex: 100,
                }} onClick={() => setShowModal(false)}>
                    <div className="card" style={{ width: 480, maxWidth: "90vw" }} onClick={(e) => e.stopPropagation()}>
                        <div className="card-header">
                            <h3 style={{ margin: 0 }}>Nuevo Movimiento</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div className="card-body">
                            <div className="form-group">
                                <label className="form-label">Cuenta *</label>
                                <select className="form-input" value={newAccountId} onChange={(e) => setNewAccountId(e.target.value)}>
                                    <option value="">Seleccionar cuenta...</option>
                                    {accounts.map((a) => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Fecha *</label>
                                    <input type="date" className="form-input" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Importe (€) *</label>
                                    <input type="number" className="form-input" placeholder="0.00" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} step="0.01" min="0" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                    <input type="checkbox" checked={newIsExpense} onChange={(e) => setNewIsExpense(e.target.checked)} />
                                    Es un gasto (importe negativo)
                                </label>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Descripción *</label>
                                <input type="text" className="form-input" placeholder="Concepto del movimiento" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Contrapartida</label>
                                    <input type="text" className="form-input" placeholder="Cliente/Proveedor" value={newCounterparty} onChange={(e) => setNewCounterparty(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Categoría</label>
                                    <input type="text" className="form-input" placeholder="Ej: Nóminas, Alquiler..." value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        <div style={{ padding: "0 20px 20px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleCreateMovement} disabled={saving || !newAccountId || !newDescription || !newAmount}>
                                {saving ? "Guardando..." : "Crear Movimiento"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
