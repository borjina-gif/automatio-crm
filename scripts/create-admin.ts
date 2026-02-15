/**
 * Create Admin User Script
 *
 * Usage: npx tsx scripts/create-admin.ts
 *
 * Reads ADMIN_EMAIL and ADMIN_PASSWORD from .env
 * Creates or updates the admin user in the database.
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { hash } from "bcryptjs";

// tsx automatically loads .env when present
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
        console.error("❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
        process.exit(1);
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.upsert({
        where: { email },
        update: { passwordHash },
        create: {
            email,
            passwordHash,
            name: "Administrador",
            role: "ADMIN",
        },
    });

    console.log(`✅ Admin user created/updated:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name:  ${user.name}`);
    console.log(`   Role:  ${user.role}`);
    console.log(`   ID:    ${user.id}`);
}

main()
    .catch((e) => {
        console.error("❌ Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
