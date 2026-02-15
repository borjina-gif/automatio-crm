"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Client {
    id: string;
    name: string;
    taxId: string | null;
    email: string | null;
    phone: string | null;
    billingCity: string | null;
    createdAt: string;
}

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchClients();
    }, [search]);

    async function fetchClients() {
        setLoading(true);
        try {
            const res = await fetch(`/api/clients?q=${encodeURIComponent(search)}`);
            const data = await res.json();
            setClients(Array.isArray(data) ? data : []);
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
                    <h1>Clientes</h1>
                    <p className="page-header-sub">{clients.length} clientes registrados</p>
                </div>
                <Link href="/clients/new" className="btn btn-primary">
                    + Nuevo Cliente
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
                ) : clients.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">👥</div>
                        <h3>No hay clientes</h3>
                        <p>Crea tu primer cliente para empezar a generar presupuestos y facturas</p>
                        <Link href="/clients/new" className="btn btn-primary">
                            + Nuevo Cliente
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
                            {clients.map((client) => (
                                <tr
                                    key={client.id}
                                    style={{ cursor: "pointer" }}
                                    onClick={() => router.push(`/clients/${client.id}`)}
                                >
                                    <td className="cell-primary">{client.name}</td>
                                    <td className="cell-mono">{client.taxId || "—"}</td>
                                    <td>{client.email || "—"}</td>
                                    <td>{client.phone || "—"}</td>
                                    <td>{client.billingCity || "—"}</td>
                                    <td className="text-right">
                                        <Link
                                            href={`/clients/${client.id}`}
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
