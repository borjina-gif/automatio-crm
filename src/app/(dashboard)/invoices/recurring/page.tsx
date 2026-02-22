"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Tax {
    id: string;
    name: string;
    rate: number;
}

interface Client {
    id: string;
    name: string;
    email?: string;
}

interface TemplateLine {
    id?: string;
    description: string;
    quantity: number;
    unitPriceCents: number;
    taxId: string | null;
    tax?: { name: string; rate: number } | null;
}

interface RecurringRun {
    id: string;
    runDate: string;
    status: string;
    generatedInvoiceId: string | null;
    errorMessage: string | null;
    createdAt: string;
}

interface RecurringTemplate {
    id: string;
    name: string;
    clientId: string;
    dayOfMonth: number;
    startDate: string;
    nextRunDate: string;
    frequency: string;
    mode: string;
    status: string;
    notes: string | null;
    client: Client;
    lines: TemplateLine[];
    runs?: RecurringRun[];
    _count?: { runs: number };
}

interface LineItem {
    key: string;
    description: string;
    quantity: string;
    unitPriceEuros: string;
    taxId: string;
}

function emptyLine(): LineItem {
    return {
        key: crypto.randomUUID(),
        description: "",
        quantity: "1",
        unitPriceEuros: "",
        taxId: "",
    };
}

