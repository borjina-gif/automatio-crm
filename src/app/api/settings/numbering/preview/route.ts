import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/settings/numbering/preview?type=invoice|quote|credit_note|purchase_invoice
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = (searchParams.get("type") || "invoice").toUpperCase();

        const prefixes: Record<string, string> = {
            INVOICE: "FAC",
            QUOTE: "PRE",
            CREDIT_NOTE: "REC",
            PURCHASE_INVOICE: "FP",
        };

        const prefix = prefixes[type];
        if (!prefix) {
            return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
        }

        const company = await prisma.company.findFirst();
        if (!company) {
            return NextResponse.json({ error: "Empresa no configurada" }, { status: 404 });
        }

        const year = new Date().getFullYear();
        const counter = await prisma.documentCounter.findUnique({
            where: {
                companyId_year_docType: {
                    companyId: company.id,
                    year,
                    docType: type as any,
                },
            },
        });

        const nextNumber = (counter?.currentNumber || 0) + 1;

        return NextResponse.json({
            docType: type,
            prefix,
            year,
            nextNumber,
            formatted: `${prefix}-${year}-${String(nextNumber).padStart(4, "0")}`,
        });
    } catch (err) {
        console.error("Preview error:", err);
        return NextResponse.json({ error: "Error al previsualizar" }, { status: 500 });
    }
}
