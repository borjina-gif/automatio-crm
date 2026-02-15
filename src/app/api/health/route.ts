import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/health — Check DB connectivity
export async function GET() {
    try {
        await prisma.$queryRawUnsafe("SELECT 1");
        return NextResponse.json({
            status: "ok",
            db: true,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return NextResponse.json(
            {
                status: "error",
                db: false,
                error: "Database connection failed",
                timestamp: new Date().toISOString(),
            },
            { status: 503 }
        );
    }
}
