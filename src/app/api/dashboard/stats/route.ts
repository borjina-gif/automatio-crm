import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/dashboard/stats — Dashboard summary data
export async function GET() {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Invoiced this month (ISSUED or PAID invoices with issueDate in current month)
        const monthInvoices = await prisma.invoice.findMany({
            where: {
                status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
                issueDate: { gte: startOfMonth, lte: endOfMonth },
                deletedAt: null,
            },
            select: { totalCents: true },
        });
        const invoicedThisMonth = monthInvoices.reduce((sum, i) => sum + i.totalCents, 0);

        // Pending collection (ISSUED + PARTIALLY_PAID invoices)
        const pendingInvoices = await prisma.invoice.findMany({
            where: {
                status: { in: ["ISSUED", "PARTIALLY_PAID"] },
                deletedAt: null,
            },
            select: { totalCents: true, paidCents: true },
        });
        const pendingCollection = pendingInvoices.reduce(
            (sum, i) => sum + (i.totalCents - i.paidCents),
            0
        );
        const pendingCount = pendingInvoices.length;

        // Active clients
        const clientCount = await prisma.client.count({
            where: { deletedAt: null },
        });

        // Quotes this month
        const quotesThisMonth = await prisma.quote.count({
            where: {
                createdAt: { gte: startOfMonth, lte: endOfMonth },
                deletedAt: null,
            },
        });

        // Total invoiced this year
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const yearInvoices = await prisma.invoice.findMany({
            where: {
                status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
                issueDate: { gte: startOfYear },
                deletedAt: null,
            },
            select: { totalCents: true },
        });
        const invoicedThisYear = yearInvoices.reduce((sum, i) => sum + i.totalCents, 0);

        // Overdue invoices
        const overdueInvoices = await prisma.invoice.count({
            where: {
                status: { in: ["ISSUED", "PARTIALLY_PAID"] },
                dueDate: { lt: now },
                deletedAt: null,
            },
        });

        // Recent activity
        const recentActivity = await prisma.activityLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 10,
            include: { user: { select: { name: true, email: true } } },
        });

        return NextResponse.json({
            invoicedThisMonth,
            pendingCollection,
            pendingCount,
            clientCount,
            quotesThisMonth,
            invoicedThisYear,
            overdueInvoices,
            monthName: now.toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
            recentActivity,
        });
    } catch (error: any) {
        console.error("Error fetching dashboard stats:", error);
        return NextResponse.json({ error: error.message || "Error" }, { status: 500 });
    }
}
