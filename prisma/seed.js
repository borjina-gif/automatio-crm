const { PrismaClient } = require('../src/generated/prisma')

const prisma = new PrismaClient()

async function main() {
  await prisma.company.create({
    data: {
      legal_name: "Automatio solutions S.L",
      trade_name: "Automatio",
      email: "info@automatio.es",
      bank_iban: "ES4120854503000330904034"
    }
  })

  await prisma.taxes.createMany({
    data: [
      { name: "IVA 21%", type: "iva", rate: 21.0 },
      { name: "IVA 10%", type: "iva", rate: 10.0 },
      { name: "IVA 4%", type: "iva", rate: 4.0 }
    ]
  })

  console.log("Seed completado 🚀")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })

