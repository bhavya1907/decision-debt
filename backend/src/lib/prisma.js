import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across hot reloads / requests.
export const prisma = new PrismaClient();
