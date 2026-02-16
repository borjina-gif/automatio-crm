import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/settings/company — fetch first company
export async function GET() {
    try {
        let company = await prisma.company.findFirst();

        if (!company) {
            // Auto-create a default company
            company = await prisma.company.create({
                data: {
                    legalName: "Mi Empresa S.L.",
                    country: "ES",
                },
            });
        }

        return NextResponse.json(company);
    } catch (err) {
        console.error("Company GET error:", err);
        return NextResponse.json({ error: "Error al obtener empresa" }, { status: 500 });
    }
}

// PATCH /api/settings/company — update company
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        let company = await prisma.company.findFirst();

        if (!company) {
            return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
        }

        const allowedFields = [
            "legalName", "tradeName", "taxId",
            "addressLine1", "addressLine2", "city", "postalCode", "province", "country",
            "email", "phone", "bankIban",
        ];

        const data: Record<string, any> = {};
        allowedFields.forEach((field) => {
            if (body[field] !== undefined) {
                data[field] = body[field] || null;
            }
        });

        company = await prisma.company.update({
            where: { id: company.id },
            data,
        });

        return NextResponse.json(company);
    } catch (err) {
        console.error("Company PATCH error:", err);
        return NextResponse.json({ error: "Error al guardar empresa" }, { status: 500 });
    }
}
