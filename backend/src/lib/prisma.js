import { PrismaClient } from "@prisma/client";

// A local SQLite file makes the app work immediately after cloning. Set
// DATABASE_URL before starting the API to use another SQLite database.
process.env.DATABASE_URL ||= "file:./dev.db"; // relative to prisma/schema.prisma

// Reuse a single PrismaClient across hot reloads / requests.
export const prisma = new PrismaClient();
