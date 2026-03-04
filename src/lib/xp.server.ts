import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db'
import { getWeekStart } from './date-utils'
import { XP_VALUES, getLevelForXp } from './xp-constants'
import type { PrismaClient, XpSource } from '@prisma/client'

type PrismaTransactionClient = Parameters<
  Parameters<PrismaClient['$transaction']>[0]
>[0]

// ============================================
// INTERNAL HELPERS (composable inside transactions)
// ============================================

/** Award XP to a user. Accepts a Prisma transaction client for composition. */
export async function awardXp(
  tx: PrismaTransactionClient,
  userId: string,
  amount: number,
  source: XpSource,
  sourceId?: string,
  metadata: Record<string, unknown> = {},
) {
  // Create XP event
  await tx.xpEvent.create({
    data: {
      userId,
      amount,
      source,
      sourceId,
      metadata,
    },
  })

  // Increment totalXp and get new value
  const updatedUser = await tx.user.update({
    where: { id: userId },
    data: { totalXp: { increment: amount } },
    select: { totalXp: true, level: true },
  })

  // Recalculate level
  const newLevelInfo = getLevelForXp(updatedUser.totalXp)
  const previousLevel = updatedUser.level
  const leveledUp = newLevelInfo.level > previousLevel

  if (leveledUp) {
    await tx.user.update({
      where: { id: userId },
      data: { level: newLevelInfo.level },
    })

    // Create activity feed item for level-up
    await tx.activityFeedItem.create({
      data: {
        userId,
        activityType: 'LEVEL_UP',
        metadata: {
          level: newLevelInfo.level,
          levelName: newLevelInfo.name,
          previousLevel,
        },
      },
    })
  }

  return {
    xpAwarded: amount,
    newTotalXp: updatedUser.totalXp,
    previousLevel,
    newLevel: newLevelInfo.level,
    leveledUp,
  }
}

/** Calculate and award all XP for a completed workout session. */
export async function calculateWorkoutXp(
  tx: PrismaTransactionClient,
  userId: string,
  sessionId: string,
): Promise<{
  breakdown: Array<{ source: XpSource; amount: number }>
  leveledUp: boolean
  newLevel: number
  newLevelName: string
}> {
  const breakdown: Array<{ source: XpSource; amount: number }> = []

  // 1. Base: WORKOUT_COMPLETE
  breakdown.push({
    source: 'WORKOUT_COMPLETE',
    amount: XP_VALUES.WORKOUT_COMPLETE,
  })

  // Fetch session sets
  const sets = await tx.workoutSet.findMany({
    where: { workoutSessionId: sessionId },
    include: { exercise: { select: { id: true } } },
  })

  // 2. Sets: count non-warmup sets
  const workingSets = sets.filter((s) => !s.isWarmup)
  if (workingSets.length > 0) {
    breakdown.push({
      source: 'SET_LOGGED',
      amount: workingSets.length * XP_VALUES.SET_LOGGED,
    })
  }

  // 3. RPE: count sets with RPE value
  const rpeSets = sets.filter((s) => s.rpe != null)
  if (rpeSets.length > 0) {
    breakdown.push({
      source: 'RPE_LOGGED',
      amount: rpeSets.length * XP_VALUES.RPE_LOGGED,
    })
  }

  // 4. First workout of the week
  const now = new Date()
  const weekStart = getWeekStart(now)
  const otherSessionsThisWeek = await tx.workoutSession.count({
    where: {
      userId,
      id: { not: sessionId },
      completedAt: { gte: weekStart, not: null },
    },
  })
  if (otherSessionsThisWeek === 0) {
    breakdown.push({
      source: 'FIRST_WORKOUT_OF_WEEK',
      amount: XP_VALUES.FIRST_WORKOUT_OF_WEEK,
    })
  }

  // 5. New exercises: check if any exercises in this session are new for the user
  const exerciseIdsInSession = [...new Set(sets.map((s) => s.exercise.id))]
  const newExerciseIds: Array<string> = []
  for (const exerciseId of exerciseIdsInSession) {
    const previousSets = await tx.workoutSet.count({
      where: {
        exerciseId,
        workoutSession: {
          userId,
          id: { not: sessionId },
          completedAt: { not: null },
        },
      },
    })
    if (previousSets === 0) {
      newExerciseIds.push(exerciseId)
      breakdown.push({ source: 'NEW_EXERCISE', amount: XP_VALUES.NEW_EXERCISE })
    }
  }

  // 6. Streak bonus
  // We can't easily use calculateStreak inside a transaction since it uses prisma directly,
  // so we'll do a simplified check by counting recent weeks with workouts
  const fourWeeksAgo = new Date(weekStart)
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
  const recentSessions = await tx.workoutSession.findMany({
    where: {
      userId,
      completedAt: { gte: fourWeeksAgo, not: null },
    },
    select: { completedAt: true },
  })

  const weekSet = new Set<string>()
  for (const s of recentSessions) {
    if (s.completedAt) {
      const ws = getWeekStart(s.completedAt)
      weekSet.add(ws.toISOString())
    }
  }

  // Count consecutive weeks ending with current week
  let streakWeeks = 0
  const checkWeek = new Date(weekStart)
  for (let i = 0; i < 4; i++) {
    if (weekSet.has(checkWeek.toISOString())) {
      streakWeeks++
      checkWeek.setDate(checkWeek.getDate() - 7)
    } else {
      break
    }
  }

  if (streakWeeks >= 2) {
    breakdown.push({
      source: 'STREAK_BONUS',
      amount: streakWeeks * XP_VALUES.STREAK_BONUS,
    })
  }

  // Batch award: single user read, single createMany, single user update, one level check
  const totalXpAwarded = breakdown.reduce((sum, b) => sum + b.amount, 0)
  if (totalXpAwarded === 0) {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { totalXp: true, level: true },
    })
    const levelInfo = getLevelForXp(user?.totalXp ?? 0)
    return {
      breakdown,
      leveledUp: false,
      newLevel: levelInfo.level,
      newLevelName: levelInfo.name,
    }
  }

  // Get level before awarding XP
  const userBefore = await tx.user.findUnique({
    where: { id: userId },
    select: { level: true },
  })
  const previousLevel = userBefore?.level ?? 1

  // Batch create all XP events
  await tx.xpEvent.createMany({
    data: breakdown.map((b) => ({
      userId,
      amount: b.amount,
      source: b.source,
      sourceId:
        b.source === 'NEW_EXERCISE'
          ? newExerciseIds[
              breakdown.filter((x) => x.source === 'NEW_EXERCISE').indexOf(b)
            ]
          : sessionId,
      metadata: {},
    })),
  })

  // Single user update with total XP increment
  const updatedUser = await tx.user.update({
    where: { id: userId },
    data: { totalXp: { increment: totalXpAwarded } },
    select: { totalXp: true },
  })

  // Single level check
  const newLevelInfo = getLevelForXp(updatedUser.totalXp)
  const leveledUp = newLevelInfo.level > previousLevel

  if (leveledUp) {
    await tx.user.update({
      where: { id: userId },
      data: { level: newLevelInfo.level },
    })

    await tx.activityFeedItem.create({
      data: {
        userId,
        activityType: 'LEVEL_UP',
        metadata: {
          level: newLevelInfo.level,
          levelName: newLevelInfo.name,
          previousLevel,
        },
      },
    })
  }

  return {
    breakdown,
    leveledUp,
    newLevel: newLevelInfo.level,
    newLevelName: newLevelInfo.name,
  }
}

