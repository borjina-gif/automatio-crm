import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// GET /api/health — Check DB connectivity
// Uses its own connection to isolate issues from the shared prisma instance
export async function GET() {
    const connStr = process.env.DATABASE_URL;

    if (!connStr) {
        return NextResponse.json({
            status: "error",
            db: false,
            error: "DATABASE_URL not set",
            timestamp: new Date().toISOString(),
        }, { status: 503 });
    }

    let pool: pg.Pool | null = null;
    try {
        const isLocal = connStr.includes("localhost") || connStr.includes("127.0.0.1");
        pool = new pg.Pool({
            connectionString: connStr,
            max: 1,
            connectionTimeoutMillis: 10000,
            ...(!isLocal && { ssl: { rejectUnauthorized: false } }),
        });

        // Test raw pg connection first
        const client = await pool.connect();
        const result = await client.query("SELECT 1 as check");
        client.release();

        return NextResponse.json({
            status: "ok",
            db: true,
            check: result.rows[0],
            ssl: !isLocal,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        return NextResponse.json({
            status: "error",
            db: false,
            error: error.message || "Unknown error",
            code: error.code || null,
            timestamp: new Date().toISOString(),
        }, { status: 503 });
    } finally {
        if (pool) await pool.end().catch(() => { });
    }
}
