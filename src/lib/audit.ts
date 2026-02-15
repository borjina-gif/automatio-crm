// ============================================================
// Automatio CRM — Audit Log
// Records all significant changes for traceability
// ============================================================

import { prisma } from "./prisma";
import { AuditAction } from "@/generated/prisma/client";

/**
 * Log an activity to the audit trail.
 *
 * @param companyId - The company context
 * @param userId    - The acting user (null for system actions)
 * @param entityType - "quote", "invoice", "client", etc.
 * @param entityId  - UUID of the affected entity
 * @param action    - The action performed
 * @param metadata  - Optional JSON with extra details (old/new values, etc.)
 */
export async function logActivity(
    companyId: string,
    userId: string | null,
    entityType: string,
    entityId: string,
    action: AuditAction,
    metadata?: any
): Promise<void> {
    await prisma.activityLog.create({
        data: {
            companyId,
            userId,
            entityType,
            entityId,
            action,
            metadata: metadata ?? undefined,
        },
    });
}

/**
 * Get activity logs for a specific entity.
 */
export async function getEntityLogs(
    entityType: string,
    entityId: string,
    limit = 50
) {
    return prisma.activityLog.findMany({
        where: { entityType, entityId },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
            user: {
                select: { id: true, name: true, email: true },
            },
        },
    });
}

/**
 * Get recent activity logs for a company.
 */
export async function getRecentLogs(companyId: string, limit = 100) {
    return prisma.activityLog.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
            user: {
                select: { id: true, name: true, email: true },
            },
        },
    });
}