// ============================================
// SERVER FUNCTIONS
// ============================================

/** Get XP summary for a user */
export const getUserXpSummary = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { totalXp: true, level: true },
    })

    if (!user) throw new Error('User not found')

    const levelInfo = getLevelForXp(user.totalXp)

    // Weekly XP
    const weekStart = getWeekStart(new Date())
    const weeklyXpResult = await prisma.xpEvent.aggregate({
      where: {
        userId: data.userId,
        createdAt: { gte: weekStart },
      },
      _sum: { amount: true },
    })

    // Recent events
    const recentEvents = await prisma.xpEvent.findMany({
      where: { userId: data.userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return {
      totalXp: user.totalXp,
      level: user.level,
      levelName: levelInfo.name,
      weeklyXp: weeklyXpResult._sum.amount ?? 0,
      recentEvents,
    }
  })

/** Get XP breakdown for a specific session */
export const getXpBreakdown = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string; sessionId: string }) => data)
  .handler(async ({ data }) => {
    const events = await prisma.xpEvent.findMany({
      where: {
        userId: data.userId,
        sourceId: data.sessionId,
      },
      orderBy: { createdAt: 'asc' },
    })

    const totalXp = events.reduce((sum, e) => sum + e.amount, 0)

    return {
      breakdown: events.map((e) => ({
        source: e.source,
        amount: e.amount,
      })),
      totalXp,
    }
  })

/** Get XP leaderboard */
export const getXpLeaderboard = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { userId?: string; scope?: 'global' | 'friends'; limit?: number }) =>
      data,
  )
  .handler(async ({ data }) => {
    const limit = data.limit ?? 50
    let userIds: Array<string> | undefined

    if (data.scope === 'friends' && data.userId) {
      const following = await prisma.follow.findMany({
        where: { followerId: data.userId, status: 'ACCEPTED' },
        select: { followingId: true },
      })
      userIds = [data.userId, ...following.map((f) => f.followingId)]
    }

    const users = await prisma.user.findMany({
      where: {
        totalXp: { gt: 0 },
        deletedAt: null,
        ...(userIds && { id: { in: userIds } }),
      },
      orderBy: { totalXp: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        totalXp: true,
        level: true,
        profile: {
          select: { username: true, avatarUrl: true },
        },
      },
    })

    return {
      leaderboard: users.map((u, index) => ({
        rank: index + 1,
        userId: u.id,
        value: u.totalXp,
        level: u.level,
        user: { id: u.id, name: u.name },
        profile: u.profile,
      })),
    }
  })

