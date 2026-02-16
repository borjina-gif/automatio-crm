import { buildQuarterlyReport } from "@/lib/treasury-report";
import { NextResponse } from "next/server";

// GET /api/treasury/reports/quarter?year=2026&quarter=1&type=sales|purchases|all
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
        const quarter = parseInt(searchParams.get("quarter") || "1");
        const type = (searchParams.get("type") || "all") as "sales" | "purchases" | "all";

        if (isNaN(year) || quarter < 1 || quarter > 4) {
            return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
        }

        const report = await buildQuarterlyReport(year, quarter, type);
        return NextResponse.json(report);
    } catch (err) {
        console.error("Quarter report error:", err);
        return NextResponse.json({ error: "Error al generar informe" }, { status: 500 });
    }
}
