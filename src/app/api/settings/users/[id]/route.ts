import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";

// PATCH /api/settings/users/[id] — edit user (admin only)
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await getSession();
        if (!session || session.role !== "ADMIN") {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const body = await request.json();
        const data: Record<string, any> = {};

        if (body.name !== undefined) data.name = body.name;
        if (body.role !== undefined) data.role = body.role;
        if (body.isActive !== undefined) data.isActive = body.isActive;

        const user = await prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
            },
        });

        return NextResponse.json(user);
    } catch (err) {
        console.error("User PATCH error:", err);
        return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 });
    }
}

// POST /api/settings/users/[id] — reset password (admin only)
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await getSession();
        if (!session || session.role !== "ADMIN") {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const body = await request.json();
        const { newPassword } = body;

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
        }

        const passwordHash = await hash(newPassword, 12);

        await prisma.user.update({
            where: { id },
            data: { passwordHash },
        });

        return NextResponse.json({ success: true, message: "Contraseña reseteada" });
    } catch (err) {
        console.error("User reset password error:", err);
        return NextResponse.json({ error: "Error al resetear contraseña" }, { status: 500 });
    }
}
