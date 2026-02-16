"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Provider {
    id: string;
    name: string;
}

interface Tax {
    id: string;
    name: string;
    rate: number;
}

interface LineItem {
    key: string;
    description: string;
    quantity: string;
    unitPriceCents: string;
    taxId: string;
    taxRate: number;
}

function newLine(): LineItem {
    return {
        key: crypto.randomUUID(),
        description: "",
        quantity: "1",
        unitPriceCents: "0",
        taxId: "",
        taxRate: 0,
    };
}

function LineItemEditor({
    line,
    taxes,
    updateLine,
    removeLine,
}: {
    line: LineItem;
    taxes: Tax[];
    updateLine: (key: string, field: string, value: string) => void;
    removeLine: (key: string) => void;
}) {
    const qty = parseFloat(line.quantity) || 0;
    const unit = parseInt(line.unitPriceCents) || 0;
    const sub = Math.round(qty * unit);
    const tax = Math.round(sub * line.taxRate / 100);
    const total = sub + tax;

    return (
        <div className="line-row" key={line.key}>
            <input
                className="line-input line-input-desc"
                placeholder="Descripción"
                value={line.description}
                onChange={(e) => updateLine(line.key, "description", e.target.value)}
            />
            <input
                className="line-input line-input-sm"
                type="number"
                placeholder="Ud."
                value={line.quantity}
                onChange={(e) => updateLine(line.key, "quantity", e.target.value)}
                min="0"
                step="1"
            />
            <input
                className="line-input line-input-sm"
                type="number"
                placeholder="Precio (cts)"
                value={line.unitPriceCents}
                onChange={(e) => updateLine(line.key, "unitPriceCents", e.target.value)}
                min="0"
            />
            <select
                className="line-input"
                value={line.taxId}
                onChange={(e) => updateLine(line.key, "taxId", e.target.value)}
            >
                <option value="">Sin IVA</option>
                {taxes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                ))}
            </select>
            <span className="line-total">{(total / 100).toFixed(2)} €</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeLine(line.key)}>✕</button>
        </div>
    );
}

export default function NewPurchasePage() {
    const router = useRouter();
    const [providers, setProviders] = useState<Provider[]>([]);
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [providerId, setProviderId] = useState("");
    const [providerInvoiceNumber, setProviderInvoiceNumber] = useState("");
    const [issueDate, setIssueDate] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [notes, setNotes] = useState("");
    const [lines, setLines] = useState<LineItem[]>([newLine()]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("/api/providers").then((r) => r.json()).then((d) => setProviders(Array.isArray(d) ? d : []));
        fetch("/api/taxes").then((r) => r.json()).then((d) => setTaxes(Array.isArray(d) ? d : []));
    }, []);

    function updateLine(key: string, field: string, value: string) {
        setLines((prev) =>
            prev.map((l) => {
                if (l.key !== key) return l;
                const updated = { ...l, [field]: value };
                if (field === "taxId") {
                    const foundTax = taxes.find((t) => t.id === value);
                    updated.taxRate = foundTax?.rate || 0;
                }
                return updated;
            })
        );
    }

    function removeLine(key: string) {
        setLines((prev) => prev.filter((l) => l.key !== key));
    }

    // Calculate totals
    const subtotalCents = lines.reduce((sum, l) => {
        const qty = parseFloat(l.quantity) || 0;
        const unit = parseInt(l.unitPriceCents) || 0;
        return sum + Math.round(qty * unit);
    }, 0);

    const taxCents = lines.reduce((sum, l) => {
        const qty = parseFloat(l.quantity) || 0;
        const unit = parseInt(l.unitPriceCents) || 0;
        const sub = Math.round(qty * unit);
        return sum + Math.round(sub * l.taxRate / 100);
    }, 0);

    const totalCents = subtotalCents + taxCents;

    async function handleSave() {
        if (!providerId) {
            setError("Selecciona un proveedor");
            return;
        }
        if (lines.length === 0 || !lines.some((l) => l.description.trim())) {
            setError("Añade al menos una línea con descripción");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const res = await fetch("/api/purchases", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    providerId,
                    providerInvoiceNumber: providerInvoiceNumber || null,
                    issueDate: issueDate || null,
                    dueDate: dueDate || null,
                    notes: notes || null,
                    lines: lines.map((l) => ({
                        description: l.description,
                        quantity: l.quantity,
                        unitPriceCents: l.unitPriceCents,
                        taxId: l.taxId || null,
                        taxRate: l.taxRate,
                    })),
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Error al crear");
            }

            const purchase = await res.json();
            router.push(`/purchases/${purchase.id}`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Nueva Factura de Proveedor</h1>
                    <p className="page-header-sub">Registra una factura recibida de un proveedor</p>
                </div>
                <Link href="/purchases" className="btn btn-secondary">
                    ← Volver
                </Link>
            </div>

            {error && (
                <div className="toast toast-error" style={{ position: "static", marginBottom: 16 }}>
                    {error}
                </div>
            )}

            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-body">
                    <div className="form-row">
                        <div className="form-group" style={{ flex: 2 }}>
                            <label className="form-label">Proveedor *</label>
                            <select
                                className="form-input"
                                value={providerId}
                                onChange={(e) => setProviderId(e.target.value)}
                            >
                                <option value="">Seleccionar proveedor...</option>
                                {providers.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nº Factura Proveedor</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Ej: FA-2024-001"
                                value={providerInvoiceNumber}
                                onChange={(e) => setProviderInvoiceNumber(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Fecha Factura</label>
                            <input
                                type="date"
                                className="form-input"
                                value={issueDate}
                                onChange={(e) => setIssueDate(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Fecha Vencimiento</label>
                            <input
                                type="date"
                                className="form-input"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Lines */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header">
                    <h3 style={{ margin: 0 }}>Líneas</h3>
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setLines([...lines, newLine()])}
                    >
                        + Añadir línea
                    </button>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                    <div className="lines-header">
                        <span className="line-input-desc">Descripción</span>
                        <span className="line-input-sm">Uds</span>
                        <span className="line-input-sm">Precio (cts)</span>
                        <span>IVA</span>
                        <span className="line-total">Total</span>
                        <span style={{ width: 30 }}></span>
                    </div>
                    {lines.map((line) => (
                        <LineItemEditor
                            key={line.key}
                            line={line}
                            taxes={taxes}
                            updateLine={updateLine}
                            removeLine={removeLine}
                        />
                    ))}
                </div>
            </div>

            {/* Totals */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-body">
                    <div className="totals-grid">
                        <div className="totals-row">
                            <span>Base imponible</span>
                            <span className="cell-mono">{(subtotalCents / 100).toFixed(2)} €</span>
                        </div>
                        <div className="totals-row">
                            <span>IVA</span>
                            <span className="cell-mono">{(taxCents / 100).toFixed(2)} €</span>
                        </div>
                        <div className="totals-row totals-total">
                            <span>Total</span>
                            <span className="cell-mono">{(totalCents / 100).toFixed(2)} €</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notes */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-body">
                    <div className="form-group">
                        <label className="form-label">Notas internas</label>
                        <textarea
                            className="form-textarea"
                            placeholder="Notas sobre esta factura..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="form-actions">
                <button
                    className="btn btn-primary btn-lg"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? "Guardando..." : "Guardar Borrador"}
                </button>
                <Link href="/purchases" className="btn btn-secondary">
                    Cancelar
                </Link>
            </div>
        </>
    );
}
