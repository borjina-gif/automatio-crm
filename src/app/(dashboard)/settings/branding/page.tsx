"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Branding {
    id: string;
    logoBase64: string | null;
    darkLogoBase64: string | null;
    appName: string | null;
    primaryColor: string;
    footerText: string | null;
}

export default function BrandingSettingsPage() {
    const [branding, setBranding] = useState<Branding | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchBranding = useCallback(async () => {
        try {
            const res = await fetch("/api/settings/branding");
            const data = await res.json();
            setBranding(data);
        } catch {
            setMessage("Error al cargar branding");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchBranding(); }, [fetchBranding]);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !branding) return;
        if (file.size > 2 * 1024 * 1024) {
            setMessage("❌ El archivo no debe superar 2MB");
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            setBranding({ ...branding, logoBase64: ev.target?.result as string });
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!branding) return;
        setSaving(true);
        setMessage("");
        try {
            const res = await fetch("/api/settings/branding", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    logoBase64: branding.logoBase64,
                    appName: branding.appName,
                    primaryColor: branding.primaryColor,
                    footerText: branding.footerText,
                }),
            });
            if (res.ok) {
                setMessage("✅ Branding guardado");
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
    if (!branding) return <p>Error al cargar branding</p>;

    const fieldStyle: React.CSSProperties = {
        width: "100%",
        padding: "10px 14px",
        borderRadius: 8,
        border: "1px solid var(--border-color, #e5e7eb)",
        fontSize: 14,
        background: "var(--bg-input, #fff)",
    };

    const labelStyle: React.CSSProperties = {
        fontSize: 13,
        fontWeight: 600,
        color: "var(--text-secondary, #666)",
        marginBottom: 4,
        display: "block",
    };

    return (
        <div style={{ maxWidth: 720 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Marca y personalización</h2>

            {/* Logo */}
            <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Logo de empresa</label>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    padding: 20,
                    border: "2px dashed var(--border-color, #e5e7eb)",
                    borderRadius: 12,
                    background: "var(--bg-card, #fafafa)",
                }}>
                    {branding.logoBase64 ? (
                        <img src={branding.logoBase64} alt="Logo" style={{ maxHeight: 80, maxWidth: 200, objectFit: "contain" }} />
                    ) : (
                        <div style={{
                            width: 80,
                            height: 80,
                            borderRadius: 12,
                            background: branding.primaryColor,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: 28,
                            fontWeight: 700,
                        }}>
                            {(branding.appName || "A").charAt(0)}
                        </div>
                    )}
                    <div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                padding: "8px 16px",
                                border: "1px solid var(--border-color)",
                                background: "transparent",
                                borderRadius: 8,
                                cursor: "pointer",
                                fontSize: 13,
                                fontWeight: 600,
                            }}
                        >
                            Subir logo
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/png,image/svg+xml,image/jpeg" onChange={handleLogoUpload} style={{ display: "none" }} />
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>PNG, SVG o JPG. Máximo 2MB.</p>
                    </div>
                </div>
            </div>

            {/* App name */}
            <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Nombre de la aplicación</label>
                <input
                    style={fieldStyle}
                    value={branding.appName || ""}
                    onChange={(e) => setBranding({ ...branding, appName: e.target.value })}
                    placeholder="Automatio CRM"
                />
            </div>

            {/* Primary color */}
            <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Color principal</label>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <input
                        type="color"
                        value={branding.primaryColor}
                        onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                        style={{ width: 48, height: 40, border: "none", cursor: "pointer", borderRadius: 8 }}
                    />
                    <input
                        style={{ ...fieldStyle, width: 140 }}
                        value={branding.primaryColor}
                        onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                    />
                    <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: branding.primaryColor,
                    }} />
                </div>
            </div>

            {/* Footer */}
            <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Texto legal (pie de factura/presupuesto)</label>
                <textarea
                    style={{ ...fieldStyle, minHeight: 80, resize: "vertical" }}
                    value={branding.footerText || ""}
                    onChange={(e) => setBranding({ ...branding, footerText: e.target.value })}
                    placeholder="Texto legal que aparecerá en el pie de los documentos…"
                />
            </div>

            {/* Preview */}
            <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Vista previa</label>
                <div style={{
                    border: "1px solid var(--border-color, #e5e7eb)",
                    borderRadius: 12,
                    overflow: "hidden",
                }}>
                    <div style={{
                        background: branding.primaryColor,
                        padding: "16px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                    }}>
                        {branding.logoBase64 ? (
                            <img src={branding.logoBase64} alt="" style={{ height: 32, objectFit: "contain" }} />
                        ) : null}
                        <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>
                            {branding.appName || "Automatio CRM"}
                        </span>
                    </div>
                    <div style={{ padding: 20, background: "#f9fafb" }}>
                        <p style={{ fontSize: 13, color: "#666" }}>
                            Así se verá la cabecera en sidebar, login y PDFs.
                        </p>
                        {branding.footerText && (
                            <p style={{ fontSize: 11, color: "#999", marginTop: 12, borderTop: "1px solid #e5e7eb", paddingTop: 8 }}>
                                {branding.footerText}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: "10px 28px",
                        background: branding.primaryColor,
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: saving ? "wait" : "pointer",
                        opacity: saving ? 0.7 : 1,
                    }}
                >
                    {saving ? "Guardando…" : "Guardar branding"}
                </button>
                {message && <span style={{ fontSize: 14 }}>{message}</span>}
            </div>
        </div>
    );
}
