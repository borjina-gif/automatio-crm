// ============================================================
// Automatio CRM — Document Numbering
// Annual reset · Atomic increment · Formatted strings
// ============================================================

import { prisma } from "./prisma";
import { DocType } from "@/generated/prisma/client";

/** Document type prefixes for formatted numbers */
const DOC_PREFIXES: Record<DocType, string> = {
    QUOTE: "PRE",
    INVOICE: "FAC",
    CREDIT_NOTE: "REC",
    PURCHASE_INVOICE: "FP",
};

/**
 * Get the next document number atomically.
 * Uses a Prisma interactive transaction to avoid race conditions.
 *
 * @returns The new number (integer) and the formatted string
 *
 * @example
 * const { number, formatted } = await getNextNumber("INVOICE", 2026, companyId);
 * // => { number: 1, formatted: "FAC-2026-0001" }
 */
export async function getNextNumber(
    docType: DocType,
    year: number,
    companyId: string
): Promise<{ number: number; formatted: string }> {
    return prisma.$transaction(async (tx) => {
        // Upsert: create counter if it doesn't exist for this year
        const counter = await tx.documentCounter.upsert({
            where: {
                companyId_year_docType: {
                    companyId,
                    year,
                    docType,
                },
            },
            update: {
                currentNumber: { increment: 1 },
            },
            create: {
                companyId,
                year,
                docType,
                currentNumber: 1,
            },
        });

        const prefix = DOC_PREFIXES[docType];
        const padded = String(counter.currentNumber).padStart(4, "0");

        return {
            number: counter.currentNumber,
            formatted: `${prefix}-${year}-${padded}`,
        };
    });
}

/**
 * Format an existing document number.
 *
 * @example formatDocNumber("INVOICE", 2026, 3) => "FAC-2026-0003"
 */
export function formatDocNumber(
    docType: DocType,
    year: number,
    number: number
): string {
    const prefix = DOC_PREFIXES[docType];
    const padded = String(number).padStart(4, "0");
    return `${prefix}-${year}-${padded}`;
}
