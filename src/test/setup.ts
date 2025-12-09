import { beforeEach, vi } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import type { PrismaClient } from '@prisma/client'

// Set required environment variables for tests
process.env.JWT_SECRET = 'test-secret-for-testing-only'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

// Create a deeply mocked Prisma client
export const mockPrisma = mockDeep<PrismaClient>()

// Mock the db module to return our mock
vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}))

// Reset all mocks before each test
beforeEach(() => {
  mockReset(mockPrisma)
})
