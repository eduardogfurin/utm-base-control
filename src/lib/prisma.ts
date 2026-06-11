import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  pgPool: pg.Pool;
};

function createPrismaClient() {
  // Supabase Transaction Mode (port 5432) caps at 15 simultaneous clients.
  // Share a single Pool with max=3 to leave headroom for other app processes.
  const pool =
    globalForPrisma.pgPool ??
    new pg.Pool({
      connectionString: process.env.DATABASE_URL!,
      max: 3,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

  if (!globalForPrisma.pgPool) globalForPrisma.pgPool = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
