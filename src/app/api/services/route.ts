import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/services
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get("q") || "";

        const services = await prisma.service.findMany({
            where: {
                ...(q
                    ? {
                        OR: [
                            { name: { contains: q, mode: "insensitive" } },
                            { description: { contains: q, mode: "insensitive" } },
                        ],
                    }
                    : {}),
            },
            include: { defaultTax: true },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(services);
    } catch (error) {
        console.error("Error fetching services:", error);
        return NextResponse.json({ error: "Error al obtener servicios" }, { status: 500 });
    }
}

// POST /api/services
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, description, unitPriceCents, defaultTaxId } = body;

        if (!name || name.trim() === "") {
            return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
        }

        const company = await prisma.company.findFirst();
        if (!company) {
            return NextResponse.json({ error: "Empresa no configurada" }, { status: 500 });
        }

        const service = await prisma.service.create({
            data: {
                companyId: company.id,
                name: name.trim(),
                description: description || null,
                unitPriceCents: parseInt(unitPriceCents) || 0,
                defaultTaxId: defaultTaxId || null,
            },
            include: { defaultTax: true },
        });

        return NextResponse.json(service, { status: 201 });
    } catch (error) {
        console.error("Error creating service:", error);
        return NextResponse.json({ error: "Error al crear servicio" }, { status: 500 });
    }
}
