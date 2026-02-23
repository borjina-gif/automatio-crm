import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;

    const [invoices, quotes] = await Promise.all([
        prisma.invoice.findMany({
            where: {
                clientId: id,
                deletedAt: null,
            },
            select: {
                id: true,
                number: true,
                status: true,
                issueDate: true,
                totalCents: true,
                type: true,
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        }),
        prisma.quote.findMany({
            where: {
                clientId: id,
                deletedAt: null,
            },
            select: {
                id: true,
                number: true,
                status: true,
                issueDate: true,
                totalCents: true,
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        }),
    ]);

    return NextResponse.json({ invoices, quotes });
}
