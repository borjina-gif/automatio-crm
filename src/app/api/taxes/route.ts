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

// POST /api/taxes — create new tax
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, type, rate, isDefaultSales, isDefaultPurchases } = body;

        if (!name || !type || rate === undefined) {
            return NextResponse.json({ error: "Nombre, tipo y tasa son requeridos" }, { status: 400 });
        }

        const company = await prisma.company.findFirst();
        if (!company) {
            return NextResponse.json({ error: "Empresa no configurada" }, { status: 404 });
        }

        const tax = await prisma.tax.create({
            data: {
                companyId: company.id,
                name,
                type,
                rate: parseFloat(rate),
                isDefaultSales: isDefaultSales || false,
                isDefaultPurchases: isDefaultPurchases || false,
            },
        });

        return NextResponse.json(tax, { status: 201 });
    } catch (err) {
        console.error("Tax POST error:", err);
        return NextResponse.json({ error: "Error al crear impuesto" }, { status: 500 });
    }
}

