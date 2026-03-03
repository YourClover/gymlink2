import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db'
import { calculateStreak } from './date-utils.server'
import {
  getDayStart,
  getMonthStart,
  getWeekStart,
  type Granularity,
} from './date-utils'
import { PR_PRIORITY } from './pr-utils'
import type { RecordType } from '@prisma/client'

// ============================================
// OVERVIEW STATS
// ============================================

export const getOverviewStats = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string; startDate?: string }) => data)
  .handler(async ({ data }) => {
    const dateFilter = data.startDate
      ? { not: null, gte: new Date(data.startDate) }
      : { not: null }

    // Compute previous period date range for comparison
    let previousDateFilter: { not: null; gte: Date; lt: Date } | undefined
    let previousPrFilter: { gte: Date; lt: Date } | undefined

    if (data.startDate) {
      const startMs = new Date(data.startDate).getTime()
      const nowMs = Date.now()
      const durationMs = nowMs - startMs
      const previousStart = new Date(startMs - durationMs)
      const previousEnd = new Date(startMs)
      previousDateFilter = {
        not: null,
        gte: previousStart,
        lt: previousEnd,
      }
      previousPrFilter = { gte: previousStart, lt: previousEnd }
    }

    async function queryPeriodStats(
      completedAtFilter: typeof dateFilter,
      prFilter?: { gte: Date; lt?: Date },
    ) {
      const [workouts, times, sets, prs] = await Promise.all([
        prisma.workoutSession.count({
          where: { userId: data.userId, completedAt: completedAtFilter },
        }),
        prisma.workoutSession.aggregate({
          where: { userId: data.userId, completedAt: completedAtFilter },
          _sum: { durationSeconds: true },
        }),
        prisma.workoutSet.findMany({
          where: {
            workoutSession: {
              userId: data.userId,
              completedAt: completedAtFilter,
            },
            isWarmup: false,
          },
          select: { weight: true, reps: true },
        }),
        prisma.personalRecord.count({
          where: {
            userId: data.userId,
            ...(prFilter ? { achievedAt: prFilter } : {}),
          },
        }),
      ])

      let volume = 0
      for (const set of sets) {
        if (set.weight && set.reps) {
          volume += set.weight * set.reps
        }
      }

      return {
        totalWorkouts: workouts,
        totalTimeSeconds: times._sum.durationSeconds ?? 0,
        totalVolume: volume,
        totalPRs: prs,
      }
    }

    const [currentStats, previousStats, currentStreak] = await Promise.all([
      queryPeriodStats(
        dateFilter,
        data.startDate ? { gte: new Date(data.startDate) } : undefined,
      ),
      previousDateFilter
        ? queryPeriodStats(previousDateFilter, previousPrFilter)
        : Promise.resolve(undefined),
      calculateStreak(data.userId),
    ])

    return {
      stats: {
        ...currentStats,
        currentStreak,
      },
      previousStats,
    }
  })

// ============================================
// VOLUME HISTORY
// ============================================

function getPeriodStart(date: Date, granularity: Granularity): Date {
  switch (granularity) {
    case 'daily':
      return getDayStart(date)
    case 'weekly':
      return getWeekStart(date)
    case 'monthly':
      return getMonthStart(date)
  }
}

function advancePeriod(date: Date, granularity: Granularity): Date {
  const d = new Date(date)
  switch (granularity) {
    case 'daily':
      d.setDate(d.getDate() + 1)
      return d
    case 'weekly':
      d.setDate(d.getDate() + 7)
      return d
    case 'monthly':
      d.setMonth(d.getMonth() + 1)
      return d
  }
}

export const getVolumeHistory = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      userId: string
      startDate?: string
      granularity?: Granularity
    }) => data,
  )
  .handler(async ({ data }) => {
    const granularity = data.granularity ?? 'weekly'
    const today = new Date()

    let startDate: Date

    if (data.startDate) {
      startDate = getPeriodStart(new Date(data.startDate), granularity)
    } else {
      // For "all" (no startDate), find the user's earliest completed workout
      const earliest = await prisma.workoutSession.findFirst({
        where: {
          userId: data.userId,
          completedAt: { not: null },
        },
        orderBy: { completedAt: 'asc' },
        select: { completedAt: true },
      })

      if (!earliest?.completedAt) {
        return { periods: [] }
      }

      startDate = getPeriodStart(earliest.completedAt, granularity)
    }

    // Get all completed workout sets in this period
    const workouts = await prisma.workoutSession.findMany({
      where: {
        userId: data.userId,
        AND: [
          { completedAt: { not: null } },
          { completedAt: { gte: startDate } },
        ],
      },
      include: {
        workoutSets: {
          where: { isWarmup: false },
          select: {
            weight: true,
            reps: true,
          },
        },
      },
    })

    // Group by period
    const periodVolume: Record<string, number> = {}
    const periodWorkouts: Record<string, number> = {}

    for (const workout of workouts) {
      if (!workout.completedAt) continue

      const periodStart = getPeriodStart(workout.completedAt, granularity)
      const periodKey = periodStart.toISOString().split('T')[0]

      if (!periodVolume[periodKey]) {
        periodVolume[periodKey] = 0
        periodWorkouts[periodKey] = 0
      }

      periodWorkouts[periodKey]++

      for (const set of workout.workoutSets) {
        if (set.weight && set.reps) {
          periodVolume[periodKey] += set.weight * set.reps
        }
      }
    }

    // Build array of periods
    const periods: Array<{
      periodStart: string
      volume: number
      workouts: number
    }> = []

    const endDate = getPeriodStart(today, granularity)
    let cursor = new Date(startDate)

    while (cursor <= endDate) {
      const periodKey = cursor.toISOString().split('T')[0]
      periods.push({
        periodStart: periodKey,
        volume: periodVolume[periodKey] ?? 0,
        workouts: periodWorkouts[periodKey] ?? 0,
      })
      cursor = advancePeriod(cursor, granularity)
    }

    return { periods }
  })

// ============================================
// EXERCISE STATS
// ============================================

export const getExerciseStats = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string; startDate?: string }) => data)
  .handler(async ({ data }) => {
    const dateFilter = data.startDate
      ? { not: null, gte: new Date(data.startDate) }
      : { not: null }

    // Muscle group distribution
    const muscleGroupCounts = await prisma.workoutSet.groupBy({
      by: ['exerciseId'],
      where: {
        workoutSession: {
          userId: data.userId,
          completedAt: dateFilter,
        },
        isWarmup: false,
      },
      _count: {
        id: true,
      },
    })

    // Get all exercises to map to muscle groups
    const allExerciseIds = muscleGroupCounts.map((e) => e.exerciseId)
    const allExercises = await prisma.exercise.findMany({
      where: { id: { in: allExerciseIds } },
      select: { id: true, muscleGroup: true },
    })

    const muscleDistribution: Record<string, number> = {}
    let totalSets = 0

    for (const ec of muscleGroupCounts) {
      const exercise = allExercises.find((e) => e.id === ec.exerciseId)
      const group = exercise?.muscleGroup ?? 'OTHER'
      muscleDistribution[group] =
        (muscleDistribution[group] ?? 0) + ec._count.id
      totalSets += ec._count.id
    }

    // Convert to percentages and sort
    const muscleGroups = Object.entries(muscleDistribution)
      .map(([muscle, count]) => ({
        muscle,
        count,
        percentage: totalSets > 0 ? Math.round((count / totalSets) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)

    return {
      muscleGroups,
      totalSets,
    }
  })

// ============================================
// RECENT PRs
// ============================================

export const getRecentPRs = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { userId: string; limit?: number; startDate?: string }) => {
      // Validate limit if provided
      if (data.limit !== undefined && (data.limit < 1 || data.limit > 100)) {
        throw new Error('limit must be between 1 and 100')
      }
      return data
    },
  )
  .handler(async ({ data }) => {
    const prs = await prisma.personalRecord.findMany({
      where: {
        userId: data.userId,
        ...(data.startDate
          ? { achievedAt: { gte: new Date(data.startDate) } }
          : {}),
      },
      include: {
        exercise: {
          select: { name: true, muscleGroup: true, isTimed: true },
        },
        workoutSet: {
          select: { reps: true, timeSeconds: true, weight: true },
        },
      },
      orderBy: {
        achievedAt: 'desc',
      },
      take: data.limit ?? 10,
    })

    return {
      prs: prs.map((pr) => ({
        id: pr.id,
        exerciseName: pr.exercise.name,
        muscleGroup: pr.exercise.muscleGroup,
        isTimed: pr.exercise.isTimed,
        recordType: pr.recordType,
        value: pr.value,
        weight: pr.workoutSet.weight ?? null,
        reps: pr.workoutSet.reps ?? null,
        timeSeconds: pr.workoutSet.timeSeconds ?? null,
        achievedAt: pr.achievedAt,
      })),
    }
  })

// ============================================
// WORKOUT DURATION STATS
// ============================================

export const getDurationStats = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string; startDate?: string }) => data)
  .handler(async ({ data }) => {
    const dateFilter = data.startDate
      ? { not: null, gte: new Date(data.startDate) }
      : { not: null }

    const agg = await prisma.workoutSession.aggregate({
      where: {
        userId: data.userId,
        completedAt: dateFilter,
        durationSeconds: { not: null },
      },
      _avg: { durationSeconds: true },
      _max: { durationSeconds: true },
      _sum: { durationSeconds: true },
      _count: true,
    })

    // Get last 12 sessions for sparkline trend
    const recentSessions = await prisma.workoutSession.findMany({
      where: {
        userId: data.userId,
        completedAt: dateFilter,
        durationSeconds: { not: null },
      },
      select: { durationSeconds: true, completedAt: true },
      orderBy: { completedAt: 'asc' },
      take: 12,
    })

    return {
      avgDurationSeconds: Math.round(agg._avg.durationSeconds ?? 0),
      maxDurationSeconds: agg._max.durationSeconds ?? 0,
      totalDurationSeconds: agg._sum.durationSeconds ?? 0,
      sessionCount: agg._count,
      trend: recentSessions.map((s) => ({
        duration: s.durationSeconds ?? 0,
        date: s.completedAt!.toISOString().split('T')[0],
      })),
    }
  })

