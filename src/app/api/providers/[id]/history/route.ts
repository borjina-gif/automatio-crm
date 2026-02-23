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

    const purchaseInvoices = await prisma.purchaseInvoice.findMany({
        where: {
            providerId: id,
            deletedAt: null,
        },
        select: {
            id: true,
            providerInvoiceNumber: true,
            number: true,
            status: true,
            issueDate: true,
            totalCents: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
    });

    return NextResponse.json({ purchaseInvoices });
}
