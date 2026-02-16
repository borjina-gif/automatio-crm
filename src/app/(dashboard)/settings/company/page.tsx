"use client";

import { useState, useEffect, useCallback } from "react";

interface Company {
    id: string;
    legalName: string;
    tradeName: string | null;
    taxId: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    postalCode: string | null;
    province: string | null;
    country: string;
    email: string | null;
    phone: string | null;
    bankIban: string | null;
}

export default function CompanySettingsPage() {
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    const fetchCompany = useCallback(async () => {
        try {
            const res = await fetch("/api/settings/company");
            const data = await res.json();
            setCompany(data);
        } catch {
            setMessage("Error al cargar datos de empresa");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCompany(); }, [fetchCompany]);

    const handleChange = (field: keyof Company, value: string) => {
        if (!company) return;
        setCompany({ ...company, [field]: value });
    };

    const handleSave = async () => {
        if (!company) return;
        setSaving(true);
        setMessage("");
        try {
            const res = await fetch("/api/settings/company", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(company),
            });
            if (res.ok) {
                setMessage("✅ Empresa guardada correctamente");
            } else {
                setMessage("❌ Error al guardar");
            }
        } catch {
            setMessage("❌ Error de conexión");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p style={{ color: "var(--text-secondary)" }}>Cargando…</p>;
    if (!company) return <p>No se encontró empresa</p>;

    const fieldStyle: React.CSSProperties = {
        width: "100%",
        padding: "10px 14px",
        borderRadius: 8,
        border: "1px solid var(--border-color, #e5e7eb)",
        fontSize: 14,
        background: "var(--bg-input, #fff)",
        color: "var(--text-primary, #333)",
    };

    const labelStyle: React.CSSProperties = {
        fontSize: 13,
        fontWeight: 600,
        color: "var(--text-secondary, #666)",
        marginBottom: 4,
        display: "block",
    };

    const groupStyle: React.CSSProperties = {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
        marginBottom: 20,
    };

    return (
        <div style={{ maxWidth: 720 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Datos de empresa</h2>

            <div style={groupStyle}>
                <div>
                    <label style={labelStyle}>Razón social *</label>
                    <input style={fieldStyle} value={company.legalName} onChange={(e) => handleChange("legalName", e.target.value)} />
                </div>
                <div>
                    <label style={labelStyle}>Nombre comercial</label>
                    <input style={fieldStyle} value={company.tradeName || ""} onChange={(e) => handleChange("tradeName", e.target.value)} />
                </div>
            </div>

            <div style={groupStyle}>
                <div>
                    <label style={labelStyle}>NIF / CIF</label>
                    <input style={fieldStyle} value={company.taxId || ""} onChange={(e) => handleChange("taxId", e.target.value)} />
                </div>
                <div>
                    <label style={labelStyle}>País</label>
                    <input style={fieldStyle} value={company.country} onChange={(e) => handleChange("country", e.target.value)} />
                </div>
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, marginTop: 8 }}>Dirección fiscal</h3>
            <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Dirección línea 1</label>
                <input style={fieldStyle} value={company.addressLine1 || ""} onChange={(e) => handleChange("addressLine1", e.target.value)} />
            </div>
            <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Dirección línea 2</label>
                <input style={fieldStyle} value={company.addressLine2 || ""} onChange={(e) => handleChange("addressLine2", e.target.value)} />
            </div>
            <div style={groupStyle}>
                <div>
                    <label style={labelStyle}>Ciudad</label>
                    <input style={fieldStyle} value={company.city || ""} onChange={(e) => handleChange("city", e.target.value)} />
                </div>
                <div>
                    <label style={labelStyle}>Código postal</label>
                    <input style={fieldStyle} value={company.postalCode || ""} onChange={(e) => handleChange("postalCode", e.target.value)} />
                </div>
            </div>
            <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Provincia</label>
                <input style={fieldStyle} value={company.province || ""} onChange={(e) => handleChange("province", e.target.value)} />
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, marginTop: 8 }}>Contacto</h3>
            <div style={groupStyle}>
                <div>
                    <label style={labelStyle}>Email</label>
                    <input style={fieldStyle} type="email" value={company.email || ""} onChange={(e) => handleChange("email", e.target.value)} />
                </div>
                <div>
                    <label style={labelStyle}>Teléfono</label>
                    <input style={fieldStyle} value={company.phone || ""} onChange={(e) => handleChange("phone", e.target.value)} />
                </div>
            </div>

            <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>IBAN</label>
                <input style={fieldStyle} value={company.bankIban || ""} onChange={(e) => handleChange("bankIban", e.target.value)} placeholder="ESXX XXXX XXXX XXXX XXXX XXXX" />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: "10px 28px",
                        background: "var(--color-primary, #1B1660)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: saving ? "wait" : "pointer",
                        opacity: saving ? 0.7 : 1,
                    }}
                >
                    {saving ? "Guardando…" : "Guardar cambios"}
                </button>
                {message && <span style={{ fontSize: 14 }}>{message}</span>}
            </div>
        </div>
    );
}
