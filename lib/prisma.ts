import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { PrismaNeon } from '@prisma/adapter-neon'

neonConfig.webSocketConstructor = ws

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const adapter = new PrismaNeon({ connectionString: `${process.env.DATABASE_URL}` })

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter, log: ['warn', 'error'] })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

