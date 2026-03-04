import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requireAdmin, requireAuth } from './auth-guard.server'
import { mockPrisma } from '@/test/setup'

import { verifyToken } from '@/lib/auth'

// Mock the auth module
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    verifyToken: vi.fn(),
  }
})

const mockedVerifyToken = vi.mocked(verifyToken)

describe('requireAuth', () => {
  beforeEach(() => {
    mockedVerifyToken.mockReset()
  })

  it('throws when token is null', async () => {
    await expect(requireAuth(null)).rejects.toThrow('Authentication required')
  })

  it('throws when token is invalid', async () => {
    mockedVerifyToken.mockReturnValue(null)

    await expect(requireAuth('bad-token')).rejects.toThrow(
      'Invalid or expired token',
    )
  })

  it('throws when user not found', async () => {
    mockedVerifyToken.mockReturnValue({
      userId: 'nonexistent',
      email: 'test@test.com',
    })
    mockPrisma.user.findUnique.mockResolvedValue(null)

    await expect(requireAuth('valid-token')).rejects.toThrow('User not found')
  })

  it('throws when user is soft-deleted', async () => {
    mockedVerifyToken.mockReturnValue({
      userId: 'user-1',
      email: 'test@test.com',
    })
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      isAdmin: false,
      deletedAt: new Date(),
    } as any)

    await expect(requireAuth('valid-token')).rejects.toThrow('User not found')
  })

  it('returns user info for valid token', async () => {
    mockedVerifyToken.mockReturnValue({
      userId: 'user-1',
      email: 'test@test.com',
    })
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      isAdmin: false,
      deletedAt: null,
    } as any)

    const result = await requireAuth('valid-token')
    expect(result).toEqual({
      userId: 'user-1',
      email: 'test@test.com',
      isAdmin: false,
    })
  })

  it('returns isAdmin true for admin users', async () => {
    mockedVerifyToken.mockReturnValue({
      userId: 'admin-1',
      email: 'admin@test.com',
    })
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@test.com',
      isAdmin: true,
      deletedAt: null,
    } as any)

    const result = await requireAuth('valid-token')
    expect(result.isAdmin).toBe(true)
  })
})

describe('requireAdmin', () => {
  beforeEach(() => {
    mockedVerifyToken.mockReset()
  })

  it('throws when token is null', async () => {
    await expect(requireAdmin(null)).rejects.toThrow('Authentication required')
  })

  it('throws when user is not admin', async () => {
    mockedVerifyToken.mockReturnValue({
      userId: 'user-1',
      email: 'test@test.com',
    })
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      isAdmin: false,
      deletedAt: null,
    } as any)

    await expect(requireAdmin('valid-token')).rejects.toThrow(
      'Admin access required',
    )
  })

  it('returns auth result for admin user', async () => {
    mockedVerifyToken.mockReturnValue({
      userId: 'admin-1',
      email: 'admin@test.com',
    })
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@test.com',
      isAdmin: true,
      deletedAt: null,
    } as any)

    const result = await requireAdmin('valid-token')
    expect(result).toEqual({
      userId: 'admin-1',
      email: 'admin@test.com',
      isAdmin: true,
    })
  })
})
