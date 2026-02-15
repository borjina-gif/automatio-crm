// ============================================================
// Automatio CRM — Money Utilities
// All internal amounts are stored in CENTS (integer)
// Display currency is always EUR
// ============================================================

/**
 * Convert euros (decimal) to cents (integer).
 * Rounds to nearest cent to avoid floating-point drift.
 *
 * @example eurosToCents(21.50) => 2150
 * @example eurosToCents(99.999) => 10000
 */
export function eurosToCents(euros: number): number {
    return Math.round(euros * 100);
}

/**
 * Convert cents (integer) to euros (decimal).
 *
 * @example centsToEuros(2150) => 21.50
 */
export function centsToEuros(cents: number): number {
    return cents / 100;
}

/**
 * Format cents as a localized EUR currency string.
 *
 * @example formatCurrency(215099) => "2.150,99 €"
 */
export function formatCurrency(cents: number): string {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(centsToEuros(cents));
}

/**
 * Calculate line subtotal in cents.
 * subtotal = quantity × unitPriceCents
 */
export function calcLineSubtotal(
    quantity: number,
    unitPriceCents: number
): number {
    return Math.round(quantity * unitPriceCents);
}

/**
 * Calculate tax amount in cents for a line.
 * taxAmount = subtotalCents × (rate / 100)
 *
 * Supports negative rates (e.g., IRPF -15%).
 */
export function calcLineTax(subtotalCents: number, taxRate: number): number {
    return Math.round(subtotalCents * (taxRate / 100));
}

/**
 * Calculate full line totals.
 * Returns { subtotal, tax, total } all in cents.
 */
export function calcLineTotals(
    quantity: number,
    unitPriceCents: number,
    taxRate: number
): { subtotalCents: number; taxCents: number; totalCents: number } {
    const subtotalCents = calcLineSubtotal(quantity, unitPriceCents);
    const taxCents = calcLineTax(subtotalCents, taxRate);
    return {
        subtotalCents,
        taxCents,
        totalCents: subtotalCents + taxCents,
    };
}

/**
 * Sum document totals from an array of line totals.
 */
export function calcDocumentTotals(
    lines: Array<{
        lineSubtotalCents: number;
        lineTaxCents: number;
        lineTotalCents: number;
    }>
): { subtotalCents: number; taxCents: number; totalCents: number } {
    return lines.reduce(
        (acc, line) => ({
            subtotalCents: acc.subtotalCents + line.lineSubtotalCents,
            taxCents: acc.taxCents + line.lineTaxCents,
            totalCents: acc.totalCents + line.lineTotalCents,
        }),
        { subtotalCents: 0, taxCents: 0, totalCents: 0 }
    );
}
