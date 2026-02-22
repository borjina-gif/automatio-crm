"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

function formatCents(cents: number): string {
    return (cents / 100).toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
    DRAFT: { label: "Borrador", class: "badge-draft" },
    ISSUED: { label: "Emitida", class: "badge-info" },
    PARTIALLY_PAID: { label: "Parcial", class: "badge-warning" },
    PAID: { label: "Pagada", class: "badge-success" },
    VOID: { label: "Anulada", class: "badge-danger" },
};

export default function InvoiceDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [documents, setDocuments] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetch(`/api/invoices/${id}`)
            .then((r) => r.json())
            .then((data) => {
                setInvoice(data);
                // Fetch documents after loading invoice
                fetch(`/api/documents/upload?entityType=INVOICE&entityId=${id}`)
                    .then((r) => r.json())
                    .then((docs) => { if (Array.isArray(docs)) setDocuments(docs); })
                    .catch(console.error);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    // ── ACTION HANDLERS ─────────────────────────────────

    async function handleEmit() {
        if (!confirm("¿Emitir factura? Se asignará número definitivo.")) return;
        setActionLoading("emit");
        setError("");
        try {
            const res = await fetch(`/api/invoices/${id}/emit`, { method: "POST" });
            if (!res.ok) throw new Error((await res.json()).error);
            const updated = await res.json();
            setInvoice(updated);
            setSuccess("✅ Factura emitida correctamente");
            setTimeout(() => setSuccess(""), 4000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading("");
        }
    }

    async function handleDownloadPDF() {
        setActionLoading("pdf");
        try {
            const res = await fetch(`/api/invoices/${id}/pdf`);
            if (!res.ok) throw new Error("Error al generar PDF");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "factura.pdf";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading("");
        }
    }

    async function handleSendEmail() {
        if (!confirm("¿Enviar factura por email al cliente?")) return;
        setActionLoading("send");
        setError("");
        try {
            const res = await fetch(`/api/invoices/${id}/send`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSuccess(`📧 Enviado a ${data.sentTo}`);
            setTimeout(() => setSuccess(""), 5000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading("");
        }
    }

    async function handleDelete() {
        if (!confirm("¿Eliminar esta factura?")) return;
        try {
            const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Error al eliminar");
            router.push("/invoices");
        } catch (err: any) {
            setError(err.message);
        }
    }

    if (loading) {
        return <div className="loading-center"><div className="spinner" /></div>;
    }

    if (!invoice || invoice.error) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <h3>Factura no encontrada</h3>
                <Link href="/invoices" className="btn btn-primary mt-4">← Volver</Link>
            </div>
        );
    }

    const st = STATUS_LABELS[invoice.status] || { label: invoice.status, class: "badge-draft" };
    const isDraft = invoice.status === "DRAFT";
    const isIssued = invoice.status === "ISSUED";
    const hasNumber = !!invoice.number;

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>
                        {invoice.number || "Factura (Borrador)"}
                    </h1>
                    <p className="page-header-sub">
                        <span className={`badge ${st.class}`}>{st.label}</span>
                        {" · "}
                        {invoice.client?.name}
                        {invoice.type === "CREDIT_NOTE" && (
                            <span className="badge badge-warning" style={{ marginLeft: 8 }}>Rectificativa</span>
                        )}
                    </p>
                </div>
                <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                    {/* DRAFT actions */}
                    {isDraft && (
                        <>
                            <button onClick={handleEmit} className="btn btn-primary" disabled={!!actionLoading}>
                                {actionLoading === "emit" ? "Emitiendo..." : "📋 Emitir"}
                            </button>
                            <button onClick={handleDownloadPDF} className="btn btn-secondary" disabled={!!actionLoading}>
                                {actionLoading === "pdf" ? "Generando..." : "📄 PDF"}
                            </button>
                            <button onClick={handleDelete} className="btn btn-danger btn-sm">🗑️</button>
                        </>
                    )}
                    {/* ISSUED actions */}
                    {isIssued && (
                        <>
                            <button onClick={handleDownloadPDF} className="btn btn-secondary" disabled={!!actionLoading}>
                                {actionLoading === "pdf" ? "Generando..." : "📄 PDF"}
                            </button>
                            <button onClick={handleSendEmail} className="btn btn-primary" disabled={!!actionLoading}>
                                {actionLoading === "send" ? "Enviando..." : "📧 Enviar"}
                            </button>
                        </>
                    )}
                    {/* PAID/PARTIALLY_PAID/VOID: just PDF */}
                    {(invoice.status === "PAID" || invoice.status === "PARTIALLY_PAID" || invoice.status === "VOID") && hasNumber && (
                        <button onClick={handleDownloadPDF} className="btn btn-secondary" disabled={!!actionLoading}>
                            📄 PDF
                        </button>
                    )}
                    <Link href="/invoices" className="btn btn-ghost">← Volver</Link>
                </div>
            </div>

            {error && (
                <div className="toast toast-error" style={{ position: "static", marginBottom: 16 }}>
                    {error}
                </div>
            )}
            {success && (
                <div className="toast toast-success" style={{ position: "static", marginBottom: 16 }}>
                    {success}
                </div>
            )}

            {/* Invoice info */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-body">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Cliente</label>
                            <p style={{ fontSize: 14, fontWeight: 500 }}>{invoice.client?.name}</p>
                        </div>
                        <div className="form-group">
                            <label className="form-label">NIF</label>
                            <p style={{ fontSize: 14, fontFamily: "var(--font-mono)" }}>{invoice.client?.taxId || "—"}</p>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Fecha emisión</label>
                            <p style={{ fontSize: 14 }}>
                                {invoice.issueDate
                                    ? new Date(invoice.issueDate).toLocaleDateString("es-ES")
                                    : "Sin emitir"}
                            </p>
                        </div>
                        {invoice.dueDate && (
                            <div className="form-group">
                                <label className="form-label">Vencimiento</label>
                                <p style={{ fontSize: 14 }}>{new Date(invoice.dueDate).toLocaleDateString("es-ES")}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Lines table */}
            <div className="table-container" style={{ marginBottom: 20 }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: 30 }}>#</th>
                            <th>Descripción</th>
                            <th>Cantidad</th>
                            <th>Precio</th>
                            <th>Impuesto</th>
                            <th>Subtotal</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(invoice.lines || []).map((line: any) => (
                            <tr key={line.id}>
                                <td>{line.position}</td>
                                <td className="cell-primary">{line.description}</td>
                                <td>{Number(line.quantity)}</td>
                                <td className="cell-amount">{formatCents(line.unitPriceCents)} €</td>
                                <td>{line.tax?.name || "—"}</td>
                                <td className="cell-amount">{formatCents(line.lineSubtotalCents)} €</td>
                                <td className="cell-amount" style={{ fontWeight: 600 }}>{formatCents(line.lineTotalCents)} €</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div className="card">
                <div className="card-body">
                    <div className="lines-totals" style={{ marginLeft: "auto" }}>
                        <div className="lines-totals-row">
                            <span className="lines-totals-label">Subtotal</span>
                            <span className="lines-totals-value">{formatCents(invoice.subtotalCents)} €</span>
                        </div>
                        <div className="lines-totals-row">
                            <span className="lines-totals-label">Impuestos</span>
                            <span className="lines-totals-value">{formatCents(invoice.taxCents)} €</span>
                        </div>
                        <div className="lines-totals-row total">
                            <span className="lines-totals-label">Total</span>
                            <span className="lines-totals-value">{formatCents(invoice.totalCents)} €</span>
                        </div>
                        {invoice.paidCents > 0 && (
                            <>
                                <div className="lines-totals-row" style={{ color: "var(--color-success)" }}>
                                    <span className="lines-totals-label">Pagado</span>
                                    <span className="lines-totals-value">{formatCents(invoice.paidCents)} €</span>
                                </div>
                                <div className="lines-totals-row" style={{ color: "var(--color-warning)" }}>
                                    <span className="lines-totals-label">Pendiente</span>
                                    <span className="lines-totals-value">{formatCents(invoice.totalCents - invoice.paidCents)} €</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Adjuntos */}
            <div className="card" style={{ marginTop: 20 }}>
                <div className="card-body">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>📎 Adjuntos</h3>
                        <label
                            className="btn btn-secondary btn-sm"
                            style={{ cursor: "pointer", opacity: uploading ? 0.6 : 1 }}
                        >
                            {uploading ? "Subiendo..." : "+ Subir archivo"}
                            <input
                                type="file"
                                style={{ display: "none" }}
                                disabled={uploading}
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setUploading(true);
                                    setError("");
                                    try {
                                        const fd = new FormData();
                                        fd.append("file", file);
                                        fd.append("entityType", "INVOICE");
                                        fd.append("entityId", id as string);
                                        const res = await fetch("/api/documents/upload", {
                                            method: "POST",
                                            body: fd,
                                        });
                                        if (!res.ok) throw new Error((await res.json()).error);
                                        const doc = await res.json();
                                        setDocuments((prev) => [doc, ...prev]);
                                        setSuccess("✅ Archivo subido");
                                        setTimeout(() => setSuccess(""), 3000);
                                    } catch (err: any) {
                                        setError(err.message || "Error al subir archivo");
                                    } finally {
                                        setUploading(false);
                                        e.target.value = "";
                                    }
                                }}
                            />
                        </label>
                    </div>

                    {documents.length === 0 ? (
                        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                            Sin adjuntos. Sube facturas originales, contratos u otros documentos.
                        </p>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Archivo</th>
                                    <th>Tamaño</th>
                                    <th>Fecha</th>
                                    <th style={{ width: 100 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.map((doc) => (
                                    <tr key={doc.id}>
                                        <td className="cell-primary">{doc.filename}</td>
                                        <td>{(doc.sizeBytes / 1024).toFixed(1)} KB</td>
                                        <td>{new Date(doc.createdAt).toLocaleDateString("es-ES")}</td>
                                        <td style={{ display: "flex", gap: 6 }}>
                                            <a
                                                href={`/api/documents/${doc.id}/download`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn btn-ghost btn-sm"
                                            >
                                                ⬇
                                            </a>
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (!confirm("¿Eliminar este adjunto?")) return;
                                                    try {
                                                        const res = await fetch(`/api/documents/${doc.id}/download`, {
                                                            method: "DELETE",
                                                        });
                                                        if (!res.ok) throw new Error("Error");
                                                        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
                                                    } catch {
                                                        setError("Error al eliminar adjunto");
                                                    }
                                                }}
                                            >
                                                🗑
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </>
    );
}
