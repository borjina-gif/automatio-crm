"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Service {
    id: string;
    name: string;
    description: string | null;
    unitPriceCents: number;
    defaultTax: { id: string; name: string; rate: number } | null;
}

interface ServiceAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onServiceSelect: (service: {
        description: string;
        unitPriceEuros: string;
        taxId: string;
        taxRate: number;
    }) => void;
    placeholder?: string;
    className?: string;
}

export default function ServiceAutocomplete({
    value,
    onChange,
    onServiceSelect,
    placeholder = "Descripción del concepto... (@ para buscar servicios)",
    className = "line-input",
}: ServiceAutocompleteProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [services, setServices] = useState<Service[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Find the @ position and extract query
    const getAtQuery = useCallback((text: string, cursorPos: number): string | null => {
        // Search backwards from cursor for @
        const before = text.slice(0, cursorPos);
        const atIdx = before.lastIndexOf("@");
        if (atIdx === -1) return null;
        // Only trigger if @ is at start or preceded by a space
        if (atIdx > 0 && before[atIdx - 1] !== " ") return null;
        return before.slice(atIdx + 1);
    }, []);

    const fetchServices = useCallback(async (q: string) => {
        try {
            const res = await fetch(`/api/services?q=${encodeURIComponent(q)}`);
            const data = await res.json();
            setServices(Array.isArray(data) ? data : []);
            setActiveIndex(0);
        } catch {
            setServices([]);
        }
    }, []);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        onChange(newVal);

        const cursorPos = e.target.selectionStart || newVal.length;
        const atQuery = getAtQuery(newVal, cursorPos);

        if (atQuery !== null) {
            setQuery(atQuery);
            setShowDropdown(true);

            // Debounced fetch
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                fetchServices(atQuery);
            }, 200);
        } else {
            setShowDropdown(false);
            setServices([]);
        }
    };

    const selectService = (service: Service) => {
        // Replace the @query with the service name
        const input = inputRef.current;
        const cursorPos = input?.selectionStart || value.length;
        const before = value.slice(0, cursorPos);
        const atIdx = before.lastIndexOf("@");
        const after = value.slice(cursorPos);

        const newDescription = value.slice(0, atIdx) + service.name + after;

        onServiceSelect({
            description: newDescription,
            unitPriceEuros: (service.unitPriceCents / 100).toFixed(2),
            taxId: service.defaultTax?.id || "",
            taxRate: service.defaultTax ? Number(service.defaultTax.rate) : 0,
        });

        setShowDropdown(false);
        setServices([]);
        setQuery("");

        // Refocus input
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showDropdown || services.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % services.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => (i - 1 + services.length) % services.length);
        } else if (e.key === "Enter" && showDropdown) {
            e.preventDefault();
            selectService(services[activeIndex]);
        } else if (e.key === "Escape") {
            setShowDropdown(false);
        }
    };

    // Close on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(e.target as Node)
            ) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Scroll active item into view
    useEffect(() => {
        if (!dropdownRef.current) return;
        const activeEl = dropdownRef.current.querySelector(".sac-item-active");
        if (activeEl) activeEl.scrollIntoView({ block: "nearest" });
    }, [activeIndex]);

    const formatPrice = (cents: number) =>
        (cents / 100).toLocaleString("es-ES", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    return (
        <div className="sac-wrapper">
            <input
                ref={inputRef}
                className={className}
                placeholder={placeholder}
                value={value}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                autoComplete="off"
            />
            {showDropdown && services.length > 0 && (
                <div className="sac-dropdown" ref={dropdownRef}>
                    {services.map((s, i) => (
                        <div
                            key={s.id}
                            className={`sac-item ${i === activeIndex ? "sac-item-active" : ""}`}
                            onMouseDown={(e) => {
                                e.preventDefault(); // prevent blur
                                selectService(s);
                            }}
                            onMouseEnter={() => setActiveIndex(i)}
                        >
                            <div className="sac-item-name">{s.name}</div>
                            <div className="sac-item-meta">
                                <span>{formatPrice(s.unitPriceCents)} €</span>
                                {s.defaultTax && (
                                    <span className="sac-item-tax">{s.defaultTax.name}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {showDropdown && services.length === 0 && query.length > 0 && (
                <div className="sac-dropdown">
                    <div className="sac-empty">No se encontraron servicios</div>
                </div>
            )}
        </div>
    );
}
