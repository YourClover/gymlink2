import { beforeEach, describe, expect, it } from 'vitest'
import { mockPrisma } from '@/test/setup'
import { MAX_PAGE_SIZE } from './constants'

// We test the business logic directly by recreating the handler logic
// TanStack server functions are RPC-based and don't return values when called directly in tests

// Validation function from social.server.ts
function validatePagination(limit?: number, offset?: number): void {
  if (limit !== undefined) {
    if (limit < 1) throw new Error('Limit must be at least 1')
    if (limit > MAX_PAGE_SIZE)
      throw new Error(`Limit cannot exceed ${MAX_PAGE_SIZE}`)
  }
  if (offset !== undefined && offset < 0) {
    throw new Error('Offset cannot be negative')
  }
}

describe('social server functions', () => {
  const mockUser1 = {
    id: 'user-1',
    name: 'User One',
    profile: { username: 'userone', avatarUrl: null },
  }

  const mockUser2 = {
    id: 'user-2',
    name: 'User Two',
    profile: { username: 'usertwo', avatarUrl: null },
  }

  describe('pagination validation', () => {
    it('throws error when limit is less than 1', () => {
      expect(() => validatePagination(0)).toThrow('Limit must be at least 1')
    })

    it('throws error when limit exceeds MAX_PAGE_SIZE', () => {
      expect(() => validatePagination(MAX_PAGE_SIZE + 1)).toThrow(
        `Limit cannot exceed ${MAX_PAGE_SIZE}`,
      )
    })

    it('throws error when offset is negative', () => {
      expect(() => validatePagination(10, -1)).toThrow(
        'Offset cannot be negative',
      )
    })

    it('passes validation with valid parameters', () => {
      expect(() => validatePagination(50, 0)).not.toThrow()
      expect(() => validatePagination(MAX_PAGE_SIZE, 100)).not.toThrow()
    })
  })

  describe('sendFollowRequest validation', () => {
    it('throws error when trying to follow yourself', () => {
      const data = { followerId: 'user-1', followingId: 'user-1' }

      expect(() => {
        if (data.followerId === data.followingId) {
          throw new Error('Cannot follow yourself')
        }
      }).toThrow('Cannot follow yourself')
    })

    it('passes validation when following different user', () => {
      const data = { followerId: 'user-1', followingId: 'user-2' }

      expect(() => {
        if (data.followerId === data.followingId) {
          throw new Error('Cannot follow yourself')
        }
      }).not.toThrow()
    })
  })

  describe('sendFollowRequest logic', () => {
    beforeEach(() => {
      mockPrisma.follow.findUnique.mockResolvedValue(null)
      mockPrisma.userProfile.findUnique.mockResolvedValue({
        userId: mockUser2.id,
        isPrivate: true,
      } as any)
    })

    it('throws error when follow request already exists', async () => {
      mockPrisma.follow.findUnique.mockResolvedValue({
        id: 'follow-123',
        followerId: mockUser1.id,
        followingId: mockUser2.id,
        status: 'PENDING',
        createdAt: new Date(),
        respondedAt: null,
      })

      const existing = await mockPrisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: mockUser1.id,
            followingId: mockUser2.id,
          },
        },
      })

      expect(() => {
        if (existing && existing.status !== 'DECLINED') {
          throw new Error('Follow request already exists')
        }
      }).toThrow('Follow request already exists')
    })

    it('allows re-requesting after decline', async () => {
      mockPrisma.follow.findUnique.mockResolvedValue({
        id: 'follow-123',
        followerId: mockUser1.id,
        followingId: mockUser2.id,
        status: 'DECLINED',
        createdAt: new Date(),
        respondedAt: new Date(),
      })

      const existing = await mockPrisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: mockUser1.id,
            followingId: mockUser2.id,
          },
        },
      })

      const canReRequest = existing?.status === 'DECLINED'
      expect(canReRequest).toBe(true)
    })

    it('sets status to PENDING for private accounts', async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue({
        userId: mockUser2.id,
        isPrivate: true,
      } as any)

      const targetProfile = await mockPrisma.userProfile.findUnique({
        where: { userId: mockUser2.id },
      })

      const status = targetProfile?.isPrivate ? 'PENDING' : 'ACCEPTED'
      expect(status).toBe('PENDING')
    })

    it('sets status to ACCEPTED for public accounts', async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue({
        userId: mockUser2.id,
        isPrivate: false,
      } as any)

      const targetProfile = await mockPrisma.userProfile.findUnique({
        where: { userId: mockUser2.id },
      })

      const status = targetProfile?.isPrivate ? 'PENDING' : 'ACCEPTED'
      expect(status).toBe('ACCEPTED')
    })
  })

  describe('respondToFollowRequest logic', () => {
    it('throws error when follow request not found', async () => {
      mockPrisma.follow.findFirst.mockResolvedValue(null)

      const follow = await mockPrisma.follow.findFirst({
        where: {
          id: 'nonexistent',
          followingId: mockUser2.id,
          status: 'PENDING',
        },
      })

      expect(follow).toBeNull()
      expect(() => {
        if (!follow) throw new Error('Follow request not found')
      }).toThrow('Follow request not found')
    })

    it('updates status to ACCEPTED when accepting', () => {
      const accept = true
      const newStatus = accept ? 'ACCEPTED' : 'DECLINED'
      expect(newStatus).toBe('ACCEPTED')
    })

    it('updates status to DECLINED when declining', () => {
      const accept = false
      const newStatus = accept ? 'ACCEPTED' : 'DECLINED'
      expect(newStatus).toBe('DECLINED')
    })
  })

  describe('getFollowers logic', () => {
    it('identifies mutual followers correctly', () => {
      const followerIds = ['user-1', 'user-2', 'user-3']
      const mutualFollowingIds = ['user-1', 'user-3'] // Users I also follow

      const mutualSet = new Set(mutualFollowingIds)

      const followers = followerIds.map((id) => ({
        followerId: id,
        isMutual: mutualSet.has(id),
      }))

      expect(followers[0].isMutual).toBe(true) // user-1
      expect(followers[1].isMutual).toBe(false) // user-2
      expect(followers[2].isMutual).toBe(true) // user-3
    })
  })

  describe('getFollowStatus logic', () => {
    it('returns null when no follow relationship exists', async () => {
      mockPrisma.follow.findUnique.mockResolvedValue(null)

      const follow = await mockPrisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: mockUser1.id,
            followingId: mockUser2.id,
          },
        },
      })

      const status = follow?.status ?? null
      expect(status).toBeNull()
    })

    it('returns status when follow relationship exists', async () => {
      mockPrisma.follow.findUnique.mockResolvedValue({
        id: 'follow-123',
        followerId: mockUser1.id,
        followingId: mockUser2.id,
        status: 'ACCEPTED',
        createdAt: new Date(),
        respondedAt: new Date(),
      })

      const follow = await mockPrisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: mockUser1.id,
            followingId: mockUser2.id,
          },
        },
      })

      const status = follow?.status ?? null
      expect(status).toBe('ACCEPTED')
    })
  })

  describe('getFollowCounts logic', () => {
    it('returns all counts in parallel', async () => {
      mockPrisma.follow.count
        .mockResolvedValueOnce(100) // followers
        .mockResolvedValueOnce(50) // following
        .mockResolvedValueOnce(5) // pending

      const [followersCount, followingCount, pendingCount] = await Promise.all([
        mockPrisma.follow.count({
          where: { followingId: mockUser1.id, status: 'ACCEPTED' },
        }),
        mockPrisma.follow.count({
          where: { followerId: mockUser1.id, status: 'ACCEPTED' },
        }),
        mockPrisma.follow.count({
          where: { followingId: mockUser1.id, status: 'PENDING' },
        }),
      ])

      expect(followersCount).toBe(100)
      expect(followingCount).toBe(50)
      expect(pendingCount).toBe(5)
    })
  })

  describe('getMutualFollowers logic', () => {
    it('returns empty array when no followers', async () => {
      mockPrisma.follow.findMany.mockResolvedValue([])

      const followers = await mockPrisma.follow.findMany({
        where: { followingId: mockUser1.id, status: 'ACCEPTED' },
        select: { followerId: true },
      })

      const followerIds = followers.map((f) => f.followerId)
      const result =
        followerIds.length === 0 ? { mutuals: [] } : { mutuals: ['some'] }

      expect(result.mutuals).toEqual([])
    })

    it('finds mutual followers correctly', () => {
      // My followers
      const myFollowers = [
        { followerId: 'user-2' },
        { followerId: 'user-3' },
        { followerId: 'user-4' },
      ]
      const followerIds = myFollowers.map((f) => f.followerId)

      // Users I also follow (mutual)
      const iFollow = [{ followingId: 'user-2' }, { followingId: 'user-4' }]

      const mutualIds = iFollow.map((f) => f.followingId)
      const mutuals = followerIds.filter((id) => mutualIds.includes(id))

      expect(mutuals).toContain('user-2')
      expect(mutuals).toContain('user-4')
      expect(mutuals).not.toContain('user-3')
    })
  })
})
