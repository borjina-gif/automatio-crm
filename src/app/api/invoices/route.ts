import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/invoices — List invoices
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");

        const invoices = await prisma.invoice.findMany({
            where: {
                deletedAt: null,
                ...(status ? { status: status as any } : {}),
            },
            include: {
                client: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(invoices);
    } catch (error) {
        console.error("Error fetching invoices:", error);
        return NextResponse.json({ error: "Error al obtener facturas" }, { status: 500 });
    }
}
