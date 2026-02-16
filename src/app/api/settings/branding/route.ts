import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/settings/branding
export async function GET() {
    try {
        const company = await prisma.company.findFirst();
        if (!company) {
            return NextResponse.json({ error: "Empresa no configurada" }, { status: 404 });
        }

        let branding = await prisma.branding.findUnique({
            where: { companyId: company.id },
        });

        if (!branding) {
            branding = await prisma.branding.create({
                data: {
                    companyId: company.id,
                    primaryColor: "#1B1660",
                },
            });
        }

        return NextResponse.json(branding);
    } catch (err) {
        console.error("Branding GET error:", err);
        return NextResponse.json({ error: "Error al obtener branding" }, { status: 500 });
    }
}

// PATCH /api/settings/branding
export async function PATCH(request: Request) {
    try {
        const body = await request.json();

        const company = await prisma.company.findFirst();
        if (!company) {
            return NextResponse.json({ error: "Empresa no configurada" }, { status: 404 });
        }

        const allowedFields = ["logoBase64", "darkLogoBase64", "appName", "primaryColor", "footerText"];
        const data: Record<string, any> = {};
        allowedFields.forEach((field) => {
            if (body[field] !== undefined) {
                data[field] = body[field];
            }
        });

        const branding = await prisma.branding.upsert({
            where: { companyId: company.id },
            update: data,
            create: {
                companyId: company.id,
                ...data,
            },
        });

        return NextResponse.json(branding);
    } catch (err) {
        console.error("Branding PATCH error:", err);
        return NextResponse.json({ error: "Error al guardar branding" }, { status: 500 });
    }
}
