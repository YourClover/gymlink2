import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db.server'
import { requireAuth } from './auth-guard.server'
import { DEFAULT_FEED_LIMIT, MAX_PAGE_SIZE } from './constants'
import type { ActivityType } from '@prisma/client'

// Validate pagination parameters
function validatePagination(limit?: number): number {
  if (limit === undefined) return DEFAULT_FEED_LIMIT
  if (limit < 1) throw new Error('Limit must be at least 1')
  if (limit > MAX_PAGE_SIZE)
    throw new Error(`Limit cannot exceed ${MAX_PAGE_SIZE}`)
  return limit
}

// Get activity feed from followed users
export const getActivityFeed = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { token: string | null; limit?: number; cursor?: string }) => {
      // Validate limit to prevent DoS
      validatePagination(data.limit)
      return data
    },
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    // Get list of users this person follows (accepted only)
    const following = await prisma.follow.findMany({
      where: {
        followerId: userId,
        status: 'ACCEPTED',
      },
      select: { followingId: true },
    })

    const followingIds = following.map((f) => f.followingId)

    // Include own activity in feed
    const userIds = [userId, ...followingIds]

    // Fetch activities with user profiles in a single query (fixes N+1)
    const activities = await prisma.activityFeedItem.findMany({
      where: {
        userId: { in: userIds },
        ...(data.cursor && { createdAt: { lt: new Date(data.cursor) } }),
      },
      take: data.limit ?? 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile: true,
          },
        },
      },
    })

    return {
      activities: activities.map((a) => ({
        ...a,
        profile: a.user.profile,
      })),
      nextCursor:
        activities.length > 0
          ? activities[activities.length - 1].createdAt.toISOString()
          : null,
    }
  })

// Get a specific user's activity (for profile pages)
export const getUserActivity = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      targetUserId: string
      token?: string | null
      limit?: number
      cursor?: string
    }) => {
      validatePagination(data.limit)
      return data
    },
  )
  .handler(async ({ data }) => {
    let viewerId: string | undefined
    if (data.token) {
      try {
        const auth = await requireAuth(data.token)
        viewerId = auth.userId
      } catch {
        // Token invalid — treat as unauthenticated viewer
      }
    }

    // Check if viewer can see this user's activity
    const profile = await prisma.userProfile.findUnique({
      where: { userId: data.targetUserId },
    })

    if (profile?.isPrivate && viewerId !== data.targetUserId) {
      // Check if viewer follows this user
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId ?? '',
            followingId: data.targetUserId,
          },
        },
      })

      if (follow?.status !== 'ACCEPTED') {
        return { activities: [], canView: false }
      }
    }

    const activities = await prisma.activityFeedItem.findMany({
      where: {
        userId: data.targetUserId,
        ...(data.cursor && { createdAt: { lt: new Date(data.cursor) } }),
      },
      take: data.limit ?? 20,
      orderBy: { createdAt: 'desc' },
    })

    return { activities, canView: true }
  })

// Create an activity feed item (called from workouts, achievements, etc.)
export const createActivityItem = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      token: string | null
      activityType: ActivityType
      referenceId?: string
      metadata?: Record<string, string | number | boolean | null>
    }) => data,
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    const activity = await prisma.activityFeedItem.create({
      data: {
        userId,
        activityType: data.activityType,
        referenceId: data.referenceId,
        metadata: data.metadata ?? {},
      },
    })
    return { activity }
  })