// ============================================
// MOOD STATS
// ============================================

export const getMoodStats = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string; startDate?: string }) => data)
  .handler(async ({ data }) => {
    const dateFilter = data.startDate
      ? { not: null, gte: new Date(data.startDate) }
      : { not: null }

    const agg = await prisma.workoutSession.aggregate({
      where: {
        userId: data.userId,
        completedAt: dateFilter,
        moodRating: { not: null },
      },
      _avg: { moodRating: true },
      _count: true,
    })

    // Get last 12 sessions with mood for sparkline trend
    const recentSessions = await prisma.workoutSession.findMany({
      where: {
        userId: data.userId,
        completedAt: dateFilter,
        moodRating: { not: null },
      },
      select: { moodRating: true, completedAt: true },
      orderBy: { completedAt: 'asc' },
      take: 12,
    })

    return {
      avgMood: Math.round((agg._avg.moodRating ?? 0) * 10) / 10,
      moodCount: agg._count,
      trend: recentSessions.map((s) => ({
        mood: s.moodRating!,
        date: s.completedAt!.toISOString().split('T')[0],
      })),
    }
  })

// ============================================
// USER EXERCISE PRs (all exercises with best PR)
// ============================================

export const getUserExercisePRs = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    // Get all PRs for the user
    const prs = await prisma.personalRecord.findMany({
      where: {
        userId: data.userId,
      },
      include: {
        exercise: {
          select: {
            id: true,
            name: true,
            muscleGroup: true,
            isTimed: true,
          },
        },
        workoutSet: {
          select: { reps: true, timeSeconds: true, weight: true },
        },
      },
      orderBy: [
        { exerciseId: 'asc' },
        { value: 'desc' },
        { achievedAt: 'desc' },
      ],
    })

    // Group by exercise+recordType and take the best PR for each
    const exercisePRsByType = new Map<
      string,
      {
        exerciseId: string
        exerciseName: string
        muscleGroup: string
        isTimed: boolean
        value: number
        reps: number | null
        timeSeconds: number | null
        weight: number | null
        recordType: RecordType
        achievedAt: Date
        previousRecord: number | null
      }
    >()

    for (const pr of prs) {
      const key = `${pr.exerciseId}-${pr.recordType}`
      if (!exercisePRsByType.has(key)) {
        exercisePRsByType.set(key, {
          exerciseId: pr.exerciseId,
          exerciseName: pr.exercise.name,
          muscleGroup: pr.exercise.muscleGroup,
          isTimed: pr.exercise.isTimed,
          value: pr.value,
          reps: pr.workoutSet.reps ?? null,
          timeSeconds: pr.workoutSet.timeSeconds ?? null,
          weight: pr.workoutSet.weight ?? null,
          recordType: pr.recordType,
          achievedAt: pr.achievedAt,
          previousRecord: pr.previousRecord,
        })
      }
    }

    // For each exercise, select the most relevant PR type
    // Priority: MAX_VOLUME > MAX_TIME/MAX_REPS > MAX_WEIGHT
    const exerciseIds = [...new Set(prs.map((pr) => pr.exerciseId))]
    const exercisePRs = new Map<
      string,
      typeof exercisePRsByType extends Map<string, infer V> ? V : never
    >()

    for (const exerciseId of exerciseIds) {
      const exercisePRsForType = Array.from(exercisePRsByType.values()).filter(
        (pr) => pr.exerciseId === exerciseId,
      )

      exercisePRsForType.sort(
        (a, b) => PR_PRIORITY[a.recordType] - PR_PRIORITY[b.recordType],
      )

      if (exercisePRsForType.length > 0) {
        exercisePRs.set(exerciseId, exercisePRsForType[0])
      }
    }

    // Convert to array and group by muscle group
    const allPRs = Array.from(exercisePRs.values())

    const grouped: Record<
      string,
      Array<{
        exerciseId: string
        exerciseName: string
        isTimed: boolean
        value: number
        reps: number | null
        timeSeconds: number | null
        weight: number | null
        recordType: RecordType
        achievedAt: Date
        previousRecord: number | null
      }>
    > = {}

    for (const pr of allPRs) {
      grouped[pr.muscleGroup] ??= []
      grouped[pr.muscleGroup].push({
        exerciseId: pr.exerciseId,
        exerciseName: pr.exerciseName,
        isTimed: pr.isTimed,
        value: pr.value,
        reps: pr.reps,
        timeSeconds: pr.timeSeconds,
        weight: pr.weight,
        recordType: pr.recordType,
        achievedAt: pr.achievedAt,
        previousRecord: pr.previousRecord,
      })
    }

    return { grouped, total: allPRs.length }
  })

