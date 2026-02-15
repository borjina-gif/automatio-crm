"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Tax {
    id: string;
    name: string;
    rate: number;
}

export default function NewServicePage() {
    const router = useRouter();
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [priceEuros, setPriceEuros] = useState("");

    useEffect(() => {
        fetch("/api/taxes")
            .then((r) => r.json())
            .then((data) => setTaxes(Array.isArray(data) ? data : []));
    }, []);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        setError("");

        const form = new FormData(e.currentTarget);
        const name = form.get("name") as string;
        const description = form.get("description") as string;
        const defaultTaxId = form.get("defaultTaxId") as string;

        // Convert euros to cents
        const cents = Math.round(parseFloat(priceEuros || "0") * 100);

        try {
            const res = await fetch("/api/services", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    description,
                    unitPriceCents: cents,
                    defaultTaxId: defaultTaxId || null,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Error al crear servicio");
            }

            const service = await res.json();
            router.push(`/services/${service.id}`);
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
                    <h1>Nuevo Servicio</h1>
                    <p className="page-header-sub">Define un concepto reutilizable para presupuestos y facturas</p>
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
                                    placeholder="Desarrollo web, Consultoría..."
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Precio unitario (€)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="0,00"
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
                                <select name="defaultTaxId" className="form-select">
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
                                placeholder="Descripción del servicio..."
                            />
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                                {saving ? "Guardando..." : "Crear Servicio"}
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
