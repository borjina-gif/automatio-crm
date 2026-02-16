import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/treasury/movements?from&to&accountId?&reconciled?
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const fromStr = searchParams.get("from");
        const toStr = searchParams.get("to");
        const accountId = searchParams.get("accountId");
        const reconciled = searchParams.get("reconciled");

        const now = new Date();
        const from = fromStr ? new Date(fromStr) : new Date(now.getFullYear(), now.getMonth(), 1);
        const to = toStr ? new Date(toStr + "T23:59:59.999Z") : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const movements = await prisma.bankTransaction.findMany({
            where: {
                deletedAt: null,
                date: { gte: from, lte: to },
                ...(accountId ? { accountId } : {}),
                ...(reconciled === "true" ? { isReconciled: true } : {}),
                ...(reconciled === "false" ? { isReconciled: false } : {}),
            },
            include: {
                account: { select: { id: true, name: true } },
                linkedInvoice: { select: { id: true, number: true, year: true } },
                linkedPurchaseInvoice: { select: { id: true, number: true, year: true } },
            },
            orderBy: { date: "desc" },
        });

        return NextResponse.json(movements);
    } catch (err) {
        console.error("Movements list error:", err);
        return NextResponse.json({ error: "Error al cargar movimientos" }, { status: 500 });
    }
}

// POST /api/treasury/movements — create manual movement
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { accountId, date, description, amountCents, counterpartyName, category } = body;

        if (!accountId || !date || !description || amountCents === undefined) {
            return NextResponse.json({ error: "Campos requeridos: accountId, date, description, amountCents" }, { status: 400 });
        }

        const movement = await prisma.bankTransaction.create({
            data: {
                accountId,
                date: new Date(date),
                description,
                amountCents: parseInt(amountCents),
                counterpartyName: counterpartyName || null,
                category: category || null,
            },
            include: {
                account: { select: { id: true, name: true } },
            },
        });

        return NextResponse.json(movement, { status: 201 });
    } catch (err) {
        console.error("Create movement error:", err);
        return NextResponse.json({ error: "Error al crear movimiento" }, { status: 500 });
    }
}
