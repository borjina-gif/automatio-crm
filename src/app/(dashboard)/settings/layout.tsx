"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SETTINGS_NAV = [
    { label: "Empresa", href: "/settings/company", icon: "🏢" },
    { label: "Numeración", href: "/settings/billing", icon: "🔢" },
    { label: "Impuestos", href: "/settings/taxes", icon: "💶" },
    { label: "Marca", href: "/settings/branding", icon: "🎨" },
    { label: "Email", href: "/settings/email", icon: "📧" },
    { label: "Usuarios", href: "/settings/users", icon: "👤" },
    { label: "Seguridad", href: "/settings/security", icon: "🔒" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div style={{ display: "flex", gap: 24, minHeight: "calc(100vh - 120px)" }}>
            {/* Settings sidebar */}
            <nav style={{
                width: 220,
                flexShrink: 0,
                borderRight: "1px solid var(--color-border)",
                paddingRight: 20,
            }}>
                <h3 style={{ fontSize: 13, textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 12, letterSpacing: 1 }}>
                    Ajustes
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {SETTINGS_NAV.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    padding: "10px 14px",
                                    borderRadius: 8,
                                    fontSize: 14,
                                    fontWeight: isActive ? 600 : 400,
                                    color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
                                    background: isActive ? "var(--color-primary-muted)" : "transparent",
                                    textDecoration: "none",
                                    transition: "all 0.15s ease",
                                }}
                            >
                                <span style={{ fontSize: 16 }}>{item.icon}</span>
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {children}
            </div>
        </div>
    );
}
