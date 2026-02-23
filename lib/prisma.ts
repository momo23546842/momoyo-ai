import 'dotenv/config'
import * as PrismaPkg from '@prisma/client'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { PrismaNeon } from '@prisma/adapter-neon'

neonConfig.webSocketConstructor = ws

// Resolve PrismaClient constructor from the package in a robust way
const PrismaClientConstructor: any = (PrismaPkg as any).PrismaClient ?? (PrismaPkg as any).default ?? PrismaPkg

const globalForPrisma = globalThis as unknown as {
  prisma: any | undefined
}

const adapter = new PrismaNeon({ connectionString: `${process.env.DATABASE_URL}` })

export const prisma =
  globalForPrisma.prisma ?? new PrismaClientConstructor({ adapter, log: ['warn', 'error'] })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

