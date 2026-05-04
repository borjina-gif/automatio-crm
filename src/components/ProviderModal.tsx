"use client";

import { useState, useEffect } from "react";
import { useNotification } from "@/components/NotificationContext";

export interface ProviderModalInitialData {
    name?: string;
    taxId?: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    city?: string;
    postalCode?: string;
}

interface ProviderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (provider: { id: string; name: string }) => void;
    initialData?: ProviderModalInitialData;
}

export default function ProviderModal({ isOpen, onClose, onSuccess, initialData }: ProviderModalProps) {
    const { showError, showSuccess } = useNotification();
    const [saving, setSaving] = useState(false);
    const [formValues, setFormValues] = useState<ProviderModalInitialData>({});

    // Update form values when initialData changes or modal opens
    useEffect(() => {
        if (isOpen && initialData) {
            setFormValues(initialData);
        } else if (!isOpen) {
            setFormValues({});
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);

        const form = new FormData(e.currentTarget);
        const data = Object.fromEntries(form.entries());

        try {
            const res = await fetch("/api/providers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Error al crear proveedor");
            }

            const provider = await res.json();
            showSuccess("Proveedor creado correctamente");
            onSuccess({ id: provider.id, name: provider.name });
            onClose();
        } catch (err: any) {
            showError(err.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
                <div className="modal-header">
                    <h2 className="modal-title">Nuevo Proveedor</h2>
                    <button className="btn-close" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                        {initialData?.name && (
                            <div style={{
                                padding: '10px 14px',
                                borderRadius: 8,
                                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.06), rgba(99, 102, 241, 0.12))',
                                border: '1px solid rgba(99, 102, 241, 0.15)',
                                marginBottom: 16,
                                fontSize: 13,
                                color: 'var(--text-secondary, #6b7280)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="16" x2="12" y2="12" />
                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                </svg>
                                Datos pre-rellenados desde el escaneo de factura. Revisa y completa la información.
                            </div>
                        )}
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Nombre / Razón social *</label>
                                <input
                                    name="name"
                                    type="text"
                                    className="form-input"
                                    required
                                    autoFocus
                                    defaultValue={formValues.name || ""}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">NIF / CIF</label>
                                <input
                                    name="taxId"
                                    type="text"
                                    className="form-input"
                                    placeholder="B12345678"
                                    defaultValue={formValues.taxId || ""}
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input
                                    name="email"
                                    type="email"
                                    className="form-input"
                                    defaultValue={formValues.email || ""}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Teléfono</label>
                                <input
                                    name="phone"
                                    type="text"
                                    className="form-input"
                                    defaultValue={formValues.phone || ""}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Dirección</label>
                            <input
                                name="addressLine1"
                                type="text"
                                className="form-input"
                                defaultValue={formValues.addressLine1 || ""}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Ciudad</label>
                                <input
                                    name="city"
                                    type="text"
                                    className="form-input"
                                    defaultValue={formValues.city || ""}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Código Postal</label>
                                <input
                                    name="postalCode"
                                    type="text"
                                    className="form-input"
                                    defaultValue={formValues.postalCode || ""}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? "Guardando..." : "Crear Proveedor"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
