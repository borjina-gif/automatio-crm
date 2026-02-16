import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// PATCH /api/taxes/[id] — edit tax
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const body = await request.json();
        const data: Record<string, any> = {};

        if (body.name !== undefined) data.name = body.name;
        if (body.type !== undefined) data.type = body.type;
        if (body.rate !== undefined) data.rate = parseFloat(body.rate);
        if (body.isDefaultSales !== undefined) data.isDefaultSales = body.isDefaultSales;
        if (body.isDefaultPurchases !== undefined) data.isDefaultPurchases = body.isDefaultPurchases;
        if (body.isActive !== undefined) data.isActive = body.isActive;

        const tax = await prisma.tax.update({
            where: { id },
            data,
        });

        return NextResponse.json(tax);
    } catch (err) {
        console.error("Tax PATCH error:", err);
        return NextResponse.json({ error: "Error al actualizar impuesto" }, { status: 500 });
    }
}

// DELETE /api/taxes/[id] — soft deactivate
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        await prisma.tax.update({
            where: { id },
            data: { isActive: false },
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Tax DELETE error:", err);
        return NextResponse.json({ error: "Error al desactivar impuesto" }, { status: 500 });
    }
}
