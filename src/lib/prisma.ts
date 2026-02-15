import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL!;
const isLocalhost = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
const pool = new pg.Pool({
    connectionString,
    ...(!isLocalhost && { ssl: { rejectUnauthorized: false } }),
});
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
