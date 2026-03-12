import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // Prisma 7 will look for the URL in your config file, 
    // but you can still pass it here for safety:
    datasourceUrl: process.env.DATABASE_URL, 
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma