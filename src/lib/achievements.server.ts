import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db.server'
import { requireAdmin, requireAuth } from './auth-guard.server'
import { calculateStreak } from './date-utils.server'
import type {
  AchievementCategory,
  AchievementRarity,
  MuscleGroup,
} from '@prisma/client'

// ============================================
// TYPES
// ============================================

export interface AchievementData {
  id: string
  code: string
  name: string
  description: string
  category: AchievementCategory
  rarity: AchievementRarity
  icon: string
  threshold: number
  sortOrder: number
  isHidden: boolean
}

export interface UserAchievementData {
  id: string
  achievementId: string
  earnedAt: Date
  notified: boolean
  achievement: AchievementData
}

export interface NewlyEarnedAchievement {
  id: string
  userAchievementId: string
  code: string
  name: string
  description: string
  rarity: AchievementRarity
  icon: string
}

// ============================================
// GET USER ACHIEVEMENTS
// ============================================

export const getUserAchievements = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { token: string | null; targetUserId?: string }) => data,
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth(data.token)
    const userId = data.targetUserId ?? auth.userId

    // Access control: verify the requester can view this user's achievements
    if (data.targetUserId && data.targetUserId !== auth.userId) {
      const targetProfile = await prisma.userProfile.findUnique({
        where: { userId: data.targetUserId },
      })
      if (!targetProfile || !targetProfile.showAchievements) {
        throw new Error('Cannot view this content')
      }
      if (targetProfile.isPrivate) {
        const follow = await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: auth.userId,
              followingId: data.targetUserId,
            },
          },
        })
        if (follow?.status !== 'ACCEPTED') {
          throw new Error('Cannot view this content')
        }
      }
    }

    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
      orderBy: [{ earnedAt: 'desc' }],
    })

    // Get all achievements for progress display
    const allAchievements = await prisma.achievement.findMany({
      where: { isHidden: false },
      orderBy: { sortOrder: 'asc' },
    })

    // Build earned set for quick lookup
    const earnedSet = new Set(userAchievements.map((ua) => ua.achievementId))

    return {
      earned: userAchievements,
      all: allAchievements,
      earnedCount: userAchievements.length,
      totalCount: allAchievements.length,
      earnedSet: Array.from(earnedSet),
    }
  })

// ============================================
// GET UNNOTIFIED ACHIEVEMENTS
// ============================================

export const getUnnotifiedAchievements = createServerFn({ method: 'GET' })
  .inputValidator((data: { token: string | null }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    const unnotified = await prisma.userAchievement.findMany({
      where: {
        userId,
        notified: false,
      },
      include: {
        achievement: true,
      },
      orderBy: { earnedAt: 'asc' },
    })

    return { achievements: unnotified }
  })

// ============================================
// MARK ACHIEVEMENTS AS NOTIFIED
// ============================================

export const markAchievementsNotified = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { token: string | null; achievementIds: Array<string> }) => data,
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    await prisma.userAchievement.updateMany({
      where: {
        id: { in: data.achievementIds },
        userId,
      },
      data: { notified: true },
    })

    return { success: true }
  })

// ============================================
// CHECK AND AWARD ACHIEVEMENTS
// ============================================

export async function checkAchievementsInternal(
  userId: string,
  triggerType: 'workout_complete' | 'pr_achieved' | 'manual',
) {
  const newlyEarned: Array<NewlyEarnedAchievement> = []

  // Get user's current stats
  const [
    totalWorkouts,
    totalPRs,
    totalVolume,
    currentStreak,
    muscleGroupSets,
    consistencyWeeks,
  ] = await Promise.all([
    getTotalWorkouts(userId),
    getTotalPRs(userId),
    getTotalVolume(userId),
    calculateStreak(userId),
    getMuscleGroupSetCounts(userId),
    getConsistencyStreak(userId),
  ])

  // Get all achievements not yet earned
  const earnedAchievementIds = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true },
  })
  const earnedSet = new Set(earnedAchievementIds.map((e) => e.achievementId))

  const allAchievements = await prisma.achievement.findMany({
    where: { id: { notIn: Array.from(earnedSet) } },
  })

  // Check each unearned achievement
  const toEarn: typeof allAchievements = []
  for (const achievement of allAchievements) {
    let earned = false

    switch (achievement.category) {
      case 'MILESTONE':
        earned = checkMilestoneAchievement(achievement.code, totalWorkouts)
        break
      case 'STREAK':
        earned = checkStreakAchievement(achievement.code, currentStreak)
        break
      case 'PERSONAL_RECORD':
        earned = checkPRAchievement(achievement.code, totalPRs)
        break
      case 'VOLUME':
        earned = checkVolumeAchievement(achievement.code, totalVolume)
        break
      case 'CONSISTENCY':
        earned = checkConsistencyAchievement(achievement.code, consistencyWeeks)
        break
      case 'MUSCLE_FOCUS':
        earned = checkMuscleFocusAchievement(achievement.code, muscleGroupSets)
        break
    }

    if (earned) toEarn.push(achievement)
  }

  // Batch all achievement creation into a single transaction
  if (toEarn.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const achievement of toEarn) {
        const userAchievement = await tx.userAchievement.create({
          data: {
            userId,
            achievementId: achievement.id,
            notified: false,
          },
        })

        await tx.activityFeedItem.create({
          data: {
            userId,
            activityType: 'ACHIEVEMENT_EARNED',
            referenceId: userAchievement.id,
            metadata: {
              achievementName: achievement.name,
              achievementIcon: achievement.icon,
              achievementRarity: achievement.rarity,
            },
          },
        })

        newlyEarned.push({
          id: achievement.id,
          userAchievementId: userAchievement.id,
          code: achievement.code,
          name: achievement.name,
          description: achievement.description,
          rarity: achievement.rarity,
          icon: achievement.icon,
        })
      }
    })
  }

  return { newlyEarned }
}

