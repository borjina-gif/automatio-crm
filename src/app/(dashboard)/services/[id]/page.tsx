"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Tax {
    id: string;
    name: string;
    rate: number;
}

interface ServiceDetail {
    id: string;
    name: string;
    description: string | null;
    unitPriceCents: number;
    isActive: boolean;
    defaultTaxId: string | null;
    defaultTax: { name: string } | null;
}

export default function ServiceDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [service, setService] = useState<ServiceDetail | null>(null);
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [priceEuros, setPriceEuros] = useState("");

    useEffect(() => {
        Promise.all([
            fetch(`/api/services/${id}`).then((r) => r.json()),
            fetch("/api/taxes").then((r) => r.json()),
        ]).then(([svc, txs]) => {
            setService(svc);
            setTaxes(Array.isArray(txs) ? txs : []);
            setPriceEuros((svc.unitPriceCents / 100).toFixed(2));
            setLoading(false);
        }).catch(() => {
            setError("Servicio no encontrado");
            setLoading(false);
        });
    }, [id]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        setError("");

        const form = new FormData(e.currentTarget);
        const name = form.get("name") as string;
        const description = form.get("description") as string;
        const defaultTaxId = form.get("defaultTaxId") as string;
        const cents = Math.round(parseFloat(priceEuros || "0") * 100);

        try {
            const res = await fetch(`/api/services/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    description,
                    unitPriceCents: cents,
                    defaultTaxId: defaultTaxId || null,
                    isActive: service?.isActive ?? true,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error);
            }

            const updated = await res.json();
            setService(updated);
            router.push("/services");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="loading-center"><div className="spinner" /></div>;
    }

    if (!service) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <h3>Servicio no encontrado</h3>
                <Link href="/services" className="btn btn-primary mt-4">
                    ← Volver a servicios
                </Link>
            </div>
        );
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Editar: {service.name}</h1>
                    <p className="page-header-sub">
                        <span className={`badge ${service.isActive ? "badge-success" : "badge-draft"}`}>
                            {service.isActive ? "Activo" : "Inactivo"}
                        </span>
                    </p>
                </div>
                <Link href="/services" className="btn btn-secondary">
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
                                <label className="form-label">Nombre *</label>
                                <input
                                    name="name"
                                    type="text"
                                    className="form-input"
                                    defaultValue={service.name}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Precio unitario (€)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    step="0.01"
                                    min="0"
                                    value={priceEuros}
                                    onChange={(e) => setPriceEuros(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Impuesto por defecto</label>
                                <select
                                    name="defaultTaxId"
                                    className="form-select"
                                    defaultValue={service.defaultTaxId || ""}
                                >
                                    <option value="">Sin impuesto</option>
                                    {taxes.map((tax) => (
                                        <option key={tax.id} value={tax.id}>
                                            {tax.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Descripción</label>
                            <textarea
                                name="description"
                                className="form-textarea"
                                defaultValue={service.description || ""}
                            />
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                                {saving ? "Guardando..." : "Guardar cambios"}
                            </button>
                            <Link href="/services" className="btn btn-secondary">
                                Cancelar
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