// ============================================
// WORKOUT CONSISTENCY (heatmap data)
// ============================================

export const getWorkoutConsistency = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    // Always last 16 weeks regardless of time range filter
    const today = new Date()
    const sixteenWeeksAgo = new Date(today)
    sixteenWeeksAgo.setDate(sixteenWeeksAgo.getDate() - 16 * 7)
    sixteenWeeksAgo.setHours(0, 0, 0, 0)

    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId: data.userId,
        completedAt: { not: null, gte: sixteenWeeksAgo },
      },
      select: { completedAt: true },
    })

    const completedDates = sessions
      .filter((s) => s.completedAt)
      .map((s) => s.completedAt!.toISOString())

    return { completedDates }
  })

// ============================================
// RPE STATS
// ============================================

export const getRpeStats = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string; startDate?: string }) => data)
  .handler(async ({ data }) => {
    const dateFilter = data.startDate
      ? { not: null, gte: new Date(data.startDate) }
      : { not: null }

    const setsWithRpe = await prisma.workoutSet.findMany({
      where: {
        workoutSession: {
          userId: data.userId,
          completedAt: dateFilter,
        },
        isWarmup: false,
        rpe: { not: null },
      },
      select: {
        rpe: true,
        workoutSession: {
          select: { id: true, completedAt: true },
        },
      },
      orderBy: {
        workoutSession: { completedAt: 'asc' },
      },
    })

    if (setsWithRpe.length === 0)
      return { avgRpe: 0, totalRatedSets: 0, distribution: {}, trend: [] }

    // Distribution (count per RPE 1-10)
    const distribution: Record<number, number> = {}
    let totalRpe = 0
    for (const set of setsWithRpe) {
      const rpe = set.rpe!
      distribution[rpe] = (distribution[rpe] ?? 0) + 1
      totalRpe += rpe
    }

    // Average RPE per session (last 20 sessions)
    const sessionRpes = new Map<
      string,
      { total: number; count: number; date: string }
    >()
    for (const set of setsWithRpe) {
      const sessionId = set.workoutSession.id
      const existing = sessionRpes.get(sessionId)
      if (existing) {
        existing.total += set.rpe!
        existing.count++
      } else {
        sessionRpes.set(sessionId, {
          total: set.rpe!,
          count: 1,
          date: set.workoutSession.completedAt!.toISOString().split('T')[0],
        })
      }
    }

    const trend = Array.from(sessionRpes.values())
      .map((s) => ({
        avgRpe: Math.round((s.total / s.count) * 10) / 10,
        date: s.date,
      }))
      .slice(-20)

    return {
      avgRpe: Math.round((totalRpe / setsWithRpe.length) * 10) / 10,
      totalRatedSets: setsWithRpe.length,
      distribution,
      trend,
    }
  })

// ============================================
// PR TIMELINE
// ============================================

export const getPrTimeline = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { userId: string; limit?: number; startDate?: string }) => data,
  )
  .handler(async ({ data }) => {
    const prs = await prisma.personalRecord.findMany({
      where: {
        userId: data.userId,
        previousRecord: { not: null },
        ...(data.startDate
          ? { achievedAt: { gte: new Date(data.startDate) } }
          : {}),
      },
      include: {
        exercise: {
          select: { name: true, muscleGroup: true },
        },
      },
      orderBy: { achievedAt: 'desc' },
      take: data.limit ?? 15,
    })

    return {
      timeline: prs.map((pr) => {
        const improvement =
          pr.previousRecord && pr.previousRecord > 0
            ? Math.round(
                ((pr.value - pr.previousRecord) / pr.previousRecord) * 100,
              )
            : null

        return {
          id: pr.id,
          exerciseName: pr.exercise.name,
          muscleGroup: pr.exercise.muscleGroup,
          recordType: pr.recordType,
          value: pr.value,
          previousRecord: pr.previousRecord,
          improvement,
          achievedAt: pr.achievedAt,
        }
      }),
    }
  })
