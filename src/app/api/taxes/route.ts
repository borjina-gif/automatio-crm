import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/taxes — Used by service forms and quote/invoice line editors
export async function GET() {
    try {
        const taxes = await prisma.tax.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" },
        });
        return NextResponse.json(taxes);
    } catch (error) {
        return NextResponse.json({ error: "Error al obtener impuestos" }, { status: 500 });
    }
}
