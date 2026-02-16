import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";

// GET /api/settings/users — list users (admin only)
export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== "ADMIN") {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
            },
            orderBy: { createdAt: "asc" },
        });

        return NextResponse.json(users);
    } catch (err) {
        console.error("Users GET error:", err);
        return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
    }
}

// POST /api/settings/users — create user (admin only)
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== "ADMIN") {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const body = await request.json();
        const { email, password, name, role } = body;

        if (!email || !password) {
            return NextResponse.json({ error: "Email y password son requeridos" }, { status: 400 });
        }

        // Check duplicate
        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists) {
            return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
        }

        const passwordHash = await hash(password, 12);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                name: name || "",
                role: role === "USER" ? "USER" : "ADMIN",
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        });

        return NextResponse.json(user, { status: 201 });
    } catch (err) {
        console.error("Users POST error:", err);
        return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 });
    }
}
