"use client";

import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/clients": "Clientes",
    "/services": "Servicios",
    "/quotes": "Presupuestos",
    "/invoices": "Facturas",
    "/providers": "Proveedores",
    "/purchases": "Facturas Proveedor",
    "/treasury": "Tesorería",
    "/settings": "Ajustes",
};

function getTitle(pathname: string): string {
    // Exact match
    if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

    // Check parent paths
    for (const [path, title] of Object.entries(PAGE_TITLES)) {
        if (pathname.startsWith(path)) return title;
    }

    return "Automatio CRM";
}

export default function Topbar() {
    const pathname = usePathname();
    const title = getTitle(pathname);

    return (
        <header className="topbar">
            <h2 className="topbar-title">{title}</h2>
            <div className="topbar-actions">
                {/* Future: search, notifications */}
            </div>
        </header>
    );
}
