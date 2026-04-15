import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/dashboard/stats — Enhanced Dashboard summary with chart data
export async function GET() {
    try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const startOfMonth = new Date(currentYear, now.getMonth(), 1);
        const endOfMonth = new Date(currentYear, now.getMonth() + 1, 0, 23, 59, 59);
        const startOfYear = new Date(currentYear, 0, 1);

        // ── Basic KPIs ───────────────────────────────────────

        // Invoiced this month
        const monthInvoices = await prisma.invoice.findMany({
            where: {
                status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
                issueDate: { gte: startOfMonth, lte: endOfMonth },
                deletedAt: null,
            },
            select: { totalCents: true },
        });
        const invoicedThisMonth = monthInvoices.reduce((sum, i) => sum + i.totalCents, 0);

        // Pending collection
        const pendingInvoices = await prisma.invoice.findMany({
            where: {
                status: { in: ["ISSUED", "PARTIALLY_PAID"] },
                deletedAt: null,
            },
            select: { totalCents: true, paidCents: true, dueDate: true },
        });
        const pendingCollection = pendingInvoices.reduce(
            (sum, i) => sum + (i.totalCents - i.paidCents), 0
        );
        const pendingCount = pendingInvoices.length;

        // Overdue invoices
        const overdueInvoices = pendingInvoices.filter(
            (i) => i.dueDate && i.dueDate < now
        ).length;

        // Active clients
        const clientCount = await prisma.client.count({ where: { deletedAt: null } });

        // Quotes this month
        const quotesThisMonth = await prisma.quote.count({
            where: { createdAt: { gte: startOfMonth, lte: endOfMonth }, deletedAt: null },
        });

        // Total invoiced this year
        const yearInvoices = await prisma.invoice.findMany({
            where: {
                status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
                issueDate: { gte: startOfYear },
                deletedAt: null,
            },
            select: { totalCents: true, issueDate: true },
        });
        const invoicedThisYear = yearInvoices.reduce((sum, i) => sum + i.totalCents, 0);

        // Purchases this year for comparison
        const yearPurchases = await prisma.purchaseInvoice.findMany({
            where: {
                status: { in: ["BOOKED", "PAID"] },
                issueDate: { gte: startOfYear },
                deletedAt: null,
            },
            select: { totalCents: true, issueDate: true },
        });
        const purchasedThisYear = yearPurchases.reduce((sum, p) => sum + p.totalCents, 0);

        // Providers count
        const providerCount = await prisma.provider.count({ where: { deletedAt: null } });

        // ── Monthly Chart Data (current year) ────────────────

        const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

        const monthlyData = MONTH_NAMES.map((name, idx) => ({
            name,
            ingresos: 0,
            gastos: 0,
        }));

        yearInvoices.forEach((inv) => {
            if (inv.issueDate) {
                const month = new Date(inv.issueDate).getMonth();
                monthlyData[month].ingresos += inv.totalCents;
            }
        });

        yearPurchases.forEach((p) => {
            if (p.issueDate) {
                const month = new Date(p.issueDate).getMonth();
                monthlyData[month].gastos += p.totalCents;
            }
        });

        // Convert to euros for chart
        const monthlyChart = monthlyData.map((m) => ({
            name: m.name,
            ingresos: Math.round(m.ingresos / 100),
            gastos: Math.round(m.gastos / 100),
        }));

        // ── Top 5 Clients ────────────────────────────────────

        const topClientsRaw = await prisma.invoice.groupBy({
            by: ["clientId"],
            where: {
                status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
                issueDate: { gte: startOfYear },
                deletedAt: null,
            },
            _sum: { totalCents: true },
            orderBy: { _sum: { totalCents: "desc" } },
            take: 5,
        });

        const clientIds = topClientsRaw.map((c) => c.clientId);
        const clientNames = await prisma.client.findMany({
            where: { id: { in: clientIds } },
            select: { id: true, name: true },
        });
        const clientNameMap = new Map(clientNames.map((c) => [c.id, c.name]));

        const topClients = topClientsRaw.map((c) => ({
            name: clientNameMap.get(c.clientId) || "—",
            value: Math.round((c._sum.totalCents || 0) / 100),
        }));

        // ── Previous month comparison ────────────────────────

        const prevMonthStart = new Date(currentYear, now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(currentYear, now.getMonth(), 0, 23, 59, 59);
        const prevMonthInvoices = await prisma.invoice.findMany({
            where: {
                status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
                issueDate: { gte: prevMonthStart, lte: prevMonthEnd },
                deletedAt: null,
            },
            select: { totalCents: true },
        });
        const invoicedPrevMonth = prevMonthInvoices.reduce((sum, i) => sum + i.totalCents, 0);
        const monthGrowth = invoicedPrevMonth > 0
            ? Math.round(((invoicedThisMonth - invoicedPrevMonth) / invoicedPrevMonth) * 100)
            : invoicedThisMonth > 0 ? 100 : 0;

        // ── Recent Activity ──────────────────────────────────

        const recentActivity = await prisma.activityLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 10,
            include: { user: { select: { name: true, email: true } } },
        });

        return NextResponse.json({
            // Basic KPIs
            invoicedThisMonth,
            invoicedPrevMonth,
            monthGrowth,
            pendingCollection,
            pendingCount,
            clientCount,
            providerCount,
            quotesThisMonth,
            invoicedThisYear,
            purchasedThisYear,
            overdueInvoices,
            monthName: now.toLocaleDateString("es-ES", { month: "long", year: "numeric" }),

            // Chart data
            monthlyChart,
            topClients,

            // Activity
            recentActivity,
        });
    } catch (error: any) {
        console.error("Error fetching dashboard stats:", error);
        return NextResponse.json({ error: error.message || "Error" }, { status: 500 });
    }
}
