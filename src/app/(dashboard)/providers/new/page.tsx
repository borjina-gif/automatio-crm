"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewProviderPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        setError("");

        const form = new FormData(e.currentTarget);
        const data = Object.fromEntries(form.entries());

        try {
            const res = await fetch("/api/providers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Error al crear proveedor");
            }

            const provider = await res.json();
            router.push(`/providers/${provider.id}`);
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
                    <h1>Nuevo Proveedor</h1>
                    <p className="page-header-sub">Añade un nuevo proveedor al CRM</p>
                </div>
                <Link href="/providers" className="btn btn-secondary">
                    ← Volver
                </Link>
            </div>

            <div className="card">
                <div className="card-body">
                    {error && (
                        <div className="toast toast-error" style={{ position: "static", marginBottom: 16 }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Nombre / Razón social *</label>
                                <input
                                    name="name"
                                    type="text"
                                    className="form-input"
                                    placeholder="Nombre de la empresa o persona"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">NIF / CIF</label>
                                <input
                                    name="taxId"
                                    type="text"
                                    className="form-input"
                                    placeholder="B12345678"
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
                                    placeholder="proveedor@ejemplo.com"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Teléfono</label>
                                <input
                                    name="phone"
                                    type="text"
                                    className="form-input"
                                    placeholder="+34 600 000 000"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Dirección</label>
                            <input
                                name="addressLine1"
                                type="text"
                                className="form-input"
                                placeholder="Calle, número, piso..."
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Ciudad</label>
                                <input
                                    name="city"
                                    type="text"
                                    className="form-input"
                                    placeholder="Madrid"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Código Postal</label>
                                <input
                                    name="postalCode"
                                    type="text"
                                    className="form-input"
                                    placeholder="28001"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Provincia</label>
                                <input
                                    name="province"
                                    type="text"
                                    className="form-input"
                                    placeholder="Madrid"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">País</label>
                                <input
                                    name="country"
                                    type="text"
                                    className="form-input"
                                    defaultValue="ES"
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
                                    defaultValue={30}
                                    min={0}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Notas internas</label>
                            <textarea
                                name="notes"
                                className="form-textarea"
                                placeholder="Notas internas sobre este proveedor..."
                            />
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                                {saving ? "Guardando..." : "Crear Proveedor"}
                            </button>
                            <Link href="/providers" className="btn btn-secondary">
                                Cancelar
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