function formatCents(cents: number): string {
    return (cents / 100).toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

const STATUS_BADGES: Record<string, { label: string; class: string }> = {
    ACTIVE: { label: "Activa", class: "badge-success" },
    PAUSED: { label: "Pausada", class: "badge-warning" },
};

const RUN_STATUS_BADGES: Record<string, { label: string; class: string }> = {
    SUCCESS: { label: "✅ Éxito", class: "badge-success" },
    FAILED: { label: "❌ Error", class: "badge-danger" },
    GENERATED: { label: "📄 Generada", class: "badge-info" },
    SKIPPED: { label: "⏭️ Omitida", class: "badge-draft" },
};

export default function RecurringInvoicesPage() {
    const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [runningId, setRunningId] = useState("");

    // Form state
    const [formName, setFormName] = useState("");
    const [formClientId, setFormClientId] = useState("");
    const [formDayOfMonth, setFormDayOfMonth] = useState("1");
    const [formStartDate, setFormStartDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [formMode, setFormMode] = useState("GENERATE_AND_SEND");
    const [formNotes, setFormNotes] = useState("");
    const [formLines, setFormLines] = useState<LineItem[]>([emptyLine()]);

    // Expanded template (show runs)
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [expandedRuns, setExpandedRuns] = useState<RecurringRun[]>([]);

    useEffect(() => {
        fetchAll();
    }, []);

    async function fetchAll() {
        setLoading(true);
        try {
            const [tpl, cl, tx] = await Promise.all([
                fetch("/api/recurring-templates").then((r) => r.json()),
                fetch("/api/clients").then((r) => r.json()),
                fetch("/api/taxes").then((r) => r.json()),
            ]);
            setTemplates(Array.isArray(tpl) ? tpl : []);
            setClients(Array.isArray(cl) ? cl : []);
            const taxList = Array.isArray(tx) ? tx : [];
            setTaxes(taxList);

            // Set default tax on form lines
            const defaultTax = taxList.find((t: Tax) => t.name.includes("21"));
            if (defaultTax) {
                setFormLines((prev) =>
                    prev.map((l) =>
                        !l.taxId ? { ...l, taxId: defaultTax.id } : l
                    )
                );
            }
        } catch {
            setError("Error cargando datos");
        } finally {
            setLoading(false);
        }
    }

    const updateLine = useCallback((key: string, field: string, value: string) => {
        setFormLines((prev) =>
            prev.map((l) => (l.key !== key ? l : { ...l, [field]: value }))
        );
    }, []);

    const addLine = () => {
        const defaultTax = taxes.find((t) => t.name.includes("21"));
        setFormLines((prev) => [
            ...prev,
            { ...emptyLine(), taxId: defaultTax?.id || "" },
        ]);
    };

    const removeLine = (key: string) => {
        setFormLines((prev) => prev.filter((l) => l.key !== key));
    };

    async function handleCreate() {
        if (!formClientId) { setError("Selecciona un cliente"); return; }
        if (!formName) { setError("Escribe un nombre para la plantilla"); return; }
        if (formLines.every((l) => !l.description)) { setError("Añade al menos una línea"); return; }

        setSaving(true);
        setError("");

        const apiLines = formLines
            .filter((l) => l.description)
            .map((l) => ({
                description: l.description,
                quantity: parseFloat(l.quantity) || 0,
                unitPriceCents: Math.round((parseFloat(l.unitPriceEuros) || 0) * 100),
                taxId: l.taxId || null,
            }));

        try {
            const res = await fetch("/api/recurring-templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientId: formClientId,
                    name: formName,
                    dayOfMonth: parseInt(formDayOfMonth),
                    startDate: formStartDate,
                    mode: formMode,
                    notes: formNotes || null,
                    lines: apiLines,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Error al crear plantilla");
            }

            setSuccess("✅ Plantilla creada correctamente");
            setTimeout(() => setSuccess(""), 3000);
            setShowForm(false);
            resetForm();
            fetchAll();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    function resetForm() {
        setFormName("");
        setFormClientId("");
        setFormDayOfMonth("1");
        setFormStartDate(new Date().toISOString().split("T")[0]);
        setFormMode("GENERATE_AND_SEND");
        setFormNotes("");
        setFormLines([emptyLine()]);
    }

    async function handleToggleStatus(template: RecurringTemplate) {
        const newStatus = template.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
        try {
            await fetch(`/api/recurring-templates/${template.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            fetchAll();
        } catch {
            setError("Error al cambiar estado");
        }
    }

    async function handleRunNow(templateId: string) {
        if (!confirm("¿Ejecutar ahora esta plantilla? Se generará una factura.")) return;
        setRunningId(templateId);
        setError("");
        try {
            const res = await fetch(`/api/recurring-templates/${templateId}/run`, {
                method: "POST",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al ejecutar");
            setSuccess(`✅ Factura generada correctamente`);
            setTimeout(() => setSuccess(""), 4000);
            fetchAll();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setRunningId("");
        }
    }

    async function handleDelete(templateId: string) {
        if (!confirm("¿Eliminar esta plantilla recurrente?")) return;
        try {
            await fetch(`/api/recurring-templates/${templateId}`, {
                method: "DELETE",
            });
            fetchAll();
        } catch {
            setError("Error al eliminar");
        }
    }

    async function handleExpand(templateId: string) {
        if (expandedId === templateId) {
            setExpandedId(null);
            return;
        }
        try {
            const res = await fetch(`/api/recurring-templates/${templateId}`);
            const data = await res.json();
            setExpandedRuns(data.runs || []);
            setExpandedId(templateId);
        } catch {
            setError("Error al cargar historial");
        }
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Facturas Recurrentes</h1>
                    <p className="page-header-sub">
                        {templates.length} plantilla{templates.length !== 1 ? "s" : ""} configurada{templates.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/invoices" className="btn btn-secondary">
                        ← Facturas
                    </Link>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setShowForm(!showForm);
                            if (!showForm) resetForm();
                        }}
                    >
                        {showForm ? "✕ Cancelar" : "+ Nueva plantilla"}
                    </button>
                </div>
            </div>

            {error && (
                <div className="toast toast-error" style={{ position: "static", marginBottom: 16 }}>
                    {error}
                    <button onClick={() => setError("")} style={{ marginLeft: 8, background: "none", border: "none", color: "inherit", cursor: "pointer" }}>✕</button>
                </div>
            )}
            {success && (
                <div className="toast toast-success" style={{ position: "static", marginBottom: 16 }}>
                    {success}
                </div>
            )}

            {/* Create form */}
            {showForm && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-header">
                        <span className="card-title">Nueva plantilla recurrente</span>
                    </div>
                    <div className="card-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Nombre *</label>
                                <input
                                    className="form-input"
                                    placeholder="Ej: Mantenimiento mensual"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Cliente *</label>
                                <select
                                    className="form-select"
                                    value={formClientId}
                                    onChange={(e) => setFormClientId(e.target.value)}
                                >
                                    <option value="">Seleccionar cliente...</option>
                                    {clients.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Día del mes (1-28) *</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    min="1"
                                    max="28"
                                    value={formDayOfMonth}
                                    onChange={(e) => setFormDayOfMonth(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Fecha inicio</label>
                                <input
                                    className="form-input"
                                    type="date"
                                    value={formStartDate}
                                    onChange={(e) => setFormStartDate(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Modo</label>
                                <select
                                    className="form-select"
                                    value={formMode}
                                    onChange={(e) => setFormMode(e.target.value)}
                                >
                                    <option value="GENERATE_AND_SEND">Generar + Emitir + Enviar</option>
                                    <option value="GENERATE_ONLY">Solo generar borrador</option>
                                </select>
                            </div>
                        </div>

                        {/* Line editor */}
                        <div style={{ marginTop: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>Líneas de factura</label>
                                <button className="btn btn-secondary btn-sm" onClick={addLine}>+ Añadir</button>
                            </div>
                            <div className="lines-editor">
                                <div className="line-row line-row-header">
                                    <span>Descripción</span>
                                    <span>Cantidad</span>
                                    <span>Precio (€)</span>
                                    <span>Impuesto</span>
                                    <span></span>
                                </div>
                                {formLines.map((line) => (
                                    <div className="line-row" key={line.key} style={{ gridTemplateColumns: "3fr 1fr 1fr 1.5fr 40px" }}>
                                        <input
                                            className="line-input"
                                            placeholder="Descripción..."
                                            value={line.description}
                                            onChange={(e) => updateLine(line.key, "description", e.target.value)}
                                        />
                                        <input
                                            className="line-input"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={line.quantity}
                                            onChange={(e) => updateLine(line.key, "quantity", e.target.value)}
                                        />
                                        <input
                                            className="line-input"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="0,00"
                                            value={line.unitPriceEuros}
                                            onChange={(e) => updateLine(line.key, "unitPriceEuros", e.target.value)}
                                        />
                                        <select
                                            className="line-input"
                                            value={line.taxId}
                                            onChange={(e) => updateLine(line.key, "taxId", e.target.value)}
                                        >
                                            <option value="">Sin IVA</option>
                                            {taxes.map((t) => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            className="line-delete-btn"
                                            onClick={() => removeLine(line.key)}
                                            title="Eliminar línea"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="form-row" style={{ marginTop: 16 }}>
                            <div className="form-group">
                                <label className="form-label">Notas</label>
                                <textarea
                                    className="form-textarea"
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    placeholder="Notas internas para la factura..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-2" style={{ marginTop: 16 }}>
                            <button
                                className="btn btn-primary"
                                onClick={handleCreate}
                                disabled={saving}
                            >
                                {saving ? "Guardando..." : "💾 Crear plantilla"}
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowForm(false)}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Templates list */}
            {loading ? (
                <div className="loading-center"><div className="spinner" /></div>
            ) : templates.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">🔄</div>
                    <h3>No hay plantillas recurrentes</h3>
                    <p>Crea una plantilla para generar facturas automáticamente cada mes</p>
                    <button
                        className="btn btn-primary"
                        style={{ marginTop: 12 }}
                        onClick={() => setShowForm(true)}
                    >
                        + Nueva plantilla
                    </button>
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Cliente</th>
                                <th>Día</th>
                                <th>Modo</th>
                                <th>Estado</th>
                                <th>Próxima ejecución</th>
                                <th>Ejecuciones</th>
                                <th style={{ width: 200 }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {templates.map((tpl) => {
                                const st = STATUS_BADGES[tpl.status] || { label: tpl.status, class: "badge-draft" };
                                const isExpanded = expandedId === tpl.id;

                                return (
                                    <>
                                        <tr key={tpl.id}>
                                            <td className="cell-primary" style={{ fontWeight: 500 }}>{tpl.name}</td>
                                            <td>{tpl.client?.name}</td>
                                            <td style={{ textAlign: "center" }}>{tpl.dayOfMonth}</td>
                                            <td>
                                                <span className={`badge ${tpl.mode === "GENERATE_AND_SEND" ? "badge-primary" : "badge-draft"}`}>
                                                    {tpl.mode === "GENERATE_AND_SEND" ? "Auto-enviar" : "Solo borrador"}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${st.class}`}>{st.label}</span>
                                            </td>
                                            <td>{new Date(tpl.nextRunDate).toLocaleDateString("es-ES")}</td>
                                            <td style={{ textAlign: "center" }}>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => handleExpand(tpl.id)}
                                                    title="Ver historial"
                                                >
                                                    {tpl._count?.runs || 0} {isExpanded ? "▲" : "▼"}
                                                </button>
                                            </td>
                                            <td>
                                                <div className="flex gap-1" style={{ flexWrap: "wrap" }}>
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() => handleRunNow(tpl.id)}
                                                        disabled={!!runningId}
                                                        title="Ejecutar ahora"
                                                    >
                                                        {runningId === tpl.id ? "⏳" : "▶"}
                                                    </button>
                                                    <button
                                                        className={`btn btn-sm ${tpl.status === "ACTIVE" ? "btn-warning" : "btn-success"}`}
                                                        onClick={() => handleToggleStatus(tpl)}
                                                        title={tpl.status === "ACTIVE" ? "Pausar" : "Reanudar"}
                                                        style={tpl.status === "ACTIVE" ? {} : {}}
                                                    >
                                                        {tpl.status === "ACTIVE" ? "⏸" : "▶"}
                                                    </button>
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => handleDelete(tpl.id)}
                                                        title="Eliminar"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && expandedRuns.length > 0 && (
                                            <tr key={`${tpl.id}-runs`}>
                                                <td colSpan={8} style={{ padding: 0, background: "var(--color-bg-subtle, #f5f6f8)" }}>
                                                    <div style={{ padding: "12px 20px" }}>
                                                        <strong style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                                                            Últimas ejecuciones
                                                        </strong>
                                                        <table className="data-table" style={{ marginTop: 8 }}>
                                                            <thead>
                                                                <tr>
                                                                    <th>Fecha</th>
                                                                    <th>Estado</th>
                                                                    <th>Factura</th>
                                                                    <th>Error</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {expandedRuns.map((run) => {
                                                                    const rst = RUN_STATUS_BADGES[run.status] || { label: run.status, class: "badge-draft" };
                                                                    return (
                                                                        <tr key={run.id}>
                                                                            <td>{new Date(run.runDate).toLocaleDateString("es-ES")}</td>
                                                                            <td><span className={`badge ${rst.class}`}>{rst.label}</span></td>
                                                                            <td>
                                                                                {run.generatedInvoiceId ? (
                                                                                    <Link href={`/invoices/${run.generatedInvoiceId}`} className="btn btn-ghost btn-sm">
                                                                                        Ver factura
                                                                                    </Link>
                                                                                ) : "—"}
                                                                            </td>
                                                                            <td style={{ color: "var(--color-danger)", fontSize: 13 }}>
                                                                                {run.errorMessage || "—"}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        {isExpanded && expandedRuns.length === 0 && (
                                            <tr key={`${tpl.id}-no-runs`}>
                                                <td colSpan={8} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 16 }}>
                                                    No hay ejecuciones todavía
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
