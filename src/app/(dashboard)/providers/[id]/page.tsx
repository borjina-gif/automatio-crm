"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Provider {
    id: string;
    name: string;
    taxId: string | null;
    email: string | null;
    phone: string | null;
    addressLine1: string | null;
    city: string | null;
    postalCode: string | null;
    province: string | null;
    country: string | null;
    paymentTermsDays: number;
    notes: string | null;
    createdAt: string;
}

export default function ProviderDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [provider, setProvider] = useState<Provider | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchProvider();
    }, [id]);

    async function fetchProvider() {
        try {
            const res = await fetch(`/api/providers/${id}`);
            if (!res.ok) throw new Error("Proveedor no encontrado");
            const data = await res.json();
            setProvider(data);
        } catch (err) {
            setError("Proveedor no encontrado");
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        setError("");

        const form = new FormData(e.currentTarget);
        const data = Object.fromEntries(form.entries());

        try {
            const res = await fetch(`/api/providers/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Error al actualizar");
            }

            const updated = await res.json();
            setProvider(updated);
            setEditing(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!confirm("¿Estás seguro de que quieres eliminar este proveedor?")) return;

        try {
            const res = await fetch(`/api/providers/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Error al eliminar");
            router.push("/providers");
        } catch (err: any) {
            setError(err.message);
        }
    }

    if (loading) {
        return (
            <div className="loading-center">
                <div className="spinner" />
            </div>
        );
    }

    if (!provider) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <h3>Proveedor no encontrado</h3>
                <Link href="/providers" className="btn btn-primary mt-4">
                    ← Volver a proveedores
                </Link>
            </div>
        );
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>{provider.name}</h1>
                    <p className="page-header-sub">
                        {provider.taxId || "Sin NIF"} · {provider.email || "Sin email"}
                    </p>
                </div>
                <div className="flex gap-2">
                    {!editing && (
                        <>
                            <button
                                onClick={() => setEditing(true)}
                                className="btn btn-secondary"
                            >
                                ✏️ Editar
                            </button>
                            <button onClick={handleDelete} className="btn btn-danger">
                                🗑️ Eliminar
                            </button>
                        </>
                    )}
                    <Link href="/providers" className="btn btn-ghost">
                        ← Volver
                    </Link>
                </div>
            </div>

            {error && (
                <div className="toast toast-error" style={{ position: "static", marginBottom: 16 }}>
                    {error}
                </div>
            )}

            <div className="card">
                <div className="card-body">
                    {editing ? (
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Nombre / Razón social *</label>
                                    <input
                                        name="name"
                                        type="text"
                                        className="form-input"
                                        defaultValue={provider.name}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">NIF / CIF</label>
                                    <input
                                        name="taxId"
                                        type="text"
                                        className="form-input"
                                        defaultValue={provider.taxId || ""}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input
                                        name="email"
                                        type="email"
                                        className="form-input"
                                        defaultValue={provider.email || ""}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Teléfono</label>
                                    <input
                                        name="phone"
                                        type="text"
                                        className="form-input"
                                        defaultValue={provider.phone || ""}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Dirección</label>
                                <input
                                    name="addressLine1"
                                    type="text"
                                    className="form-input"
                                    defaultValue={provider.addressLine1 || ""}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Ciudad</label>
                                    <input
                                        name="city"
                                        type="text"
                                        className="form-input"
                                        defaultValue={provider.city || ""}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Código Postal</label>
                                    <input
                                        name="postalCode"
                                        type="text"
                                        className="form-input"
                                        defaultValue={provider.postalCode || ""}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Provincia</label>
                                    <input
                                        name="province"
                                        type="text"
                                        className="form-input"
                                        defaultValue={provider.province || ""}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">País</label>
                                    <input
                                        name="country"
                                        type="text"
                                        className="form-input"
                                        defaultValue={provider.country || "ES"}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Plazo de pago (días)</label>
                                    <input
                                        name="paymentTermsDays"
                                        type="number"
                                        className="form-input"
                                        defaultValue={provider.paymentTermsDays}
                                        min={0}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Notas internas</label>
                                <textarea
                                    name="notes"
                                    className="form-textarea"
                                    defaultValue={provider.notes || ""}
                                />
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? "Guardando..." : "Guardar cambios"}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setEditing(false)}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Nombre</label>
                                    <p style={{ fontSize: 14 }}>{provider.name}</p>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">NIF / CIF</label>
                                    <p style={{ fontSize: 14, fontFamily: "var(--font-mono)" }}>
                                        {provider.taxId || "—"}
                                    </p>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <p style={{ fontSize: 14 }}>{provider.email || "—"}</p>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Teléfono</label>
                                    <p style={{ fontSize: 14 }}>{provider.phone || "—"}</p>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Dirección</label>
                                <p style={{ fontSize: 14 }}>
                                    {[
                                        provider.addressLine1,
                                        provider.postalCode,
                                        provider.city,
                                        provider.province,
                                        provider.country,
                                    ]
                                        .filter(Boolean)
                                        .join(", ") || "—"}
                                </p>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Plazo de pago</label>
                                    <p style={{ fontSize: 14 }}>{provider.paymentTermsDays} días</p>
                                </div>
                            </div>
                            {provider.notes && (
                                <div className="form-group">
                                    <label className="form-label">Notas</label>
                                    <p style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{provider.notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
