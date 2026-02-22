import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/recurring-templates/[id] — Fetch single template with runs
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const template = await prisma.recurringTemplate.findUnique({
            where: { id },
            include: {
                client: { select: { id: true, name: true, email: true } },
                lines: { include: { tax: true }, orderBy: { position: "asc" } },
                runs: { orderBy: { createdAt: "desc" }, take: 10 },
            },
        });

        if (!template) {
            return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
        }

        return NextResponse.json(template);
    } catch (error) {
        return NextResponse.json({ error: "Error al obtener plantilla" }, { status: 500 });
    }
}

// PUT /api/recurring-templates/[id] — Update template (pause/resume, edit)
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const body = await request.json();
        const { status, name, dayOfMonth, mode, notes } = body;

        const updateData: any = {};
        if (status !== undefined) updateData.status = status;
        if (name !== undefined) updateData.name = name;
        if (dayOfMonth !== undefined) updateData.dayOfMonth = dayOfMonth;
        if (mode !== undefined) updateData.mode = mode;
        if (notes !== undefined) updateData.notes = notes;

        const template = await prisma.recurringTemplate.update({
            where: { id },
            data: updateData,
            include: {
                client: { select: { id: true, name: true, email: true } },
                lines: { include: { tax: true }, orderBy: { position: "asc" } },
            },
        });

        return NextResponse.json(template);
    } catch (error) {
        return NextResponse.json({ error: "Error al actualizar plantilla" }, { status: 500 });
    }
}

// DELETE /api/recurring-templates/[id] — Delete template
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        // Delete lines first due to cascade, then template
        await prisma.recurringTemplateLine.deleteMany({ where: { recurringTemplateId: id } });
        await prisma.recurringRun.deleteMany({ where: { recurringTemplateId: id } });
        await prisma.recurringTemplate.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Error al eliminar plantilla" }, { status: 500 });
    }
}
