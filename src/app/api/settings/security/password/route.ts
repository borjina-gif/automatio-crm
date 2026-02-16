import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";

// POST /api/settings/security/password — change own password
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || !session.sub) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: "Contraseña actual y nueva son requeridas" }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: "La nueva contraseña debe tener al menos 6 caracteres" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.sub as string },
        });

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        const isValid = await compare(currentPassword, user.passwordHash);
        if (!isValid) {
            return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 403 });
        }

        const passwordHash = await hash(newPassword, 12);

        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash },
        });

        return NextResponse.json({ success: true, message: "Contraseña cambiada correctamente" });
    } catch (err) {
        console.error("Password change error:", err);
        return NextResponse.json({ error: "Error al cambiar contraseña" }, { status: 500 });
    }
}
