"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewClientPage() {
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
            const res = await fetch("/api/clients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Error al crear cliente");
            }

            const client = await res.json();
            router.push(`/clients/${client.id}`);
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
                    <h1>Nuevo Cliente</h1>
                    <p className="page-header-sub">Añade un nuevo cliente al CRM</p>
                </div>
                <Link href="/clients" className="btn btn-secondary">
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
                                    placeholder="cliente@ejemplo.com"
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
                                name="billingAddressLine1"
                                type="text"
                                className="form-input"
                                placeholder="Calle, número, piso..."
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Ciudad</label>
                                <input
                                    name="billingCity"
                                    type="text"
                                    className="form-input"
                                    placeholder="Madrid"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Código Postal</label>
                                <input
                                    name="billingPostalCode"
                                    type="text"
                                    className="form-input"
                                    placeholder="28001"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Provincia</label>
                                <input
                                    name="billingProvince"
                                    type="text"
                                    className="form-input"
                                    placeholder="Madrid"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">País</label>
                                <input
                                    name="billingCountry"
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
                                placeholder="Notas internas sobre este cliente..."
                            />
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                                {saving ? "Guardando..." : "Crear Cliente"}
                            </button>
                            <Link href="/clients" className="btn btn-secondary">
                                Cancelar
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
