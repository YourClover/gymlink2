import { createServerFn } from '@tanstack/react-start'
import { Prisma } from '@prisma/client'
import { prisma } from './db.server'
import { requireAuth } from './auth-guard.server'

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
    const limit = Math.min(data.limit ?? 50, 100)
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
      token: string | null
      metric: LeaderboardMetric
      timeRange: TimeRange
      limit?: number
    }) => data,
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    // Get followed users
    const following = await prisma.follow.findMany({
      where: { followerId: userId, status: 'ACCEPTED' },
      select: { followingId: true },
    })

    const userIds = [userId, ...following.map((f) => f.followingId)]
    const limit = Math.min(data.limit ?? 50, 100)
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

// Volume leaderboard - optimized with database-level aggregation
async function getVolumeLeaderboard(
  dateFilter: Date | null,
  limit: number,
  userIds?: Array<string>,
) {
  // Build dynamic SQL conditions (using actual PostgreSQL column names)
  const dateCondition = dateFilter
    ? Prisma.sql`AND ws."completed_at" >= ${dateFilter}`
    : Prisma.empty
  const userCondition =
    userIds && userIds.length > 0
      ? Prisma.sql`AND ws."user_id" = ANY(${userIds})`
      : Prisma.empty

  // Use raw SQL for efficient database-level aggregation
  // This calculates weight * reps at the database level instead of fetching all rows
  // Note: Using actual PostgreSQL table/column names (from @@map directives in schema)
  const results = await prisma.$queryRaw<
    Array<{ user_id: string; volume: bigint | null }>
  >`
    SELECT ws."user_id", SUM(wset.weight * wset.reps) as volume
    FROM "workout_sets" wset
    JOIN "workout_sessions" ws ON wset."workout_session_id" = ws.id
    WHERE wset."is_warmup" = false
      AND wset."is_dropset" = false
      AND wset.weight IS NOT NULL
      AND wset.reps IS NOT NULL
      AND ws."completed_at" IS NOT NULL
      ${dateCondition}
      ${userCondition}
    GROUP BY ws."user_id"
    ORDER BY volume DESC
    LIMIT ${limit}
  `

  const entries = results.map((r) => ({
    userId: r.user_id,
    value: Number(r.volume ?? 0),
  }))

  return enrichLeaderboard(entries)
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

// Streak leaderboard (current streak) — single SQL query
async function getStreakLeaderboard(limit: number, userIds?: Array<string>) {
  const userCondition =
    userIds && userIds.length > 0
      ? Prisma.sql`AND ws."user_id" = ANY(${userIds})`
      : Prisma.empty

  // Single CTE-based query that computes streaks at the database level:
  // 1. Group completed workouts by (user_id, week_start) for last 52 weeks
  // 2. Use LAG window function to detect consecutive week gaps
  // 3. Count consecutive weeks from the most recent qualifying week backward
  // 4. Filter to only users whose streak includes current or last week
  const results = await prisma.$queryRaw<
    Array<{ user_id: string; streak: number }>
  >`
    WITH week_activity AS (
      SELECT DISTINCT
        ws."user_id",
        date_trunc('week', ws."completed_at")::date AS week_start
      FROM "workout_sessions" ws
      WHERE ws."completed_at" IS NOT NULL
        AND ws."completed_at" >= (date_trunc('week', NOW()) - interval '52 weeks')::timestamp
        ${userCondition}
    ),
    ranked_weeks AS (
      SELECT
        "user_id",
        week_start,
        ROW_NUMBER() OVER (PARTITION BY "user_id" ORDER BY week_start DESC) AS rn,
        (date_trunc('week', NOW())::date - week_start) / 7 AS weeks_ago
      FROM week_activity
    ),
    streaks AS (
      SELECT
        "user_id",
        COUNT(*) AS streak
      FROM ranked_weeks
      WHERE weeks_ago = rn - 1  -- consecutive from current/last week
        AND weeks_ago <= 52
      GROUP BY "user_id"
      HAVING MIN(weeks_ago) <= 1  -- must include current or last week
    )
    SELECT "user_id", streak::int
    FROM streaks
    ORDER BY streak DESC
    LIMIT ${limit}
  `

  const entries = results.map((r) => ({
    userId: r.user_id,
    value: r.streak,
  }))

  return enrichLeaderboard(entries)
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
async function enrichLeaderboard(
  entries: Array<{ userId: string; value: number }>,
) {
  if (entries.length === 0) return { leaderboard: [] }

  const userIds = entries.map((e) => e.userId)

  const profiles = await prisma.userProfile.findMany({
    where: {
      userId: { in: userIds },
      user: { deletedAt: null }, // Exclude soft-deleted users
    },
    select: {
      userId: true,
      username: true,
      avatarUrl: true,
      user: { select: { id: true, name: true } },
    },
  })

  const profileMap = new Map(profiles.map((p) => [p.userId, p]))
  const userMap = new Map(profiles.map((p) => [p.userId, p.user]))

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