/** Backfill XP for existing users based on workout history */
export const backfillUserXp = createServerFn({ method: 'POST' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    // Check if already backfilled
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { preferences: true, totalXp: true },
    })

    if (!user) throw new Error('User not found')

    const prefs = user.preferences as Record<string, unknown>
    if (prefs.xpBackfilled) {
      return { backfilled: false, totalXp: user.totalXp }
    }

    // Fetch all completed sessions with sets
    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId: data.userId,
        completedAt: { not: null },
      },
      include: {
        workoutSets: {
          select: {
            id: true,
            isWarmup: true,
            rpe: true,
            exerciseId: true,
          },
        },
      },
      orderBy: { completedAt: 'asc' },
    })

    // Fetch all PRs
    const prs = await prisma.personalRecord.findMany({
      where: { userId: data.userId },
      select: { id: true },
    })

    // Fetch all achievements
    const achievements = await prisma.userAchievement.findMany({
      where: { userId: data.userId },
      select: { id: true },
    })

    // Fetch completed challenges
    const completedChallenges = await prisma.challengeParticipant.findMany({
      where: {
        userId: data.userId,
        completedAt: { not: null },
      },
      select: { challengeId: true },
    })

    let totalXp = 0
    const xpEvents: Array<{
      userId: string
      amount: number
      source:
        | 'WORKOUT_COMPLETE'
        | 'SET_LOGGED'
        | 'RPE_LOGGED'
        | 'PR_ACHIEVED'
        | 'ACHIEVEMENT_EARNED'
        | 'CHALLENGE_COMPLETE'
      sourceId: string | null
      metadata: Record<string, unknown>
      createdAt: Date
    }> = []

    // XP per session
    for (const session of sessions) {
      const sessionXp = XP_VALUES.WORKOUT_COMPLETE
      totalXp += sessionXp
      xpEvents.push({
        userId: data.userId,
        amount: sessionXp,
        source: 'WORKOUT_COMPLETE',
        sourceId: session.id,
        metadata: {},
        createdAt: session.completedAt!,
      })

      // Set XP
      const workingSets = session.workoutSets.filter((s) => !s.isWarmup)
      if (workingSets.length > 0) {
        const setXp = workingSets.length * XP_VALUES.SET_LOGGED
        totalXp += setXp
        xpEvents.push({
          userId: data.userId,
          amount: setXp,
          source: 'SET_LOGGED',
          sourceId: session.id,
          metadata: {},
          createdAt: session.completedAt!,
        })
      }

      // RPE XP
      const rpeSets = session.workoutSets.filter((s) => s.rpe != null)
      if (rpeSets.length > 0) {
        const rpeXp = rpeSets.length * XP_VALUES.RPE_LOGGED
        totalXp += rpeXp
        xpEvents.push({
          userId: data.userId,
          amount: rpeXp,
          source: 'RPE_LOGGED',
          sourceId: session.id,
          metadata: {},
          createdAt: session.completedAt!,
        })
      }
    }

    // PR XP
    for (const pr of prs) {
      totalXp += XP_VALUES.PR_ACHIEVED
      xpEvents.push({
        userId: data.userId,
        amount: XP_VALUES.PR_ACHIEVED,
        source: 'PR_ACHIEVED',
        sourceId: pr.id,
        metadata: {},
        createdAt: new Date(),
      })
    }

    // Achievement XP
    for (const a of achievements) {
      totalXp += XP_VALUES.ACHIEVEMENT_EARNED
      xpEvents.push({
        userId: data.userId,
        amount: XP_VALUES.ACHIEVEMENT_EARNED,
        source: 'ACHIEVEMENT_EARNED',
        sourceId: a.id,
        metadata: {},
        createdAt: new Date(),
      })
    }

    // Challenge XP
    for (const c of completedChallenges) {
      totalXp += XP_VALUES.CHALLENGE_COMPLETE
      xpEvents.push({
        userId: data.userId,
        amount: XP_VALUES.CHALLENGE_COMPLETE,
        source: 'CHALLENGE_COMPLETE',
        sourceId: c.challengeId,
        metadata: {},
        createdAt: new Date(),
      })
    }

    // Write all XP events and update user in a transaction
    const levelInfo = getLevelForXp(totalXp)

    await prisma.$transaction(async (tx) => {
      // Batch create XP events
      if (xpEvents.length > 0) {
        await tx.xpEvent.createMany({ data: xpEvents })
      }

      // Update user
      await tx.user.update({
        where: { id: data.userId },
        data: {
          totalXp,
          level: levelInfo.level,
          preferences: { ...prefs, xpBackfilled: true },
        },
      })
    })

    return { backfilled: true, totalXp, level: levelInfo.level }
  })
