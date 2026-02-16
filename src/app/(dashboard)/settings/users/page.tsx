"use client";
import { useState, useEffect, useCallback } from "react";

interface User { id: string; email: string; name: string; role: string; isActive: boolean; lastLoginAt: string | null; createdAt: string }

export default function UsersSettingsPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showResetModal, setShowResetModal] = useState<string | null>(null);
    const [form, setForm] = useState({ email: "", password: "", name: "", role: "USER" });
    const [resetPassword, setResetPassword] = useState("");
    const [message, setMessage] = useState("");

    const fetchUsers = useCallback(async () => {
        try {
            const res = await fetch("/api/settings/users");
            if (res.status === 403) { setMessage("⚠️ Solo administradores"); setLoading(false); return; }
            setUsers(await res.json());
        } catch { setMessage("Error al cargar usuarios"); } finally { setLoading(false); }
    }, []);
    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleCreate = async () => {
        if (!form.email || !form.password) { setMessage("❌ Email y contraseña requeridos"); return; }
        const res = await fetch("/api/settings/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        const data = await res.json();
        if (res.ok) { setShowModal(false); setForm({ email: "", password: "", name: "", role: "USER" }); setMessage("✅ Usuario creado"); fetchUsers(); }
        else setMessage(`❌ ${data.error}`);
    };

    const toggleActive = async (u: User) => {
        await fetch(`/api/settings/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !u.isActive }) });
        fetchUsers();
    };

    const handleResetPassword = async () => {
        if (!showResetModal || !resetPassword) return;
        const res = await fetch(`/api/settings/users/${showResetModal}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword: resetPassword }) });
        if (res.ok) { setShowResetModal(null); setResetPassword(""); setMessage("✅ Contraseña reseteada"); } else { const d = await res.json(); setMessage(`❌ ${d.error}`); }
    };

    if (loading) return <p style={{ color: "var(--text-secondary)" }}>Cargando…</p>;

    const f: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color, #e5e7eb)", fontSize: 14, background: "var(--bg-input, #fff)" };
    const btn: React.CSSProperties = { padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border-color)", background: "transparent", cursor: "pointer", fontSize: 12, marginRight: 6 };

    return (
        <div style={{ maxWidth: 720 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>Usuarios</h2>
                <button onClick={() => setShowModal(true)} style={{ padding: "8px 20px", background: "var(--color-primary, #1B1660)", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>+ Nuevo usuario</button>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ borderBottom: "2px solid var(--border-color, #e5e7eb)" }}>
                    {["Nombre", "Email", "Rol", "Estado", "Último login", "Acciones"].map(h => <th key={h} style={{ textAlign: h === "Acciones" ? "right" : "left", padding: "10px 12px", fontSize: 13, color: "var(--text-secondary)" }}>{h}</th>)}
                </tr></thead>
                <tbody>{users.map(u => (
                    <tr key={u.id} style={{ borderBottom: "1px solid var(--border-color, #e5e7eb)", opacity: u.isActive ? 1 : 0.5 }}>
                        <td style={{ padding: 12, fontWeight: 600 }}>{u.name || "—"}</td>
                        <td style={{ padding: 12 }}>{u.email}</td>
                        <td style={{ padding: 12 }}><span style={{ padding: "2px 10px", borderRadius: 4, fontSize: 12, fontWeight: 600, background: u.role === "ADMIN" ? "#dbeafe" : "#e5e7eb", color: u.role === "ADMIN" ? "#1d4ed8" : "#374151" }}>{u.role}</span></td>
                        <td style={{ padding: 12 }}>{u.isActive ? "🟢 Activo" : "🔴 Inactivo"}</td>
                        <td style={{ padding: 12, fontSize: 13, color: "var(--text-secondary)" }}>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("es-ES") : "Nunca"}</td>
                        <td style={{ padding: 12, textAlign: "right" }}>
                            <button onClick={() => toggleActive(u)} style={btn}>{u.isActive ? "Desactivar" : "Activar"}</button>
                            <button onClick={() => { setShowResetModal(u.id); setResetPassword(""); }} style={{ ...btn, borderColor: "#f59e0b", color: "#f59e0b" }}>Reset pass</button>
                        </td>
                    </tr>
                ))}</tbody>
            </table>
            {message && <p style={{ fontSize: 14, marginTop: 12 }}>{message}</p>}

            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div style={{ background: "var(--bg-card, #fff)", borderRadius: 12, padding: 24, width: 420 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Nuevo usuario</h3>
                        {[{ l: "Nombre", k: "name", t: "text" }, { l: "Email *", k: "email", t: "email" }, { l: "Contraseña *", k: "password", t: "password" }].map(({ l, k, t }) => (
                            <div key={k} style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>{l}</label>
                                <input style={f} type={t} value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} />
                            </div>
                        ))}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Rol</label>
                            <select style={f} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                <option value="USER">STAFF</option><option value="ADMIN">ADMIN</option>
                            </select>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                            <button onClick={() => setShowModal(false)} style={{ padding: "8px 20px", border: "1px solid var(--border-color)", background: "transparent", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>Cancelar</button>
                            <button onClick={handleCreate} style={{ padding: "8px 20px", background: "var(--color-primary, #1B1660)", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Crear</button>
                        </div>
                    </div>
                </div>
            )}

            {showResetModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div style={{ background: "var(--bg-card, #fff)", borderRadius: 12, padding: 24, width: 380 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Resetear contraseña</h3>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Nueva contraseña</label>
                            <input style={f} type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                            <button onClick={() => setShowResetModal(null)} style={{ padding: "8px 20px", border: "1px solid var(--border-color)", background: "transparent", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>Cancelar</button>
                            <button onClick={handleResetPassword} style={{ padding: "8px 20px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Resetear</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
