// ============================================================
// Automatio CRM — Constants
// Fixed company data, document prefixes, and app-wide config
// ============================================================

/** Fixed company data for Automatio solutions S.L */
export const COMPANY = {
    LEGAL_NAME: "Automatio solutions S.L",
    TRADE_NAME: "Automatio",
    EMAIL: "info@automatio.es",
    BANK_IBAN: "ES4120854503000330904034",
    COUNTRY: "ES",
    CURRENCY: "EUR",
    DEFAULT_PAYMENT_METHOD: "TRANSFER" as const,
} as const;

/** Default payment terms in days */
export const DEFAULT_PAYMENT_TERMS_DAYS = 30;

/** Fixed company UUID (matches seed) */
export const COMPANY_ID = "00000000-0000-0000-0000-000000000001";

/** Document type display names (Spanish) */
export const DOC_TYPE_LABELS = {
    QUOTE: "Presupuesto",
    INVOICE: "Factura",
    CREDIT_NOTE: "Factura Rectificativa",
    PURCHASE_INVOICE: "Factura de Proveedor",
} as const;

/** Quote status labels */
export const QUOTE_STATUS_LABELS = {
    DRAFT: "Borrador",
    SENT: "Enviado",
    ACCEPTED: "Aceptado",
    REJECTED: "Rechazado",
    EXPIRED: "Caducado",
} as const;

/** Invoice status labels */
export const INVOICE_STATUS_LABELS = {
    DRAFT: "Borrador",
    ISSUED: "Emitida",
    PARTIALLY_PAID: "Parcialmente pagada",
    PAID: "Pagada",
    VOID: "Anulada",
} as const;

/** Purchase invoice status labels */
export const PURCHASE_INVOICE_STATUS_LABELS = {
    DRAFT: "Borrador",
    BOOKED: "Registrada",
    PAID: "Pagada",
} as const;

/** Payment direction labels */
export const PAYMENT_DIRECTION_LABELS = {
    IN: "Cobro",
    OUT: "Pago",
} as const;

/** Payment method labels */
export const PAYMENT_METHOD_LABELS = {
    TRANSFER: "Transferencia",
    CASH: "Efectivo",
    CARD: "Tarjeta",
    OTHER: "Otro",
} as const;

/** Legal footer text for documents */
export const LEGAL_FOOTER = [
    "Este documento se emite conforme a los datos facilitados por el cliente. Revíselo y comunique cualquier error a la mayor brevedad.",
    "Salvo pacto por escrito, la forma de pago es transferencia bancaria a ES4120854503000330904034.",
    "Los importes e impuestos aplicados se calculan según la información y configuración fiscal disponible en el momento de emisión.",
    "Presupuestos: validez indicada en el propio documento. La aceptación implica conformidad con el alcance y precios descritos.",
    "Facturas: el impago en plazo podrá dar lugar a reclamación de cantidades conforme a la normativa aplicable.",
    "Protección de datos: los datos se tratan para la gestión administrativa y contractual. Puede ejercer sus derechos según la normativa vigente contactando en info@automatio.es.",
    "En caso de controversia, las partes se someten a la jurisdicción que corresponda legalmente.",
] as const;
