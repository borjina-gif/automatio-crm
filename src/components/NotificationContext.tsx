"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

/* ─── Types ─── */
type NotificationType = "success" | "error" | "info" | "confirm";

interface NotificationState {
    id: string;
    type: NotificationType;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
}

interface NotificationContextValue {
    showSuccess: (message: string) => void;
    showError: (message: string) => void;
    showInfo: (message: string) => void;
    showConfirm: (message: string) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotification() {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error("useNotification must be used within NotificationProvider");
    return ctx;
}

/* ─── Icons ─── */
function SuccessIcon() {
    return (
        <svg className="notif-modal-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" />
        </svg>
    );
}

function ErrorIcon() {
    return (
        <svg className="notif-modal-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
    );
}

function InfoIcon() {
    return (
        <svg className="notif-modal-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    );
}

function ConfirmIcon() {
    return (
        <svg className="notif-modal-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

const ICONS: Record<NotificationType, React.FC> = {
    success: SuccessIcon,
    error: ErrorIcon,
    info: InfoIcon,
    confirm: ConfirmIcon,
};

const TITLES: Record<NotificationType, string> = {
    success: "Operación exitosa",
    error: "Error",
    info: "Información",
    confirm: "Confirmación",
};

/* ─── Provider ─── */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notification, setNotification] = useState<NotificationState | null>(null);
    const [closing, setClosing] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const close = useCallback(() => {
        setClosing(true);
        setTimeout(() => {
            setNotification(null);
            setClosing(false);
        }, 200);
    }, []);

    // Auto-close for success/info
    useEffect(() => {
        if (notification && (notification.type === "success" || notification.type === "info")) {
            timerRef.current = setTimeout(() => close(), 3000);
            return () => { if (timerRef.current) clearTimeout(timerRef.current); };
        }
    }, [notification, close]);

    const show = useCallback((type: NotificationType, message: string) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setClosing(false);
        setNotification({ id: crypto.randomUUID(), type, message });
    }, []);

    const showSuccess = useCallback((message: string) => show("success", message), [show]);
    const showError = useCallback((message: string) => show("error", message), [show]);
    const showInfo = useCallback((message: string) => show("info", message), [show]);

    const showConfirm = useCallback((message: string): Promise<boolean> => {
        if (timerRef.current) clearTimeout(timerRef.current);
        return new Promise((resolve) => {
            setClosing(false);
            setNotification({
                id: crypto.randomUUID(),
                type: "confirm",
                message,
                onConfirm: () => { close(); resolve(true); },
                onCancel: () => { close(); resolve(false); },
            });
        });
    }, [close]);

    const IconComponent = notification ? ICONS[notification.type] : null;

    return (
        <NotificationContext.Provider value={{ showSuccess, showError, showInfo, showConfirm }}>
            {children}
            {notification && (
                <div
                    className={`notif-modal-overlay ${closing ? "notif-modal-closing" : ""}`}
                    onClick={() => {
                        if (notification.type === "confirm") {
                            notification.onCancel?.();
                        } else {
                            close();
                        }
                    }}
                >
                    <div
                        className={`notif-modal notif-modal-${notification.type} ${closing ? "notif-modal-slide-out" : ""}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button className="notif-modal-close" onClick={() => {
                            if (notification.type === "confirm") {
                                notification.onCancel?.();
                            } else {
                                close();
                            }
                        }}>
                            ✕
                        </button>

                        <div className={`notif-modal-icon notif-modal-icon-${notification.type}`}>
                            {IconComponent && <IconComponent />}
                        </div>

                        <h3 className="notif-modal-title">{TITLES[notification.type]}</h3>
                        <p className="notif-modal-message">{notification.message}</p>

                        <div className="notif-modal-actions">
                            {notification.type === "confirm" ? (
                                <>
                                    <button
                                        className="btn btn-ghost"
                                        onClick={() => notification.onCancel?.()}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => notification.onConfirm?.()}
                                    >
                                        Confirmar
                                    </button>
                                </>
                            ) : (
                                <button className="btn btn-primary" onClick={close}>
                                    Aceptar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </NotificationContext.Provider>
    );
}
