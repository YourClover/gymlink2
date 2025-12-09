import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

declare global {
  var prisma: PrismaClient | undefined
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

// Prevent multiple instances of Prisma Client in development
export const prisma = globalThis.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

export default prisma
