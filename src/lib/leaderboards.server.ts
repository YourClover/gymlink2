import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db'

type LeaderboardMetric = 'volume' | 'workouts' | 'streak' | 'prs'
type TimeRange = 'week' | 'month' | 'all'

// Get global leaderboard
export const getGlobalLeaderboard = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      metric: LeaderboardMetric
      timeRange: TimeRange
      limit?: number
    }) => data,
  )
  .handler(async ({ data }) => {
    const limit = data.limit ?? 50
    const dateFilter = getDateFilter(data.timeRange)

    switch (data.metric) {
      case 'volume':
        return getVolumeLeaderboard(dateFilter, limit)
      case 'workouts':
        return getWorkoutsLeaderboard(dateFilter, limit)
      case 'streak':
        return getStreakLeaderboard(limit)
      case 'prs':
        return getPRsLeaderboard(dateFilter, limit)
    }
  })

// Get friends leaderboard (only followed users)
export const getFriendsLeaderboard = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      userId: string
      metric: LeaderboardMetric
      timeRange: TimeRange
      limit?: number
    }) => data,
  )
  .handler(async ({ data }) => {
    // Get followed users
    const following = await prisma.follow.findMany({
      where: { followerId: data.userId, status: 'ACCEPTED' },
      select: { followingId: true },
    })

    const userIds = [data.userId, ...following.map((f) => f.followingId)]
    const limit = data.limit ?? 50
    const dateFilter = getDateFilter(data.timeRange)

    switch (data.metric) {
      case 'volume':
        return getVolumeLeaderboard(dateFilter, limit, userIds)
      case 'workouts':
        return getWorkoutsLeaderboard(dateFilter, limit, userIds)
      case 'streak':
        return getStreakLeaderboard(limit, userIds)
      case 'prs':
        return getPRsLeaderboard(dateFilter, limit, userIds)
    }
  })

// Helper: Get date filter based on time range
function getDateFilter(timeRange: TimeRange): Date | null {
  const now = new Date()
  switch (timeRange) {
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case 'all':
      return null
  }
}

// Volume leaderboard
async function getVolumeLeaderboard(
  dateFilter: Date | null,
  limit: number,
  userIds?: Array<string>,
) {
  // Get all workout sets with their volumes
  const sets = await prisma.workoutSet.findMany({
    where: {
      isWarmup: false,
      weight: { not: null },
      reps: { not: null },
      workoutSession: {
        completedAt: {
          not: null,
          ...(dateFilter && { gte: dateFilter }),
        },
        ...(userIds && { userId: { in: userIds } }),
      },
    },
    include: {
      workoutSession: {
        select: { userId: true },
      },
    },
  })

  // Aggregate volume by user
  const userVolumes = new Map<string, number>()
  for (const set of sets) {
    const userId = set.workoutSession.userId
    const volume = (set.weight ?? 0) * (set.reps ?? 0)
    userVolumes.set(userId, (userVolumes.get(userId) ?? 0) + volume)
  }

  // Sort and limit
  const sorted = [...userVolumes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)

  return enrichLeaderboard(sorted.map(([userId, value]) => ({ userId, value })))
}

// Workouts count leaderboard
async function getWorkoutsLeaderboard(
  dateFilter: Date | null,
  limit: number,
  userIds?: Array<string>,
) {
  const workoutCounts = await prisma.workoutSession.groupBy({
    by: ['userId'],
    where: {
      completedAt: {
        not: null,
        ...(dateFilter && { gte: dateFilter }),
      },
      ...(userIds && { userId: { in: userIds } }),
    },
    _count: { id: true },
  })

  const sorted = workoutCounts
    .map((w) => ({ userId: w.userId, value: w._count.id }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)

  return enrichLeaderboard(sorted)
}

// Streak leaderboard (current streak)
async function getStreakLeaderboard(limit: number, userIds?: Array<string>) {
  // Get all users to calculate streaks for
  const users = await prisma.user.findMany({
    where: userIds ? { id: { in: userIds } } : undefined,
    select: { id: true },
    take: 500, // Limit for performance
  })

  // Calculate streak for each user
  const streaks: Array<{ userId: string; value: number }> = []

  for (const user of users) {
    const streak = await calculateStreak(user.id)
    if (streak > 0) {
      streaks.push({ userId: user.id, value: streak })
    }
  }

  return enrichLeaderboard(
    streaks.sort((a, b) => b.value - a.value).slice(0, limit),
  )
}

// PRs count leaderboard
async function getPRsLeaderboard(
  dateFilter: Date | null,
  limit: number,
  userIds?: Array<string>,
) {
  const prCounts = await prisma.personalRecord.groupBy({
    by: ['userId'],
    where: {
      ...(dateFilter && { achievedAt: { gte: dateFilter } }),
      ...(userIds && { userId: { in: userIds } }),
    },
    _count: { id: true },
  })

  const sorted = prCounts
    .map((p) => ({ userId: p.userId, value: p._count.id }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)

  return enrichLeaderboard(sorted)
}

// Helper: Add user and profile info to leaderboard entries
async function enrichLeaderboard(entries: Array<{ userId: string; value: number }>) {
  if (entries.length === 0) return { leaderboard: [] }

  const userIds = entries.map((e) => e.userId)

  const [users, profiles] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    }),
    prisma.userProfile.findMany({
      where: { userId: { in: userIds } },
    }),
  ])

  const userMap = new Map(users.map((u) => [u.id, u]))
  const profileMap = new Map(profiles.map((p) => [p.userId, p]))

  return {
    leaderboard: entries.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      value: entry.value,
      user: userMap.get(entry.userId),
      profile: profileMap.get(entry.userId),
    })),
  }
}

// Helper: Calculate workout streak for a user (consecutive weeks with workouts)
async function calculateStreak(userId: string): Promise<number> {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)

  let streak = 0
  const checkDate = new Date(weekStart)

  // Check up to 52 weeks back
  for (let i = 0; i < 52; i++) {
    const weekEnd = new Date(checkDate)
    weekEnd.setDate(checkDate.getDate() + 7)

    const workoutCount = await prisma.workoutSession.count({
      where: {
        userId,
        completedAt: {
          gte: checkDate,
          lt: weekEnd,
        },
      },
    })

    if (workoutCount > 0) {
      streak++
      checkDate.setDate(checkDate.getDate() - 7)
    } else {
      break
    }
  }

  return streak
}
