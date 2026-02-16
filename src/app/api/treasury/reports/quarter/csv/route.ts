import { buildQuarterlyReport, reportToCSVRows } from "@/lib/treasury-report";
import { NextResponse } from "next/server";

// GET /api/treasury/reports/quarter/csv?year&quarter&type
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
        const rows = reportToCSVRows(report);

        // Build CSV string
        const csv = rows
            .map((row) =>
                row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")
            )
            .join("\n");

        const filename = `informe-Q${quarter}-${year}-${type}.csv`;

        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (err) {
        console.error("CSV export error:", err);
        return NextResponse.json({ error: "Error al exportar CSV" }, { status: 500 });
    }
}
