"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
    type: string;
    id: string;
    title: string;
    subtitle: string;
    href: string;
    icon: string;
}

const QUICK_ACTIONS = [
    { title: "Nueva factura", href: "/invoices/new", icon: "📄", subtitle: "Crear factura de venta" },
    { title: "Nuevo presupuesto", href: "/quotes/new", icon: "📝", subtitle: "Crear presupuesto" },
    { title: "Nuevo cliente", href: "/clients/new", icon: "👤", subtitle: "Añadir cliente" },
    { title: "Nueva compra", href: "/purchases/new", icon: "📥", subtitle: "Registrar factura de compra" },
    { title: "Dashboard", href: "/dashboard", icon: "📊", subtitle: "Ver resumen" },
    { title: "Informes", href: "/treasury/reports", icon: "📊", subtitle: "Informes trimestrales" },
];

interface GlobalSearchProps {
    onClose?: () => void;
}

export default function GlobalSearch({ onClose }: GlobalSearchProps = {}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const close = useCallback(() => {
        onClose?.();
    }, [onClose]);

    // ESC to close
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") {
                close();
            }
        }
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [close]);

    // Focus input on mount
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);

    // Search with debounce
    const search = useCallback(async (q: string) => {
        if (q.length < 2) {
            setResults([]);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
            const data = await res.json();
            setResults(data.results || []);
            setSelectedIndex(0);
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(query), 200);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query, search]);

    function navigate(href: string) {
        close();
        router.push(href);
    }

    // Items to show
    const displayItems = query.length < 2
        ? QUICK_ACTIONS.map((a) => ({ ...a, type: "action", id: a.href }))
        : results;

    // Keyboard navigation
    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((prev) => Math.min(prev + 1, displayItems.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const item = displayItems[selectedIndex];
            if (item) navigate(item.href);
        }
    }

    return (
        <div className="cmdk-overlay" onClick={close}>
            <div className="cmdk-dialog" onClick={(e) => e.stopPropagation()}>
                {/* Search input */}
                <div className="cmdk-input-wrapper">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        ref={inputRef}
                        className="cmdk-input"
                        placeholder="Buscar clientes, facturas, presupuestos..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <kbd className="cmdk-kbd">ESC</kbd>
                </div>

                {/* Results */}
                <div className="cmdk-list">
                    {loading && (
                        <div className="cmdk-loading">
                            <div className="spinner-sm" />
                            <span>Buscando...</span>
                        </div>
                    )}

                    {!loading && query.length >= 2 && results.length === 0 && (
                        <div className="cmdk-empty">
                            Sin resultados para &quot;{query}&quot;
                        </div>
                    )}

                    {!loading && query.length < 2 && (
                        <div className="cmdk-group-label">Acciones rápidas</div>
                    )}

                    {!loading && displayItems.map((item, idx) => (
                        <button
                            key={`${item.type}-${item.id}`}
                            className={`cmdk-item ${idx === selectedIndex ? "cmdk-item-selected" : ""}`}
                            onClick={() => navigate(item.href)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                        >
                            <span className="cmdk-item-icon">{item.icon}</span>
                            <div className="cmdk-item-content">
                                <span className="cmdk-item-title">{item.title}</span>
                                <span className="cmdk-item-subtitle">{item.subtitle}</span>
                            </div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.3, flexShrink: 0 }}>
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div className="cmdk-footer">
                    <span><kbd>↑↓</kbd> Navegar</span>
                    <span><kbd>↵</kbd> Abrir</span>
                    <span><kbd>ESC</kbd> Cerrar</span>
                </div>
            </div>

            <style jsx>{`
                .cmdk-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(4px);
                    z-index: 999;
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    padding-top: 15vh;
                    animation: cmdk-fade-in 0.15s ease;
                }
                .cmdk-dialog {
                    width: 560px;
                    max-width: 90vw;
                    background: var(--color-surface, #161822);
                    border: 1px solid var(--color-border, #262940);
                    border-radius: 14px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.08);
                    overflow: hidden;
                    animation: cmdk-slide-in 0.2s ease;
                }
                .cmdk-input-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 14px 18px;
                    border-bottom: 1px solid var(--color-border-subtle, #1e2032);
                    color: var(--color-text-secondary, #94a3b8);
                }
                .cmdk-input {
                    flex: 1;
                    background: none;
                    border: none;
                    outline: none;
                    color: var(--color-text, #f1f5f9);
                    font-size: 15px;
                    font-family: inherit;
                }
                .cmdk-input::placeholder {
                    color: var(--color-text-muted, #64748b);
                }
                .cmdk-kbd {
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 4px;
                    background: var(--color-bg-tertiary, #1a1c26);
                    border: 1px solid var(--color-border, #262940);
                    color: var(--color-text-muted, #64748b);
                    font-family: var(--font-mono);
                }
                .cmdk-list {
                    max-height: 320px;
                    overflow-y: auto;
                    padding: 8px;
                }
                .cmdk-group-label {
                    font-size: 10px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: var(--color-text-muted, #64748b);
                    padding: 8px 10px 4px;
                }
                .cmdk-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    width: 100%;
                    padding: 10px 12px;
                    border-radius: 8px;
                    border: none;
                    background: none;
                    color: var(--color-text, #f1f5f9);
                    cursor: pointer;
                    text-align: left;
                    transition: background 0.1s ease;
                    font-family: inherit;
                }
                .cmdk-item:hover,
                .cmdk-item-selected {
                    background: var(--color-primary-muted, rgba(99, 102, 241, 0.15));
                }
                .cmdk-item-icon {
                    font-size: 18px;
                    width: 28px;
                    text-align: center;
                    flex-shrink: 0;
                }
                .cmdk-item-content {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                }
                .cmdk-item-title {
                    font-size: 13.5px;
                    font-weight: 500;
                }
                .cmdk-item-subtitle {
                    font-size: 11.5px;
                    color: var(--color-text-muted, #64748b);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .cmdk-loading {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 20px 12px;
                    color: var(--color-text-muted, #64748b);
                    font-size: 13px;
                }
                .cmdk-empty {
                    padding: 24px 12px;
                    text-align: center;
                    color: var(--color-text-muted, #64748b);
                    font-size: 13px;
                }
                .cmdk-footer {
                    display: flex;
                    gap: 20px;
                    padding: 10px 18px;
                    border-top: 1px solid var(--color-border-subtle, #1e2032);
                    font-size: 11px;
                    color: var(--color-text-muted, #64748b);
                }
                .cmdk-footer kbd {
                    font-size: 10px;
                    padding: 1px 4px;
                    border-radius: 3px;
                    background: var(--color-bg-tertiary, #1a1c26);
                    border: 1px solid var(--color-border, #262940);
                    font-family: var(--font-mono);
                    margin-right: 3px;
                }
                @keyframes cmdk-fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes cmdk-slide-in {
                    from { opacity: 0; transform: scale(0.97) translateY(-8px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}
