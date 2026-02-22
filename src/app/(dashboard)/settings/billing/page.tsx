"use client";

import { useState, useEffect, useCallback } from "react";

interface Counter {
    docType: string;
    prefix: string;
    year: number;
    currentNumber: number;
    nextNumber: number;
    nextFormatted: string;
}

const DOC_LABELS: Record<string, string> = {
    QUOTE: "Presupuestos",
    INVOICE: "Facturas",
    CREDIT_NOTE: "Rectificativas",
    PURCHASE_INVOICE: "Facturas de proveedor",
};

export default function BillingSettingsPage() {
    const [counters, setCounters] = useState<Counter[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    const fetchCounters = useCallback(async () => {
        try {
            const res = await fetch("/api/settings/numbering");
            const data = await res.json();
            setCounters(data);
        } catch {
            setMessage("Error al cargar numeración");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCounters(); }, [fetchCounters]);

    const handleReset = async (docType: string) => {
        if (!confirm(`¿Estás seguro de resetear el contador de ${DOC_LABELS[docType] || docType}?`)) return;
        try {
            const res = await fetch("/api/settings/numbering", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ docType, resetTo: 0 }),
            });
            if (res.ok) {
                setMessage(`✅ Contador de ${DOC_LABELS[docType]} reseteado`);
                fetchCounters();
            } else {
                setMessage("❌ Error al resetear");
            }
        } catch {
            setMessage("❌ Error de conexión");
        }
    };

    if (loading) return <p style={{ color: "var(--text-secondary)" }}>Cargando…</p>;

    const cardStyle: React.CSSProperties = {
        background: "var(--bg-card, #fff)",
        border: "1px solid var(--border-color, #e5e7eb)",
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
    };

    return (
        <div style={{ maxWidth: 720 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Numeración y Facturación</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
                Series de numeración con reinicio anual automático. Facturas: F{'{'}YY{'}'}/{'{'}NN{'}'} · Presupuestos: PRE-AÑO-NÚMERO
            </p>

            {counters.map((c) => (
                <div key={c.docType} style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                                {DOC_LABELS[c.docType] || c.docType}
                            </h3>
                            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
                                Prefijo: <strong>{c.prefix}</strong> · Año: <strong>{c.year}</strong> · Padding: 4 dígitos
                            </p>
                        </div>
                        <button
                            onClick={() => handleReset(c.docType)}
                            style={{
                                padding: "6px 14px",
                                border: "1px solid #ef4444",
                                background: "transparent",
                                color: "#ef4444",
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            Reset contador
                        </button>
                    </div>

                    <div style={{ display: "flex", gap: 32, marginTop: 12 }}>
                        <div>
                            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Número actual</span>
                            <p style={{ fontSize: 22, fontWeight: 700, fontFamily: "monospace" }}>{c.currentNumber}</p>
                        </div>
                        <div>
                            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Siguiente número</span>
                            <p style={{ fontSize: 22, fontWeight: 700, fontFamily: "monospace", color: "var(--color-primary, #1B1660)" }}>
                                {c.nextFormatted}
                            </p>
                        </div>
                    </div>
                </div>
            ))}

            {message && <p style={{ fontSize: 14, marginTop: 12 }}>{message}</p>}
        </div>
    );
}
