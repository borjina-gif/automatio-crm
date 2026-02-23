"use client";

import { usePathname } from "next/navigation";
import { useSidebar } from "./SidebarContext";

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
    if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
    for (const [path, title] of Object.entries(PAGE_TITLES)) {
        if (pathname.startsWith(path)) return title;
    }
    return "Automatio CRM";
}

export default function Topbar() {
    const pathname = usePathname();
    const title = getTitle(pathname);
    const { toggle } = useSidebar();

    return (
        <header className="topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                    className="hamburger-btn"
                    onClick={toggle}
                    aria-label="Abrir menú"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
                <h2 className="topbar-title">{title}</h2>
            </div>
            <div className="topbar-actions">
                {/* Future: search, notifications */}
            </div>
        </header>
    );
}
