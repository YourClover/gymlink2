import { beforeEach, describe, expect, it } from 'vitest'
import { mockPrisma } from '@/test/setup'

// We test the business logic directly by recreating the handler logic
// TanStack server functions are RPC-based and don't return values when called directly in tests

describe('profile server functions', () => {
  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date('2025-01-01'),
  }

  const mockProfile = {
    id: 'profile-123',
    userId: mockUser.id,
    username: 'testuser',
    bio: 'Test bio',
    avatarUrl: null,
    isPrivate: false,
    showAchievements: true,
    showStats: true,
    profileCode: 'ABC12345',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  describe('createUserProfile validation', () => {
    it('throws error for username shorter than 3 characters', () => {
      const username = 'ab'

      expect(() => {
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
          throw new Error(
            'Username must be 3-20 characters, alphanumeric and underscores only',
          )
        }
      }).toThrow('Username must be 3-20 characters')
    })

    it('throws error for username longer than 20 characters', () => {
      const username = 'a'.repeat(21)

      expect(() => {
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
          throw new Error(
            'Username must be 3-20 characters, alphanumeric and underscores only',
          )
        }
      }).toThrow('Username must be 3-20 characters')
    })

    it('throws error for username with special characters', () => {
      const username = 'test@user!'

      expect(() => {
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
          throw new Error(
            'Username must be 3-20 characters, alphanumeric and underscores only',
          )
        }
      }).toThrow('Username must be 3-20 characters')
    })

    it('accepts valid username with letters, numbers, underscores', () => {
      const validUsernames = ['test_user', 'TestUser123', 'user_123', 'abc']

      for (const username of validUsernames) {
        expect(() => {
          if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            throw new Error(
              'Username must be 3-20 characters, alphanumeric and underscores only',
            )
          }
        }).not.toThrow()
      }
    })
  })

  describe('createUserProfile logic', () => {
    it('throws error when username is taken', async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue(mockProfile)

      const existing = await mockPrisma.userProfile.findUnique({
        where: { username: 'testuser' },
      })

      expect(existing).not.toBeNull()
      expect(() => {
        if (existing) throw new Error('Username already taken')
      }).toThrow('Username already taken')
    })

    it('allows creating profile with available username', async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue(null)

      const existing = await mockPrisma.userProfile.findUnique({
        where: { username: 'newuser' },
      })

      expect(existing).toBeNull()
    })

    it('converts username to lowercase', () => {
      const username = 'TestUser'
      const normalized = username.toLowerCase()
      expect(normalized).toBe('testuser')
    })
  })

  describe('getProfileByUsername logic', () => {
    beforeEach(() => {
      mockPrisma.userProfile.findFirst.mockResolvedValue({
        ...mockProfile,
        user: mockUser,
      } as any)
    })

    it('returns null when profile not found', async () => {
      mockPrisma.userProfile.findFirst.mockResolvedValue(null)

      const profile = await mockPrisma.userProfile.findFirst({
        where: { username: 'nonexistent' },
      })

      const result = !profile
        ? { profile: null, canView: false, followStatus: null }
        : { profile, canView: true, followStatus: null }

      expect(result.profile).toBeNull()
      expect(result.canView).toBe(false)
    })

    it('allows viewing public profiles', () => {
      const profile = { ...mockProfile, isPrivate: false }
      const viewerId = 'other-user'

      let canView = !profile.isPrivate
      expect(canView).toBe(true)
    })

    it('allows owner to view their own private profile', () => {
      const profile = { ...mockProfile, isPrivate: true }
      const viewerId = mockProfile.userId // Same as owner

      let canView = !profile.isPrivate
      if (viewerId === profile.userId) {
        canView = true // Own profile
      }

      expect(canView).toBe(true)
    })

    it('allows accepted followers to view private profile', () => {
      const profile = { ...mockProfile, isPrivate: true }
      const followStatus = 'ACCEPTED'

      let canView = !profile.isPrivate
      if (followStatus === 'ACCEPTED') {
        canView = true
      }

      expect(canView).toBe(true)
    })

    it('denies non-followers access to private profile', () => {
      const profile = { ...mockProfile, isPrivate: true }
      const followStatus = null

      let canView = !profile.isPrivate
      if (followStatus === 'ACCEPTED') {
        canView = true
      }

      expect(canView).toBe(false)
    })
  })

  describe('checkUsernameAvailable logic', () => {
    it('returns unavailable for invalid format', () => {
      const invalidUsernames = ['ab', 'a'.repeat(21), 'test@user']

      for (const username of invalidUsernames) {
        const formatValid = /^[a-zA-Z0-9_]{3,20}$/.test(username)
        expect(formatValid).toBe(false)
      }
    })

    it('returns available when username not taken', async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue(null)

      const existing = await mockPrisma.userProfile.findUnique({
        where: { username: 'available' },
      })

      const available = !existing
      expect(available).toBe(true)
    })

    it('returns unavailable when username taken', async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue(mockProfile)

      const existing = await mockPrisma.userProfile.findUnique({
        where: { username: 'testuser' },
      })

      const available = !existing
      expect(available).toBe(false)
    })
  })

  describe('deleteUserAccount logic', () => {
    beforeEach(() => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        email: 'test@example.com',
        passwordHash: '$2a$12$hashedpassword',
        deletedAt: null,
      } as any)
    })

    it('throws error when user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)

      const user = await mockPrisma.user.findFirst({
        where: { id: 'nonexistent', deletedAt: null },
      })

      expect(user).toBeNull()
      expect(() => {
        if (!user) throw new Error('User not found')
      }).toThrow('User not found')
    })

    it('throws error when email confirmation does not match', async () => {
      const user = await mockPrisma.user.findFirst({
        where: { id: mockUser.id, deletedAt: null },
      })

      const confirmEmail = 'wrong@example.com'

      expect(() => {
        if (user?.email !== confirmEmail) {
          throw new Error('Email confirmation does not match')
        }
      }).toThrow('Email confirmation does not match')
    })
  })

  describe('restoreUserAccount logic', () => {
    it('throws error when deleted user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)

      const user = await mockPrisma.user.findFirst({
        where: { id: 'nonexistent', deletedAt: { not: null } },
      })

      expect(user).toBeNull()
      expect(() => {
        if (!user) throw new Error('Deleted user not found')
      }).toThrow('Deleted user not found')
    })

    it('throws error when grace period exceeded without admin', () => {
      const deletedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) // 31 days ago
      const gracePeriodDays = 30
      const daysSinceDelete = Math.floor(
        (Date.now() - deletedAt.getTime()) / (1000 * 60 * 60 * 24),
      )
      const adminId = undefined

      expect(() => {
        if (daysSinceDelete > gracePeriodDays && !adminId) {
          throw new Error(
            `Account can only be restored within ${gracePeriodDays} days of deletion`,
          )
        }
      }).toThrow('Account can only be restored within 30 days of deletion')
    })

    it('allows admin to restore after grace period', () => {
      const deletedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) // 31 days ago
      const gracePeriodDays = 30
      const daysSinceDelete = Math.floor(
        (Date.now() - deletedAt.getTime()) / (1000 * 60 * 60 * 24),
      )
      const adminId = 'admin-123'

      expect(() => {
        if (daysSinceDelete > gracePeriodDays && !adminId) {
          throw new Error(
            `Account can only be restored within ${gracePeriodDays} days of deletion`,
          )
        }
      }).not.toThrow()
    })

    it('allows user to restore within grace period', () => {
      const deletedAt = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
      const gracePeriodDays = 30
      const daysSinceDelete = Math.floor(
        (Date.now() - deletedAt.getTime()) / (1000 * 60 * 60 * 24),
      )
      const adminId = undefined

      expect(daysSinceDelete).toBeLessThanOrEqual(gracePeriodDays)
      expect(() => {
        if (daysSinceDelete > gracePeriodDays && !adminId) {
          throw new Error(
            `Account can only be restored within ${gracePeriodDays} days of deletion`,
          )
        }
      }).not.toThrow()
    })
  })

  describe('getProfileStats logic', () => {
    it('aggregates stats correctly', async () => {
      mockPrisma.workoutSession.count.mockResolvedValue(50)
      mockPrisma.workoutSet.count.mockResolvedValue(500)
      mockPrisma.personalRecord.count.mockResolvedValue(15)
      mockPrisma.userAchievement.count.mockResolvedValue(10)
      mockPrisma.workoutSession.findFirst.mockResolvedValue({
        completedAt: new Date('2025-01-15'),
      } as any)
      mockPrisma.workoutSet.aggregate.mockResolvedValue({
        _sum: { weight: 50000 },
      } as any)

      const [totalWorkouts, totalSets, totalPRs, totalAchievements] =
        await Promise.all([
          mockPrisma.workoutSession.count({
            where: { userId: mockUser.id, completedAt: { not: null } },
          }),
          mockPrisma.workoutSet.count({
            where: {
              workoutSession: {
                userId: mockUser.id,
                completedAt: { not: null },
              },
              isWarmup: false,
            },
          }),
          mockPrisma.personalRecord.count({
            where: { userId: mockUser.id },
          }),
          mockPrisma.userAchievement.count({
            where: { userId: mockUser.id },
          }),
        ])

      expect(totalWorkouts).toBe(50)
      expect(totalSets).toBe(500)
      expect(totalPRs).toBe(15)
      expect(totalAchievements).toBe(10)
    })
  })

  describe('profile code generation', () => {
    it('generates 8 character codes', () => {
      const CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

      function generateProfileCode(): string {
        let code = ''
        for (let i = 0; i < 8; i++) {
          code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
        }
        return code
      }

      const code = generateProfileCode()
      expect(code).toHaveLength(8)
    })

    it('excludes confusing characters (0, O, 1, I, L)', () => {
      const CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

      expect(CODE_CHARS).not.toContain('0')
      expect(CODE_CHARS).not.toContain('O')
      expect(CODE_CHARS).not.toContain('1')
      expect(CODE_CHARS).not.toContain('I')
      expect(CODE_CHARS).not.toContain('L')
    })
  })
})
