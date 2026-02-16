import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/treasury/summary?from&to&accountId?
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const fromStr = searchParams.get("from");
        const toStr = searchParams.get("to");
        const accountId = searchParams.get("accountId");

        // Default: current month
        const now = new Date();
        const from = fromStr ? new Date(fromStr) : new Date(now.getFullYear(), now.getMonth(), 1);
        const to = toStr ? new Date(toStr + "T23:59:59.999Z") : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // ── Bank account balances ───────────────────────
        const accounts = await prisma.bankAccount.findMany({
            where: { deletedAt: null, ...(accountId ? { id: accountId } : {}) },
            include: {
                transactions: {
                    where: { deletedAt: null },
                    select: { amountCents: true, date: true },
                },
            },
        });

        let totalBalance = 0;
        const accountSummaries = accounts.map((acc) => {
            const txTotal = acc.transactions.reduce((s, t) => s + t.amountCents, 0);
            const balance = acc.openingBalanceCents + txTotal;
            totalBalance += balance;
            return {
                id: acc.id,
                name: acc.name,
                iban: acc.iban,
                balanceCents: balance,
            };
        });

        // ── Cash in/out for period (from bank transactions) ──
        const periodTx = await prisma.bankTransaction.findMany({
            where: {
                deletedAt: null,
                date: { gte: from, lte: to },
                ...(accountId ? { accountId } : {}),
            },
            select: { amountCents: true, date: true },
        });

        let cashInCents = 0;
        let cashOutCents = 0;
        periodTx.forEach((t) => {
            if (t.amountCents > 0) cashInCents += t.amountCents;
            else cashOutCents += Math.abs(t.amountCents);
        });

        // ── Pending collection (sales: ISSUED invoices, not fully paid) ──
        const pendingInvoices = await prisma.invoice.findMany({
            where: {
                deletedAt: null,
                status: { in: ["ISSUED", "PARTIALLY_PAID"] },
            },
            select: { totalCents: true, paidCents: true },
        });
        const pendingCollectionCents = pendingInvoices.reduce(
            (s, i) => s + (i.totalCents - i.paidCents),
            0
        );

        // ── Pending payment (purchases: BOOKED, not paid) ──
        const pendingPurchases = await prisma.purchaseInvoice.findMany({
            where: {
                deletedAt: null,
                status: "BOOKED",
            },
            select: { totalCents: true, paidCents: true },
        });
        const pendingPaymentCents = pendingPurchases.reduce(
            (s, p) => s + (p.totalCents - p.paidCents),
            0
        );

        // ── Monthly evolution (last 12 months or period range) ──
        const evolution: { month: string; inCents: number; outCents: number }[] = [];
        const monthsDiff = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1;
        for (let i = 0; i < Math.min(monthsDiff, 12); i++) {
            const mStart = new Date(from.getFullYear(), from.getMonth() + i, 1);
            const mEnd = new Date(from.getFullYear(), from.getMonth() + i + 1, 0, 23, 59, 59, 999);
            const label = mStart.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });

            const mTx = periodTx.filter(
                (t) => t.date >= mStart && t.date <= mEnd
            );
            let mIn = 0, mOut = 0;
            mTx.forEach((t) => {
                if (t.amountCents > 0) mIn += t.amountCents;
                else mOut += Math.abs(t.amountCents);
            });
            evolution.push({ month: label, inCents: mIn, outCents: mOut });
        }

        return NextResponse.json({
            period: { from: from.toISOString(), to: to.toISOString() },
            totalBalanceCents: totalBalance,
            accounts: accountSummaries,
            cashInCents,
            cashOutCents,
            netCashCents: cashInCents - cashOutCents,
            pendingCollectionCents,
            pendingPaymentCents,
            evolution,
        });
    } catch (err) {
        console.error("Treasury summary error:", err);
        return NextResponse.json({ error: "Error al cargar resumen" }, { status: 500 });
    }
}