export const checkAchievements = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      token: string | null
      triggerType: 'workout_complete' | 'pr_achieved' | 'manual'
    }) => data,
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    return checkAchievementsInternal(userId, data.triggerType)
  })

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getTotalWorkouts(userId: string): Promise<number> {
  return prisma.workoutSession.count({
    where: {
      userId,
      completedAt: { not: null },
    },
  })
}

async function getTotalPRs(userId: string): Promise<number> {
  return prisma.personalRecord.count({
    where: { userId },
  })
}

async function getTotalVolume(userId: string): Promise<number> {
  const result = await prisma.$queryRaw<[{ total: number | null }]>`
    SELECT COALESCE(SUM(ws.weight * ws.reps), 0) AS total
    FROM workout_sets ws
    JOIN workout_sessions s ON s.id = ws.workout_session_id
    WHERE s.user_id = ${userId}
      AND s.completed_at IS NOT NULL
      AND ws.is_warmup = false
      AND ws.weight IS NOT NULL
      AND ws.reps IS NOT NULL
  `
  return Number(result[0].total)
}

async function getMuscleGroupSetCounts(
  userId: string,
): Promise<Record<MuscleGroup, number>> {
  const rows = await prisma.$queryRaw<
    Array<{ muscle_group: string; set_count: bigint }>
  >`
    SELECT e.muscle_group, COUNT(ws.id) AS set_count
    FROM workout_sets ws
    JOIN exercises e ON e.id = ws.exercise_id
    JOIN workout_sessions s ON s.id = ws.workout_session_id
    WHERE s.user_id = ${userId} AND s.completed_at IS NOT NULL
      AND ws.is_warmup = false
    GROUP BY e.muscle_group
  `

  const counts: Record<string, number> = {}
  for (const row of rows) {
    counts[row.muscle_group] = Number(row.set_count)
  }

  return counts as Record<MuscleGroup, number>
}

async function getConsistencyStreak(userId: string): Promise<number> {
  const result = await prisma.$queryRaw<[{ streak: number }]>`
    WITH week_counts AS (
      SELECT date_trunc('week', completed_at)::date AS week_start, COUNT(*) AS cnt
      FROM workout_sessions
      WHERE user_id = ${userId} AND completed_at IS NOT NULL
        AND completed_at >= NOW() - interval '2 years'
      GROUP BY week_start
      HAVING COUNT(*) >= 3
    ),
    numbered AS (
      SELECT week_start,
        week_start - (ROW_NUMBER() OVER (ORDER BY week_start))::int * 7 AS grp
      FROM week_counts
    ),
    streaks AS (
      SELECT COUNT(*) AS streak_len, MAX(week_start) AS last_week
      FROM numbered GROUP BY grp
    )
    SELECT COALESCE(MAX(streak_len), 0)::int AS streak
    FROM streaks
    WHERE last_week >= date_trunc('week', NOW())::date - 7
  `
  return Number(result[0].streak)
}

// Achievement check functions
function checkMilestoneAchievement(
  code: string,
  totalWorkouts: number,
): boolean {
  const thresholds: Record<string, number> = {
    FIRST_WORKOUT: 1,
    WORKOUTS_5: 5,
    WORKOUTS_10: 10,
    WORKOUTS_50: 50,
    WORKOUTS_100: 100,
    WORKOUTS_365: 365,
  }
  return totalWorkouts >= (thresholds[code] ?? Infinity)
}

function checkStreakAchievement(code: string, currentStreak: number): boolean {
  const thresholds: Record<string, number> = {
    STREAK_1: 1,
    STREAK_4: 4,
    STREAK_13: 13,
    STREAK_26: 26,
    STREAK_52: 52,
  }
  return currentStreak >= (thresholds[code] ?? Infinity)
}

