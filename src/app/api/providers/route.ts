import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/providers — List all providers (non-deleted)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get("q") || "";

        const providers = await prisma.provider.findMany({
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

        return NextResponse.json(providers);
    } catch (error) {
        console.error("Error fetching providers:", error);
        return NextResponse.json(
            { error: "Error al obtener proveedores" },
            { status: 500 }
        );
    }
}

// POST /api/providers — Create a new provider
export async function POST(request: Request) {
    try {
        const body = await request.json();

        const {
            name,
            taxId,
            email,
            phone,
            addressLine1,
            city,
            postalCode,
            province,
            country,
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

        const provider = await prisma.provider.create({
            data: {
                companyId: company.id,
                name: name.trim(),
                taxId: taxId || null,
                email: email || null,
                phone: phone || null,
                addressLine1: addressLine1 || null,
                city: city || null,
                postalCode: postalCode || null,
                province: province || null,
                country: country || "ES",
                notes: notes || null,
                paymentTermsDays: paymentTermsDays ? parseInt(paymentTermsDays) : 30,
            },
        });

        return NextResponse.json(provider, { status: 201 });
    } catch (error) {
        console.error("Error creating provider:", error);
        return NextResponse.json(
            { error: "Error al crear proveedor" },
            { status: 500 }
        );
    }
}
