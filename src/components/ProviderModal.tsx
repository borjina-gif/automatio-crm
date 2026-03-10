"use client";

import { useState } from "react";
import { useNotification } from "@/components/NotificationContext";

interface ProviderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (provider: { id: string; name: string }) => void;
}

export default function ProviderModal({ isOpen, onClose, onSuccess }: ProviderModalProps) {
    const { showError, showSuccess } = useNotification();
    const [saving, setSaving] = useState(false);

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
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Nombre / Razón social *</label>
                                <input name="name" type="text" className="form-input" required autoFocus />
                            </div>
                            <div className="form-group">
                                <label className="form-label">NIF / CIF</label>
                                <input name="taxId" type="text" className="form-input" placeholder="B12345678" />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input name="email" type="email" className="form-input" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Teléfono</label>
                                <input name="phone" type="text" className="form-input" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Dirección</label>
                            <input name="addressLine1" type="text" className="form-input" />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Ciudad</label>
                                <input name="city" type="text" className="form-input" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Código Postal</label>
                                <input name="postalCode" type="text" className="form-input" />
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
