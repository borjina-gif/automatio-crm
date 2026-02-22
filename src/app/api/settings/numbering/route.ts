import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/settings/numbering — current counters
export async function GET() {
    try {
        const company = await prisma.company.findFirst();
        if (!company) {
            return NextResponse.json({ error: "Empresa no configurada" }, { status: 404 });
        }

        const year = new Date().getFullYear();

        const counters = await prisma.documentCounter.findMany({
            where: { companyId: company.id, year },
            orderBy: { docType: "asc" },
        });

        // Build response with all doc types
        const docTypes = ["QUOTE", "INVOICE", "CREDIT_NOTE", "PURCHASE_INVOICE"];
        const prefixes: Record<string, string> = {
            QUOTE: "PRE",
            INVOICE: "FAC",
            CREDIT_NOTE: "REC",
            PURCHASE_INVOICE: "FP",
        };

        const result = docTypes.map((dt) => {
            const counter = counters.find((c) => c.docType === dt);
            const currentNumber = counter?.currentNumber || 0;
            const nextNumber = currentNumber + 1;
            const prefix = prefixes[dt];

            // Format next number based on doc type
            let nextFormatted: string;
            if (dt === "INVOICE" || dt === "CREDIT_NOTE") {
                const yy = String(year % 100).padStart(2, "0");
                const nn = String(nextNumber).padStart(2, "0");
                nextFormatted = `${prefix}${yy}/${nn}`;
            } else {
                nextFormatted = `${prefix}-${year}-${String(nextNumber).padStart(4, "0")}`;
            }

            return {
                docType: dt,
                prefix,
                year,
                currentNumber,
                nextNumber,
                nextFormatted,
            };
        });

        return NextResponse.json(result);
    } catch (err) {
        console.error("Numbering GET error:", err);
        return NextResponse.json({ error: "Error al obtener numeración" }, { status: 500 });
    }
}

// PATCH /api/settings/numbering — reset counter (admin only)
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { docType, year: yearParam, resetTo } = body;

        const company = await prisma.company.findFirst();
        if (!company) {
            return NextResponse.json({ error: "Empresa no configurada" }, { status: 404 });
        }

        const year = yearParam || new Date().getFullYear();
        const newValue = resetTo !== undefined ? parseInt(resetTo) : 0;

        await prisma.documentCounter.upsert({
            where: {
                companyId_year_docType: {
                    companyId: company.id,
                    year,
                    docType,
                },
            },
            update: { currentNumber: newValue },
            create: {
                companyId: company.id,
                year,
                docType,
                currentNumber: newValue,
            },
        });

        return NextResponse.json({ success: true, docType, year, currentNumber: newValue });
    } catch (err) {
        console.error("Numbering PATCH error:", err);
        return NextResponse.json({ error: "Error al resetear numeración" }, { status: 500 });
    }
}
