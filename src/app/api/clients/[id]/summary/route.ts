import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/clients/[id]/summary — Client 360° financial summary
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: clientId } = await params;

        // All invoices for this client
        const invoices = await prisma.invoice.findMany({
            where: { clientId, deletedAt: null },
            select: {
                id: true,
                totalCents: true,
                paidCents: true,
                status: true,
                issueDate: true,
                dueDate: true,
            },
        });

        // All quotes for this client
        const quotes = await prisma.quote.findMany({
            where: { clientId, deletedAt: null },
            select: {
                id: true,
                totalCents: true,
                status: true,
            },
        });

        const now = new Date();
        const activeStatuses = ["ISSUED", "PARTIALLY_PAID", "PAID"];

        const totalInvoiced = invoices
            .filter((i) => activeStatuses.includes(i.status))
            .reduce((sum, i) => sum + i.totalCents, 0);

        const totalPaid = invoices
            .filter((i) => activeStatuses.includes(i.status))
            .reduce((sum, i) => sum + i.paidCents, 0);

        const pendingBalance = invoices
            .filter((i) => ["ISSUED", "PARTIALLY_PAID"].includes(i.status))
            .reduce((sum, i) => sum + (i.totalCents - i.paidCents), 0);

        const overdueInvoices = invoices.filter(
            (i) =>
                ["ISSUED", "PARTIALLY_PAID"].includes(i.status) &&
                i.dueDate &&
                i.dueDate < now
        );
        const overdueAmount = overdueInvoices.reduce(
            (sum, i) => sum + (i.totalCents - i.paidCents), 0
        );

        const invoiceCount = invoices.filter((i) => activeStatuses.includes(i.status)).length;
        const averageTicket = invoiceCount > 0 ? Math.round(totalInvoiced / invoiceCount) : 0;

        const quoteCount = quotes.length;
        const acceptedQuotes = quotes.filter((q) => q.status === "ACCEPTED").length;
        const conversionRate = quoteCount > 0 ? Math.round((acceptedQuotes / quoteCount) * 100) : 0;

        // Last invoice date
        const lastInvoice = invoices
            .filter((i) => i.issueDate && activeStatuses.includes(i.status))
            .sort((a, b) => new Date(b.issueDate!).getTime() - new Date(a.issueDate!).getTime())[0];

        return NextResponse.json({
            totalInvoiced,
            totalPaid,
            pendingBalance,
            overdueAmount,
            overdueCount: overdueInvoices.length,
            invoiceCount,
            averageTicket,
            quoteCount,
            acceptedQuotes,
            conversionRate,
            lastInvoiceDate: lastInvoice?.issueDate || null,
        });
    } catch (error: any) {
        console.error("Client summary error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
