// ============================================================
// Import Existing Invoices — F26/01 and F26/02
// Idempotent: safe to run multiple times
// Run with: npx tsx scripts/import-existing-invoices.ts
// ============================================================

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL!;
const isLocalhost = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
const pool = new pg.Pool({
    connectionString,
    ...(!isLocalhost && { ssl: { rejectUnauthorized: false } }),
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const INVOICES = [
    {
        number: "F26/01",
        year: 2026,
        issueDate: new Date("2026-01-02"),
        dueDate: new Date("2026-02-01"),
        lines: [
            {
                position: 1,
                description:
                    "Servicio Mensual Social Media — Gestión de redes sociales, planificación editorial y publicación de contenido",
                quantity: 1,
                unitPriceCents: 59750, // 597,50 €
            },
            {
                position: 2,
                description:
                    "Producción contenido audiovisual — Grabación, edición de vídeo y fotografía profesional",
                quantity: 1,
                unitPriceCents: 41000, // 410,00 €
            },
        ],
    },
    {
        number: "F26/02",
        year: 2026,
        issueDate: new Date("2026-02-02"),
        dueDate: new Date("2026-03-04"),
        lines: [
            {
                position: 1,
                description:
                    "Servicio Mensual Social Media — Gestión de redes sociales, planificación editorial y publicación de contenido",
                quantity: 1,
                unitPriceCents: 59750,
            },
            {
                position: 2,
                description:
                    "Producción contenido audiovisual — Grabación, edición de vídeo y fotografía profesional",
                quantity: 1,
                unitPriceCents: 41000,
            },
        ],
    },
];

const CLIENT = {
    name: "Grupo Gescasi, S.L.",
    taxId: "B06608111",
};

const IVA_RATE = 21; // 21%

async function main() {
    console.log("🚀 Starting invoice import...\n");

    // 1. Get or verify company
    const company = await prisma.company.findFirst();
    if (!company) {
        console.error("❌ No company found. Please set up the company first.");
        process.exit(1);
    }
    console.log(`✅ Company: ${company.legalName} (${company.id})`);

    // 2. Get or create IVA 21% tax
    let tax = await prisma.tax.findFirst({
        where: { companyId: company.id, rate: IVA_RATE, type: "IVA" },
    });

    if (!tax) {
        tax = await prisma.tax.create({
            data: {
                companyId: company.id,
                name: `IVA ${IVA_RATE}%`,
                type: "IVA",
                rate: IVA_RATE,
                isDefaultSales: true,
            },
        });
        console.log(`✅ Created tax: IVA ${IVA_RATE}%`);
    } else {
        console.log(`✅ Tax exists: ${tax.name} (${tax.id})`);
    }

    // 3. Upsert client by NIF
    let client = await prisma.client.findFirst({
        where: { companyId: company.id, taxId: CLIENT.taxId },
    });

    if (!client) {
        client = await prisma.client.create({
            data: {
                companyId: company.id,
                name: CLIENT.name,
                taxId: CLIENT.taxId,
            },
        });
        console.log(`✅ Created client: ${CLIENT.name}`);
    } else {
        console.log(`✅ Client exists: ${client.name} (${client.id})`);
    }

    // 4. Create invoices (idempotent — skip if number already exists)
    for (const inv of INVOICES) {
        const existing = await prisma.invoice.findFirst({
            where: {
                companyId: company.id,
                number: inv.number,
                year: inv.year,
            },
        });

        if (existing) {
            console.log(`⏩ Invoice ${inv.number} already exists — skipping`);
            continue;
        }

        // Calculate line totals
        const processedLines = inv.lines.map((line) => {
            const lineSubtotalCents = Math.round(line.quantity * line.unitPriceCents);
            const lineTaxCents = Math.round(lineSubtotalCents * IVA_RATE / 100);
            const lineTotalCents = lineSubtotalCents + lineTaxCents;

            return {
                position: line.position,
                description: line.description,
                quantity: line.quantity,
                unitPriceCents: line.unitPriceCents,
                taxId: tax!.id,
                lineSubtotalCents,
                lineTaxCents,
                lineTotalCents,
            };
        });

        const subtotalCents = processedLines.reduce((s, l) => s + l.lineSubtotalCents, 0);
        const taxCents = processedLines.reduce((s, l) => s + l.lineTaxCents, 0);
        const totalCents = subtotalCents + taxCents;

        const created = await prisma.invoice.create({
            data: {
                companyId: company.id,
                clientId: client.id,
                year: inv.year,
                number: inv.number,
                type: "INVOICE",
                status: "ISSUED",
                issueDate: inv.issueDate,
                dueDate: inv.dueDate,
                currency: "EUR",
                subtotalCents,
                taxCents,
                totalCents,
                paidCents: 0,
                lines: {
                    create: processedLines,
                },
            },
        });

        console.log(
            `✅ Created invoice ${inv.number} — ` +
            `Subtotal: ${(subtotalCents / 100).toFixed(2)}€, ` +
            `IVA: ${(taxCents / 100).toFixed(2)}€, ` +
            `Total: ${(totalCents / 100).toFixed(2)}€ ` +
            `(${created.id})`
        );
    }

    // 5. Set counter to 2 so next invoice is F26/03
    await prisma.documentCounter.upsert({
        where: {
            companyId_year_docType: {
                companyId: company.id,
                year: 2026,
                docType: "INVOICE",
            },
        },
        update: { currentNumber: 2 },
        create: {
            companyId: company.id,
            year: 2026,
            docType: "INVOICE",
            currentNumber: 2,
        },
    });
    console.log(`\n✅ Document counter set: INVOICE/2026 = 2 → next will be F26/03`);

    console.log("\n🎉 Import complete!");
}

main()
    .catch((err) => {
        console.error("❌ Import failed:", err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
