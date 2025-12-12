import { beforeEach, describe, expect, it } from 'vitest'
import { mockPrisma } from '@/test/setup'
import { DEFAULT_FEED_LIMIT, MAX_PAGE_SIZE } from './constants'

// We test the business logic directly by recreating the handler logic
// TanStack server functions are RPC-based and don't return values when called directly in tests

// Validation function from feed.server.ts
function validatePagination(limit?: number): number {
  if (limit === undefined) return DEFAULT_FEED_LIMIT
  if (limit < 1) throw new Error('Limit must be at least 1')
  if (limit > MAX_PAGE_SIZE)
    throw new Error(`Limit cannot exceed ${MAX_PAGE_SIZE}`)
  return limit
}

describe('feed server functions', () => {
  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    profile: { username: 'testuser', avatarUrl: null },
  }

  const mockActivity = {
    id: 'activity-123',
    userId: mockUser.id,
    activityType: 'WORKOUT_COMPLETED' as const,
    referenceId: 'workout-123',
    metadata: { duration: 3600 },
    createdAt: new Date('2025-01-15T10:00:00Z'),
    user: mockUser,
  }

  describe('pagination validation', () => {
    it('returns DEFAULT_FEED_LIMIT when limit is undefined', () => {
      const result = validatePagination(undefined)
      expect(result).toBe(DEFAULT_FEED_LIMIT)
    })

    it('throws error when limit is less than 1', () => {
      expect(() => validatePagination(0)).toThrow('Limit must be at least 1')
    })

    it('throws error when limit exceeds MAX_PAGE_SIZE', () => {
      expect(() => validatePagination(MAX_PAGE_SIZE + 1)).toThrow(
        `Limit cannot exceed ${MAX_PAGE_SIZE}`,
      )
    })

    it('returns limit when valid', () => {
      expect(validatePagination(10)).toBe(10)
      expect(validatePagination(MAX_PAGE_SIZE)).toBe(MAX_PAGE_SIZE)
    })
  })

  describe('getActivityFeed logic', () => {
    beforeEach(() => {
      mockPrisma.follow.findMany.mockResolvedValue([
        { followingId: 'user-2' },
        { followingId: 'user-3' },
      ] as any)
    })

    it('includes own userId and following users in query', async () => {
      const userId = 'user-1'

      const following = await mockPrisma.follow.findMany({
        where: { followerId: userId, status: 'ACCEPTED' },
        select: { followingId: true },
      })

      const followingIds = following.map((f) => f.followingId)
      const userIds = [userId, ...followingIds]

      expect(userIds).toContain('user-1') // Own user
      expect(userIds).toContain('user-2') // Following
      expect(userIds).toContain('user-3') // Following
      expect(userIds).toHaveLength(3)
    })

    it('calculates next cursor from last activity', () => {
      const activities = [
        { ...mockActivity, createdAt: new Date('2025-01-15T12:00:00Z') },
        { ...mockActivity, createdAt: new Date('2025-01-15T11:00:00Z') },
        { ...mockActivity, createdAt: new Date('2025-01-15T10:00:00Z') },
      ]

      const nextCursor =
        activities.length > 0
          ? activities[activities.length - 1].createdAt.toISOString()
          : null

      expect(nextCursor).toBe('2025-01-15T10:00:00.000Z')
    })

    it('returns null cursor when no activities', () => {
      const activities: any[] = []

      const nextCursor =
        activities.length > 0
          ? activities[activities.length - 1].createdAt.toISOString()
          : null

      expect(nextCursor).toBeNull()
    })

    it('maps profile from user to activity', () => {
      const activity = mockActivity

      const mapped = {
        ...activity,
        profile: activity.user.profile,
      }

      expect(mapped.profile).toEqual(mockUser.profile)
      expect(mapped.profile?.username).toBe('testuser')
    })
  })

  describe('getUserActivity logic', () => {
    it('denies access to private profile for non-followers', async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue({
        userId: mockUser.id,
        isPrivate: true,
      } as any)

      mockPrisma.follow.findUnique.mockResolvedValue(null)

      const profile = await mockPrisma.userProfile.findUnique({
        where: { userId: mockUser.id },
      })

      const viewerId = 'other-user'

      if (profile?.isPrivate && viewerId !== mockUser.id) {
        const follow = await mockPrisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewerId,
              followingId: mockUser.id,
            },
          },
        })

        const canView = follow?.status === 'ACCEPTED'
        expect(canView).toBe(false)
      }
    })

    it('allows access to private profile for accepted followers', async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue({
        userId: mockUser.id,
        isPrivate: true,
      } as any)

      mockPrisma.follow.findUnique.mockResolvedValue({
        id: 'follow-123',
        followerId: 'other-user',
        followingId: mockUser.id,
        status: 'ACCEPTED',
        createdAt: new Date(),
        respondedAt: new Date(),
      })

      const follow = await mockPrisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: 'other-user',
            followingId: mockUser.id,
          },
        },
      })

      const canView = follow?.status === 'ACCEPTED'
      expect(canView).toBe(true)
    })

    it('allows owner to view their own private profile', async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue({
        userId: mockUser.id,
        isPrivate: true,
      } as any)

      const profile = await mockPrisma.userProfile.findUnique({
        where: { userId: mockUser.id },
      })

      const viewerId = mockUser.id // Same as profile owner

      // Owner can always view
      const isOwner = viewerId === mockUser.id
      const canView = isOwner || !profile?.isPrivate

      expect(canView).toBe(true)
    })

    it('allows access to public profiles', async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue({
        userId: mockUser.id,
        isPrivate: false,
      } as any)

      const profile = await mockPrisma.userProfile.findUnique({
        where: { userId: mockUser.id },
      })

      const canView = !profile?.isPrivate
      expect(canView).toBe(true)
    })
  })

  describe('createActivityItem logic', () => {
    it('creates activity with provided data', async () => {
      const inputData = {
        userId: mockUser.id,
        activityType: 'PR_ACHIEVED' as const,
        referenceId: 'pr-123',
        metadata: { exerciseName: 'Bench Press', newWeight: 100 },
      }

      mockPrisma.activityFeedItem.create.mockResolvedValue({
        id: 'new-activity',
        ...inputData,
        createdAt: new Date(),
      } as any)

      const activity = await mockPrisma.activityFeedItem.create({
        data: {
          userId: inputData.userId,
          activityType: inputData.activityType,
          referenceId: inputData.referenceId,
          metadata: inputData.metadata ?? {},
        },
      })

      expect(activity.id).toBe('new-activity')
      expect(activity.activityType).toBe('PR_ACHIEVED')
      expect(activity.metadata).toEqual(inputData.metadata)
    })

    it('uses empty object for metadata when not provided', () => {
      const inputData = {
        userId: mockUser.id,
        activityType: 'WORKOUT_COMPLETED' as const,
        metadata: undefined,
      }

      const data = {
        metadata: inputData.metadata ?? {},
      }

      expect(data.metadata).toEqual({})
    })
  })

  describe('cursor-based pagination', () => {
    it('filters activities by cursor date', () => {
      const cursor = '2025-01-15T12:00:00Z'
      const activities = [
        {
          id: '1',
          createdAt: new Date('2025-01-15T14:00:00Z'),
        },
        {
          id: '2',
          createdAt: new Date('2025-01-15T11:00:00Z'),
        },
        {
          id: '3',
          createdAt: new Date('2025-01-15T10:00:00Z'),
        },
      ]

      const cursorDate = new Date(cursor)
      const filtered = activities.filter((a) => a.createdAt < cursorDate)

      expect(filtered).toHaveLength(2)
      expect(filtered.map((a) => a.id)).toEqual(['2', '3'])
    })
  })
})
