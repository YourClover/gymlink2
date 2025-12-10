import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db'
import type { ActivityType } from '@prisma/client'

// Get activity feed from followed users
export const getActivityFeed = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { userId: string; limit?: number; cursor?: string }) => data,
  )
  .handler(async ({ data }) => {
    // Get list of users this person follows (accepted only)
    const following = await prisma.follow.findMany({
      where: { followerId: data.userId, status: 'ACCEPTED' },
      select: { followingId: true },
    })

    const followingIds = following.map((f) => f.followingId)

    // Include own activity in feed
    const userIds = [data.userId, ...followingIds]

    const activities = await prisma.activityFeedItem.findMany({
      where: {
        userId: { in: userIds },
        ...(data.cursor && { createdAt: { lt: new Date(data.cursor) } }),
      },
      take: data.limit ?? 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    })

    // Get profiles for activity users
    const profileUserIds = [...new Set(activities.map((a) => a.userId))]
    const profiles = await prisma.userProfile.findMany({
      where: { userId: { in: profileUserIds } },
    })
    const profileMap = new Map(profiles.map((p) => [p.userId, p]))

    return {
      activities: activities.map((a) => ({
        ...a,
        profile: profileMap.get(a.userId),
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
    }) => data,
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
