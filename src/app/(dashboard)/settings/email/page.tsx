"use client";

import { useState } from "react";

export default function EmailSettingsPage() {
    const [to, setTo] = useState("");
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

    const smtpHost = "Configurado via env vars";

    const handleTest = async () => {
        if (!to) return;
        setSending(true);
        setResult(null);
        try {
            const res = await fetch("/api/settings/email/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to }),
            });
            const data = await res.json();
            setResult(data);
        } catch {
            setResult({ success: false, error: "Error de conexión" });
        } finally {
            setSending(false);
        }
    };

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
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Configuración Email</h2>

            {/* Status card */}
            <div style={{
                background: "var(--bg-card, #fff)",
                border: "1px solid var(--border-color, #e5e7eb)",
                borderRadius: 12,
                padding: 20,
                marginBottom: 24,
            }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Estado SMTP</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Host</span>
                        <p style={{ fontSize: 14, fontWeight: 500 }}>{smtpHost}</p>
                    </div>
                    <div>
                        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Puerto</span>
                        <p style={{ fontSize: 14, fontWeight: 500 }}>587 (por defecto)</p>
                    </div>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 12 }}>
                    Las credenciales SMTP se configuran mediante variables de entorno: <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code>, <code>SMTP_FROM</code>
                </p>
            </div>

            {/* Test email */}
            <div style={{
                background: "var(--bg-card, #fff)",
                border: "1px solid var(--border-color, #e5e7eb)",
                borderRadius: 12,
                padding: 20,
            }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Enviar email de prueba</h3>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                    <input
                        style={{ ...fieldStyle, flex: 1 }}
                        type="email"
                        placeholder="destinatario@ejemplo.com"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                    />
                    <button
                        onClick={handleTest}
                        disabled={sending || !to}
                        style={{
                            padding: "10px 24px",
                            background: "var(--color-primary, #1B1660)",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: sending ? "wait" : "pointer",
                            opacity: sending || !to ? 0.7 : 1,
                            whiteSpace: "nowrap",
                        }}
                    >
                        {sending ? "Enviando…" : "Enviar prueba"}
                    </button>
                </div>

                {result && (
                    <div style={{
                        padding: "12px 16px",
                        borderRadius: 8,
                        background: result.success ? "#dcfce7" : "#fef2f2",
                        border: `1px solid ${result.success ? "#86efac" : "#fca5a5"}`,
                        color: result.success ? "#166534" : "#991b1b",
                        fontSize: 14,
                    }}>
                        {result.success ? `✅ ${result.message}` : `❌ ${result.error}`}
                    </div>
                )}
            </div>
        </div>
    );
}
