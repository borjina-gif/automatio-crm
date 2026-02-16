"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Provider {
    id: string;
    name: string;
    taxId: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    createdAt: string;
}

export default function ProvidersPage() {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchProviders();
    }, [search]);

    async function fetchProviders() {
        setLoading(true);
        try {
            const res = await fetch(`/api/providers?q=${encodeURIComponent(search)}`);
            const data = await res.json();
            setProviders(Array.isArray(data) ? data : []);
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
                    <h1>Proveedores</h1>
                    <p className="page-header-sub">{providers.length} proveedores registrados</p>
                </div>
                <Link href="/providers/new" className="btn btn-primary">
                    + Nuevo Proveedor
                </Link>
            </div>

            {/* Search */}
            <div className="search-bar" style={{ marginBottom: 20 }}>
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    type="text"
                    placeholder="Buscar por nombre, email o NIF..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Table */}
            <div className="table-container">
                {loading ? (
                    <div className="loading-center">
                        <div className="spinner" />
                    </div>
                ) : providers.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🏢</div>
                        <h3>No hay proveedores</h3>
                        <p>Crea tu primer proveedor para empezar a registrar compras</p>
                        <Link href="/providers/new" className="btn btn-primary">
                            + Nuevo Proveedor
                        </Link>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>NIF/CIF</th>
                                <th>Email</th>
                                <th>Teléfono</th>
                                <th>Ciudad</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {providers.map((provider) => (
                                <tr
                                    key={provider.id}
                                    style={{ cursor: "pointer" }}
                                    onClick={() => router.push(`/providers/${provider.id}`)}
                                >
                                    <td className="cell-primary">{provider.name}</td>
                                    <td className="cell-mono">{provider.taxId || "—"}</td>
                                    <td>{provider.email || "—"}</td>
                                    <td>{provider.phone || "—"}</td>
                                    <td>{provider.city || "—"}</td>
                                    <td className="text-right">
                                        <Link
                                            href={`/providers/${provider.id}`}
                                            className="btn btn-ghost btn-sm"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Ver →
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
