import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { NextResponse } from "next/server";

// GET /api/recurring-templates — List all recurring templates
export async function GET() {
    try {
        const templates = await prisma.recurringTemplate.findMany({
            include: {
                client: { select: { id: true, name: true, email: true } },
                lines: { include: { tax: true }, orderBy: { position: "asc" } },
                _count: { select: { runs: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(templates);
    } catch (error) {
        console.error("Error fetching recurring templates:", error);
        return NextResponse.json({ error: "Error al obtener plantillas recurrentes" }, { status: 500 });
    }
}

// POST /api/recurring-templates — Create a recurring template
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { clientId, name, dayOfMonth, startDate, mode, notes, lines } = body;

        if (!clientId) {
            return NextResponse.json({ error: "El cliente es obligatorio" }, { status: 400 });
        }
        if (!name) {
            return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
        }
        if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 28) {
            return NextResponse.json({ error: "El día del mes debe estar entre 1 y 28" }, { status: 400 });
        }
        if (!lines || lines.length === 0) {
            return NextResponse.json({ error: "Debe incluir al menos una línea" }, { status: 400 });
        }

        const company = await prisma.company.findFirst();
        if (!company) {
            return NextResponse.json({ error: "Empresa no configurada" }, { status: 500 });
        }

        // Calculate nextRunDate from startDate and dayOfMonth
        const start = new Date(startDate);
        const nextRun = new Date(start.getFullYear(), start.getMonth(), dayOfMonth);
        if (nextRun < start) {
            nextRun.setMonth(nextRun.getMonth() + 1);
        }

        const processedLines = (lines || []).map((line: any, idx: number) => ({
            position: idx + 1,
            description: line.description || "",
            quantity: parseFloat(line.quantity) || 0,
            unitPriceCents: parseInt(line.unitPriceCents) || 0,
            taxId: line.taxId || null,
        }));

        const template = await prisma.recurringTemplate.create({
            data: {
                companyId: company.id,
                clientId,
                name,
                frequency: "MONTHLY",
                dayOfMonth,
                startDate: start,
                nextRunDate: nextRun,
                mode: mode || "GENERATE_AND_SEND",
                status: "ACTIVE",
                notes: notes || null,
                lines: {
                    create: processedLines,
                },
            },
            include: {
                client: { select: { id: true, name: true, email: true } },
                lines: { include: { tax: true }, orderBy: { position: "asc" } },
            },
        });

        await logActivity(company.id, null, "recurring_template", template.id, "CREATE", {
            name: template.name,
            clientId: template.clientId,
        });

        return NextResponse.json(template, { status: 201 });
    } catch (error) {
        console.error("Error creating recurring template:", error);
        return NextResponse.json({ error: "Error al crear plantilla recurrente" }, { status: 500 });
    }
}
