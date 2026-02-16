"use client";

import { useState, useEffect, useCallback } from "react";

interface Tax {
    id: string;
    name: string;
    type: string;
    rate: number;
    isDefaultSales: boolean;
    isDefaultPurchases: boolean;
    isActive: boolean;
}

const TAX_TYPES = ["IVA", "IRPF", "RECARGO_EQUIVALENCIA", "EXENTO", "INTRACOMUNITARIO"];

export default function TaxesSettingsPage() {
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editTax, setEditTax] = useState<Tax | null>(null);
    const [form, setForm] = useState({ name: "", type: "IVA", rate: "21", isDefaultSales: false, isDefaultPurchases: false });
    const [message, setMessage] = useState("");

    const fetchTaxes = useCallback(async () => {
        try {
            const res = await fetch("/api/taxes");
            const data = await res.json();
            setTaxes(data);
        } catch {
            setMessage("Error al cargar impuestos");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTaxes(); }, [fetchTaxes]);

    const openNew = () => {
        setEditTax(null);
        setForm({ name: "", type: "IVA", rate: "21", isDefaultSales: false, isDefaultPurchases: false });
        setShowModal(true);
    };

    const openEdit = (tax: Tax) => {
        setEditTax(tax);
        setForm({
            name: tax.name,
            type: tax.type,
            rate: String(tax.rate),
            isDefaultSales: tax.isDefaultSales,
            isDefaultPurchases: tax.isDefaultPurchases,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            if (editTax) {
                await fetch(`/api/taxes/${editTax.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(form),
                });
            } else {
                await fetch("/api/taxes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(form),
                });
            }
            setShowModal(false);
            setMessage("✅ Impuesto guardado");
            fetchTaxes();
        } catch {
            setMessage("❌ Error al guardar impuesto");
        }
    };

    const handleDeactivate = async (id: string) => {
        if (!confirm("¿Desactivar este impuesto?")) return;
        try {
            await fetch(`/api/taxes/${id}`, { method: "DELETE" });
            setMessage("✅ Impuesto desactivado");
            fetchTaxes();
        } catch {
            setMessage("❌ Error al desactivar");
        }
    };

    if (loading) return <p style={{ color: "var(--text-secondary)" }}>Cargando…</p>;

    const fieldStyle: React.CSSProperties = {
        width: "100%",
        padding: "10px 14px",
        borderRadius: 8,
        border: "1px solid var(--border-color, #e5e7eb)",
        fontSize: 14,
        background: "var(--bg-input, #fff)",
    };

    return (
        <div style={{ maxWidth: 720 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>Impuestos</h2>
                <button onClick={openNew} style={{
                    padding: "8px 20px",
                    background: "var(--color-primary, #1B1660)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                }}>+ Nuevo impuesto</button>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ borderBottom: "2px solid var(--border-color, #e5e7eb)" }}>
                        <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 13, color: "var(--text-secondary)" }}>Nombre</th>
                        <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 13, color: "var(--text-secondary)" }}>Tipo</th>
                        <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 13, color: "var(--text-secondary)" }}>Tasa %</th>
                        <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 13, color: "var(--text-secondary)" }}>Def. Ventas</th>
                        <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 13, color: "var(--text-secondary)" }}>Def. Compras</th>
                        <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 13, color: "var(--text-secondary)" }}>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {taxes.map((tax) => (
                        <tr key={tax.id} style={{ borderBottom: "1px solid var(--border-color, #e5e7eb)" }}>
                            <td style={{ padding: "12px", fontWeight: 600 }}>{tax.name}</td>
                            <td style={{ padding: "12px" }}>
                                <span style={{
                                    padding: "2px 8px",
                                    borderRadius: 4,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    background: tax.type === "IVA" ? "#dbeafe" : tax.type === "IRPF" ? "#fde68a" : "#e5e7eb",
                                    color: tax.type === "IVA" ? "#1d4ed8" : tax.type === "IRPF" ? "#92400e" : "#374151",
                                }}>{tax.type}</span>
                            </td>
                            <td style={{ padding: "12px", textAlign: "right", fontFamily: "monospace" }}>{Number(tax.rate).toFixed(2)}%</td>
                            <td style={{ padding: "12px", textAlign: "center" }}>{tax.isDefaultSales ? "✅" : "—"}</td>
                            <td style={{ padding: "12px", textAlign: "center" }}>{tax.isDefaultPurchases ? "✅" : "—"}</td>
                            <td style={{ padding: "12px", textAlign: "right" }}>
                                <button onClick={() => openEdit(tax)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border-color)", background: "transparent", cursor: "pointer", marginRight: 6, fontSize: 12 }}>Editar</button>
                                <button onClick={() => handleDeactivate(tax.id)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #ef4444", background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>Desactivar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {message && <p style={{ fontSize: 14, marginTop: 12 }}>{message}</p>}

            {/* Modal */}
            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div style={{ background: "var(--bg-card, #fff)", borderRadius: 12, padding: 24, width: 440, maxWidth: "90vw" }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{editTax ? "Editar impuesto" : "Nuevo impuesto"}</h3>

                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Nombre</label>
                            <input style={fieldStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="IVA 21%" />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Tipo</label>
                                <select style={fieldStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                    {TAX_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Tasa (%)</label>
                                <input style={fieldStyle} type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}>
                                <input type="checkbox" checked={form.isDefaultSales} onChange={(e) => setForm({ ...form, isDefaultSales: e.target.checked })} />
                                Por defecto ventas
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}>
                                <input type="checkbox" checked={form.isDefaultPurchases} onChange={(e) => setForm({ ...form, isDefaultPurchases: e.target.checked })} />
                                Por defecto compras
                            </label>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                            <button onClick={() => setShowModal(false)} style={{ padding: "8px 20px", border: "1px solid var(--border-color)", background: "transparent", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>Cancelar</button>
                            <button onClick={handleSave} style={{ padding: "8px 20px", background: "var(--color-primary, #1B1660)", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