function checkPRAchievement(code: string, totalPRs: number): boolean {
  const thresholds: Record<string, number> = {
    FIRST_PR: 1,
    PRS_5: 5,
    PRS_10: 10,
    PRS_25: 25,
    PRS_50: 50,
  }
  return totalPRs >= (thresholds[code] ?? Infinity)
}

function checkVolumeAchievement(code: string, totalVolume: number): boolean {
  const thresholds: Record<string, number> = {
    VOLUME_1000: 1000,
    VOLUME_10000: 10000,
    VOLUME_100000: 100000,
    VOLUME_500000: 500000,
    VOLUME_1000000: 1000000,
  }
  return totalVolume >= (thresholds[code] ?? Infinity)
}

function checkConsistencyAchievement(
  code: string,
  consistencyWeeks: number,
): boolean {
  const thresholds: Record<string, number> = {
    CONSISTENCY_3X4: 4,
    CONSISTENCY_3X12: 12,
  }
  return consistencyWeeks >= (thresholds[code] ?? Infinity)
}

function checkMuscleFocusAchievement(
  code: string,
  muscleGroupSets: Record<MuscleGroup, number>,
): boolean {
  const mapping: Record<string, { muscle: MuscleGroup; threshold: number }> = {
    MUSCLE_CHEST_50: { muscle: 'CHEST', threshold: 50 },
    MUSCLE_BACK_50: { muscle: 'BACK', threshold: 50 },
    MUSCLE_LEGS_50: { muscle: 'LEGS', threshold: 50 },
    MUSCLE_SHOULDERS_50: { muscle: 'SHOULDERS', threshold: 50 },
    MUSCLE_ARMS_50: { muscle: 'ARMS', threshold: 50 },
    MUSCLE_CORE_50: { muscle: 'CORE', threshold: 50 },
  }

  const config = mapping[code]
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive check for unknown achievement codes
  if (!config) return false

  return (muscleGroupSets[config.muscle] || 0) >= config.threshold
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

// Get all achievements (for admin panel)
export const getAllAchievements = createServerFn({ method: 'GET' })
  .inputValidator((data: { token: string | null }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token)

    const achievements = await prisma.achievement.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      include: {
        exercise: {
          select: { id: true, name: true },
        },
      },
    })

    return { achievements }
  })

// Create achievement (admin only)
export const createAchievement = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      token: string | null
      code: string
      name: string
      description: string
      category: AchievementCategory
      rarity: AchievementRarity
      icon: string
      threshold: number
      sortOrder?: number
      isHidden?: boolean
      exerciseId?: string | null
    }) => {
      if (data.threshold <= 0)
        throw new Error('Threshold must be a positive number')
      return data
    },
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.token)

    const {
      token: _,
      sortOrder = 0,
      isHidden = false,
      exerciseId,
      ...achievementData
    } = data

    // Check code uniqueness
    const existing = await prisma.achievement.findUnique({
      where: { code: achievementData.code },
    })
    if (existing) {
      throw new Error('Achievement code already exists')
    }

    const achievement = await prisma.achievement.create({
      data: {
        ...achievementData,
        sortOrder,
        isHidden,
        exerciseId: exerciseId || null,
      },
    })

    return { achievement }
  })

// Update achievement (admin only)
export const updateAchievement = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      token: string | null
      id: string
      code?: string
      name?: string
      description?: string
      category?: AchievementCategory
      rarity?: AchievementRarity
      icon?: string
      threshold?: number
      sortOrder?: number
      isHidden?: boolean
      exerciseId?: string | null
    }) => {
      if (data.threshold !== undefined && data.threshold <= 0)
        throw new Error('Threshold must be a positive number')
      return data
    },
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.token)

    const { token: _, id, ...updateData } = data

    // Check if achievement exists
    const existing = await prisma.achievement.findUnique({
      where: { id },
    })
    if (!existing) {
      throw new Error('Achievement not found')
    }

    // If code is being changed, check uniqueness
    if (updateData.code && updateData.code !== existing.code) {
      const codeExists = await prisma.achievement.findUnique({
        where: { code: updateData.code },
      })
      if (codeExists) {
        throw new Error('Achievement code already exists')
      }
    }

    const achievement = await prisma.achievement.update({
      where: { id },
      data: updateData,
    })

    return { achievement }
  })

// Delete achievement (admin only)
export const deleteAchievement = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string | null; id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token)

    // Check if achievement exists
    const existing = await prisma.achievement.findUnique({
      where: { id: data.id },
    })
    if (!existing) {
      throw new Error('Achievement not found')
    }

    // Delete associated user achievements first
    await prisma.userAchievement.deleteMany({
      where: { achievementId: data.id },
    })

    await prisma.achievement.delete({
      where: { id: data.id },
    })

    return { success: true }
  })
