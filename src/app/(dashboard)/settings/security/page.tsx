"use client";
import { useState } from "react";

export default function SecuritySettingsPage() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    const handleChange = async () => {
        if (!currentPassword || !newPassword) { setMessage("❌ Todos los campos son requeridos"); return; }
        if (newPassword !== confirmPassword) { setMessage("❌ Las contraseñas no coinciden"); return; }
        if (newPassword.length < 6) { setMessage("❌ Mínimo 6 caracteres"); return; }
        setSaving(true); setMessage("");
        try {
            const res = await fetch("/api/settings/security/password", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json();
            if (res.ok) { setMessage("✅ Contraseña cambiada"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
            else setMessage(`❌ ${data.error}`);
        } catch { setMessage("❌ Error de conexión"); } finally { setSaving(false); }
    };

    const f: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 14, background: "var(--color-surface)", color: "var(--color-text)" };

    return (
        <div style={{ maxWidth: 520 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Seguridad</h2>

            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Cambiar contraseña</h3>
                {[
                    { l: "Contraseña actual", v: currentPassword, s: setCurrentPassword },
                    { l: "Nueva contraseña", v: newPassword, s: setNewPassword },
                    { l: "Confirmar nueva contraseña", v: confirmPassword, s: setConfirmPassword },
                ].map(({ l, v, s }) => (
                    <div key={l} style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4, color: "var(--color-text-secondary)" }}>{l}</label>
                        <input style={f} type="password" value={v} onChange={e => s(e.target.value)} />
                    </div>
                ))}
                <button onClick={handleChange} disabled={saving} style={{
                    padding: "10px 28px", background: "var(--color-primary, #1B1660)", color: "#fff",
                    border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? "wait" : "pointer",
                    opacity: saving ? 0.7 : 1, marginTop: 4,
                }}>{saving ? "Guardando…" : "Cambiar contraseña"}</button>
                {message && <p style={{ fontSize: 14, marginTop: 12 }}>{message}</p>}
            </div>

            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Seguridad de sesión</h3>
                <div style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
                    <p style={{ marginBottom: 8 }}>🔒 Cookie <code>auth_token</code> configurada con:</p>
                    <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
                        <li><strong>HttpOnly</strong> — No accesible desde JavaScript</li>
                        <li><strong>Secure</strong> — Solo HTTPS en producción</li>
                        <li><strong>SameSite=Strict</strong> — Protección CSRF</li>
                        <li><strong>Expiración</strong> — 24 horas</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
