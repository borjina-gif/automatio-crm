import { PrismaClient, TaxType } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
 // Empresa (si ya existe, no duplica)
let company = await prisma.company.findFirst();

if (!company) {
  company = await prisma.company.create({
  data: {
    legalName: "Automatio solutions S.L",
    tradeName: "Automatio",
    email: "info@automatio.es",
    bankIban: "ES4120854503000330904034",
    country: "ES",
  },
});

}

  // Impuestos
  const taxes: Array<{ name: string; type: TaxType; rate: number; companyId: string }> = [
  { name: "IVA 21%", type: "IVA" as TaxType, rate: 21.0, companyId: company.id },
  { name: "IVA 10%", type: "IVA" as TaxType, rate: 10.0, companyId: company.id },
  { name: "IVA 4%", type: "IVA" as TaxType, rate: 4.0, companyId: company.id },
];

  for (const t of taxes) {
    await prisma.tax.upsert({
      where: { id: t.name },
      update: { type: t.type, rate: t.rate },
      create: { id: t.name, name: t.name, type: t.type, rate: t.rate, companyId: t.companyId },
    });
  }

  console.log("Seed completado 🚀");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
