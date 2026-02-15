import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/clients — List all clients (non-deleted)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get("q") || "";

        const clients = await prisma.client.findMany({
            where: {
                deletedAt: null,
                ...(q
                    ? {
                        OR: [
                            { name: { contains: q, mode: "insensitive" } },
                            { email: { contains: q, mode: "insensitive" } },
                            { taxId: { contains: q, mode: "insensitive" } },
                        ],
                    }
                    : {}),
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(clients);
    } catch (error) {
        console.error("Error fetching clients:", error);
        return NextResponse.json(
            { error: "Error al obtener clientes" },
            { status: 500 }
        );
    }
}

// POST /api/clients — Create a new client
export async function POST(request: Request) {
    try {
        const body = await request.json();

        const {
            name,
            taxId,
            email,
            phone,
            billingAddressLine1,
            billingCity,
            billingPostalCode,
            billingProvince,
            billingCountry,
            notes,
            paymentTermsDays,
        } = body;

        if (!name || name.trim() === "") {
            return NextResponse.json(
                { error: "El nombre es obligatorio" },
                { status: 400 }
            );
        }

        // Get the first company (single-tenant)
        const company = await prisma.company.findFirst();
        if (!company) {
            return NextResponse.json(
                { error: "Empresa no configurada" },
                { status: 500 }
            );
        }

        const client = await prisma.client.create({
            data: {
                companyId: company.id,
                name: name.trim(),
                taxId: taxId || null,
                email: email || null,
                phone: phone || null,
                billingAddressLine1: billingAddressLine1 || null,
                billingCity: billingCity || null,
                billingPostalCode: billingPostalCode || null,
                billingProvince: billingProvince || null,
                billingCountry: billingCountry || "ES",
                notes: notes || null,
                paymentTermsDays: paymentTermsDays ? parseInt(paymentTermsDays) : 30,
            },
        });

        return NextResponse.json(client, { status: 201 });
    } catch (error) {
        console.error("Error creating client:", error);
        return NextResponse.json(
            { error: "Error al crear cliente" },
            { status: 500 }
        );
    }
}
