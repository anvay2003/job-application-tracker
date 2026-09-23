import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Lets Vercel's Fluid Compute drain/close idle connections before a
// suspended function is frozen, instead of leaving stale sockets that
// come back corrupted (this is what was causing the "emptyQuery" errors).
attachDatabasePool(pool);

const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}