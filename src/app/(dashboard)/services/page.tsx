"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ServiceItem {
    id: string;
    name: string;
    description: string | null;
    unitPriceCents: number;
    isActive: boolean;
    defaultTax: { name: string } | null;
}

function formatCents(cents: number): string {
    return (cents / 100).toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }) + " €";
}

export default function ServicesPage() {
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchServices();
    }, [search]);

    async function fetchServices() {
        setLoading(true);
        try {
            const res = await fetch(`/api/services?q=${encodeURIComponent(search)}`);
            const data = await res.json();
            setServices(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Servicios</h1>
                    <p className="page-header-sub">{services.length} servicios</p>
                </div>
                <Link href="/services/new" className="btn btn-primary">
                    + Nuevo Servicio
                </Link>
            </div>

            <div className="search-bar" style={{ marginBottom: 20 }}>
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    type="text"
                    placeholder="Buscar servicios..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="table-container">
                {loading ? (
                    <div className="loading-center"><div className="spinner" /></div>
                ) : services.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">⚙️</div>
                        <h3>No hay servicios</h3>
                        <p>Crea servicios para poder añadirlos rápidamente a presupuestos y facturas</p>
                        <Link href="/services/new" className="btn btn-primary">
                            + Nuevo Servicio
                        </Link>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Descripción</th>
                                <th>Precio</th>
                                <th>Impuesto</th>
                                <th>Estado</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {services.map((s) => (
                                <tr
                                    key={s.id}
                                    style={{ cursor: "pointer" }}
                                    onClick={() => router.push(`/services/${s.id}`)}
                                >
                                    <td className="cell-primary">{s.name}</td>
                                    <td>{s.description || "—"}</td>
                                    <td className="cell-amount">{formatCents(s.unitPriceCents)}</td>
                                    <td>{s.defaultTax?.name || "—"}</td>
                                    <td>
                                        <span className={`badge ${s.isActive ? "badge-success" : "badge-draft"}`}>
                                            {s.isActive ? "Activo" : "Inactivo"}
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <Link
                                            href={`/services/${s.id}`}
                                            className="btn btn-ghost btn-sm"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Editar →
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}
