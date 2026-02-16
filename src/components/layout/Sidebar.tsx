"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
    {
        section: "General",
        items: [
            { label: "Dashboard", href: "/dashboard", icon: "📊" },
        ],
    },
    {
        section: "Ventas",
        items: [
            { label: "Clientes", href: "/clients", icon: "👥" },
            { label: "Servicios", href: "/services", icon: "⚙️" },
            { label: "Presupuestos", href: "/quotes", icon: "📝" },
            { label: "Facturas", href: "/invoices", icon: "📄" },
        ],
    },
    {
        section: "Compras",
        items: [
            { label: "Proveedores", href: "/providers", icon: "🏢" },
            { label: "Facturas Proveedor", href: "/purchases", icon: "📥" },
        ],
    },
    {
        section: "Finanzas",
        items: [
            { label: "Resumen", href: "/treasury", icon: "💰" },
            { label: "Movimientos", href: "/treasury/movements", icon: "📋" },
            { label: "Informes", href: "/treasury/reports", icon: "📊" },
        ],
    },
    {
        section: "Sistema",
        items: [
            { label: "Ajustes", href: "/settings", icon: "🔧" },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    async function handleLogout() {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
    }

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="sidebar-logo">
                <img src="/logo.svg" alt="Automatio" className="sidebar-logo-img" />
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {NAV_ITEMS.map((section) => (
                    <div key={section.section}>
                        <div className="sidebar-section-label">{section.section}</div>
                        {section.items.map((item) => {
                            const isActive =
                                pathname === item.href ||
                                (item.href !== "/dashboard" && pathname.startsWith(item.href));

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`sidebar-link ${isActive ? "active" : ""}`}
                                >
                                    <span className="nav-icon">{item.icon}</span>
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="sidebar-footer">
                <div className="sidebar-avatar">AD</div>
                <div className="sidebar-user-info">
                    <div className="sidebar-user-name">Administrador</div>
                    <div className="sidebar-user-role">Admin</div>
                </div>
                <button
                    className="sidebar-logout-btn"
                    onClick={handleLogout}
                    title="Cerrar sesión"
                >
                    🚪
                </button>
            </div>
        </aside>
    );
}
