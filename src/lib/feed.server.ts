import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db'
import type { ActivityType } from '@prisma/client'
import { DEFAULT_FEED_LIMIT, MAX_PAGE_SIZE } from './constants'

// Validate pagination parameters
function validatePagination(limit?: number): number {
  if (limit === undefined) return DEFAULT_FEED_LIMIT
  if (limit < 1) throw new Error('Limit must be at least 1')
  if (limit > MAX_PAGE_SIZE) throw new Error(`Limit cannot exceed ${MAX_PAGE_SIZE}`)
  return limit
}

// Get activity feed from followed users
export const getActivityFeed = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string; limit?: number; cursor?: string }) => {
    // Validate limit to prevent DoS
    validatePagination(data.limit)
    return data
  })
  .handler(async ({ data }) => {
    // Get list of users this person follows (accepted only)
    const following = await prisma.follow.findMany({
      where: {
        followerId: data.userId,
        status: 'ACCEPTED',
      },
      select: { followingId: true },
    })

    const followingIds = following.map((f) => f.followingId)

    // Include own activity in feed
    const userIds = [data.userId, ...followingIds]

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
      userId: string
      viewerId?: string
      limit?: number
      cursor?: string
    }) => {
      validatePagination(data.limit)
      return data
    },
  )
  .handler(async ({ data }) => {
    // Check if viewer can see this user's activity
    const profile = await prisma.userProfile.findUnique({
      where: { userId: data.userId },
    })

    if (profile?.isPrivate && data.viewerId !== data.userId) {
      // Check if viewer follows this user
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: data.viewerId ?? '',
            followingId: data.userId,
          },
        },
      })

      if (follow?.status !== 'ACCEPTED') {
        return { activities: [], canView: false }
      }
    }

    const activities = await prisma.activityFeedItem.findMany({
      where: {
        userId: data.userId,
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
      userId: string
      activityType: ActivityType
      referenceId?: string
      metadata?: Record<string, string | number | boolean | null>
    }) => data,
  )
  .handler(async ({ data }) => {
    const activity = await prisma.activityFeedItem.create({
      data: {
        userId: data.userId,
        activityType: data.activityType,
        referenceId: data.referenceId,
        metadata: data.metadata ?? {},
      },
    })
    return { activity }
  })
