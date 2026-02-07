import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db'
import { calculateStreak, getWeekStart } from './date-utils'
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
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId: data.userId },
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
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const unnotified = await prisma.userAchievement.findMany({
      where: {
        userId: data.userId,
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
  .inputValidator((data: { achievementIds: Array<string> }) => data)
  .handler(async ({ data }) => {
    await prisma.userAchievement.updateMany({
      where: {
        id: { in: data.achievementIds },
      },
      data: { notified: true },
    })

    return { success: true }
  })

// ============================================
// CHECK AND AWARD ACHIEVEMENTS
// ============================================

export const checkAchievements = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      userId: string
      triggerType: 'workout_complete' | 'pr_achieved' | 'manual'
    }) => data,
  )
  .handler(async ({ data }) => {
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
      getTotalWorkouts(data.userId),
      getTotalPRs(data.userId),
      getTotalVolume(data.userId),
      calculateStreak(data.userId),
      getMuscleGroupSetCounts(data.userId),
      getConsistencyStreak(data.userId),
    ])

    // Get all achievements not yet earned
    const earnedAchievementIds = await prisma.userAchievement.findMany({
      where: { userId: data.userId },
      select: { achievementId: true },
    })
    const earnedSet = new Set(earnedAchievementIds.map((e) => e.achievementId))

    const allAchievements = await prisma.achievement.findMany()

    // Check each achievement
    for (const achievement of allAchievements) {
      if (earnedSet.has(achievement.id)) continue

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
          earned = checkConsistencyAchievement(
            achievement.code,
            consistencyWeeks,
          )
          break
        case 'MUSCLE_FOCUS':
          earned = checkMuscleFocusAchievement(
            achievement.code,
            muscleGroupSets,
          )
          break
      }

      if (earned) {
        const userAchievement = await prisma.userAchievement.create({
          data: {
            userId: data.userId,
            achievementId: achievement.id,
            notified: false,
          },
        })

        // Create activity feed item for achievement earned
        await prisma.activityFeedItem.create({
          data: {
            userId: data.userId,
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
    }

    return { newlyEarned }
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
  const sets = await prisma.workoutSet.findMany({
    where: {
      workoutSession: {
        userId,
        completedAt: { not: null },
      },
      isWarmup: false,
    },
    select: { weight: true, reps: true },
  })

  return sets.reduce((sum, set) => {
    if (set.weight && set.reps) {
      return sum + set.weight * set.reps
    }
    return sum
  }, 0)
}

async function getMuscleGroupSetCounts(
  userId: string,
): Promise<Record<MuscleGroup, number>> {
  const sets = await prisma.workoutSet.findMany({
    where: {
      workoutSession: {
        userId,
        completedAt: { not: null },
      },
      isWarmup: false,
    },
    include: {
      exercise: { select: { muscleGroup: true } },
    },
  })

  const counts: Record<string, number> = {}
  for (const set of sets) {
    const mg = set.exercise.muscleGroup
    counts[mg] = (counts[mg] || 0) + 1
  }

  return counts as Record<MuscleGroup, number>
}

async function getConsistencyStreak(userId: string): Promise<number> {
  // Calculate consecutive weeks with 3+ workouts
  const workouts = await prisma.workoutSession.findMany({
    where: {
      userId,
      completedAt: { not: null },
    },
    select: { completedAt: true },
    orderBy: { completedAt: 'desc' },
  })

  // Group by week and count
  const weekCounts: Record<string, number> = {}
  for (const workout of workouts) {
    if (workout.completedAt) {
      const weekStart = getWeekStart(workout.completedAt)
      const weekKey = weekStart.toISOString().split('T')[0]
      weekCounts[weekKey] = (weekCounts[weekKey] || 0) + 1
    }
  }

  // Get weeks with 3+ workouts, sorted descending
  const qualifyingWeeks = Object.entries(weekCounts)
    .filter(([, count]) => count >= 3)
    .map(([week]) => week)
    .sort()
    .reverse()

  if (qualifyingWeeks.length === 0) return 0

  const today = new Date()
  const currentWeekStart = getWeekStart(today)

  // Check if most recent qualifying week is current or last week
  const currentWeekStr = currentWeekStart.toISOString().split('T')[0]
  const lastWeekStart = new Date(currentWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const lastWeekStr = lastWeekStart.toISOString().split('T')[0]

  if (
    qualifyingWeeks[0] !== currentWeekStr &&
    qualifyingWeeks[0] !== lastWeekStr
  ) {
    return 0
  }

  // Count consecutive weeks with 3+ workouts
  let streak = 0
  const expectedWeek = new Date(
    qualifyingWeeks[0] === currentWeekStr ? currentWeekStart : lastWeekStart,
  )

  for (const weekStr of qualifyingWeeks) {
    const expectedStr = expectedWeek.toISOString().split('T')[0]

    if (weekStr === expectedStr) {
      streak++
      expectedWeek.setDate(expectedWeek.getDate() - 7)
    } else if (weekStr < expectedStr) {
      break
    }
  }

  return streak
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
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    // Verify admin
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { isAdmin: true },
    })
    if (!user?.isAdmin) {
      throw new Error('Admin access required')
    }

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
      userId: string
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
    }) => data,
  )
  .handler(async ({ data }) => {
    const {
      userId,
      sortOrder = 0,
      isHidden = false,
      exerciseId,
      ...achievementData
    } = data

    // Verify admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    })
    if (!user?.isAdmin) {
      throw new Error('Admin access required')
    }

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
      userId: string
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
    }) => data,
  )
  .handler(async ({ data }) => {
    const { userId, id, ...updateData } = data

    // Verify admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    })
    if (!user?.isAdmin) {
      throw new Error('Admin access required')
    }

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
  .inputValidator((data: { userId: string; id: string }) => data)
  .handler(async ({ data }) => {
    // Verify admin
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { isAdmin: true },
    })
    if (!user?.isAdmin) {
      throw new Error('Admin access required')
    }

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
