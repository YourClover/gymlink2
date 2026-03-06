import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db.server'
import { requireAuth } from './auth-guard.server'
import { calculateStreak } from './date-utils.server'
import { PR_PRIORITY } from './pr-utils'
import type { Granularity } from './date-utils'
import { Prisma, type RecordType } from '@prisma/client'

// ============================================
// OVERVIEW STATS
// ============================================

export const getOverviewStats = createServerFn({ method: 'GET' })
  .inputValidator((data: { token: string | null; startDate?: string }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

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
      // Build date bounds for raw SQL volume query
      const dateGte =
        completedAtFilter && typeof completedAtFilter === 'object' && 'gte' in completedAtFilter
          ? (completedAtFilter.gte as Date)
          : null
      const dateLt =
        completedAtFilter && typeof completedAtFilter === 'object' && 'lt' in completedAtFilter
          ? (completedAtFilter.lt as Date)
          : null

      const [workouts, times, volumeResult, prs] = await Promise.all([
        prisma.workoutSession.count({
          where: { userId, completedAt: completedAtFilter },
        }),
        prisma.workoutSession.aggregate({
          where: { userId, completedAt: completedAtFilter },
          _sum: { durationSeconds: true },
        }),
        (() => {
          const gteFilter = dateGte ? Prisma.sql`AND s.completed_at >= ${dateGte}` : Prisma.empty
          const ltFilter = dateLt ? Prisma.sql`AND s.completed_at < ${dateLt}` : Prisma.empty
          return prisma.$queryRaw<[{ total: number | null }]>`
            SELECT COALESCE(SUM(ws.weight * ws.reps), 0) AS total
            FROM workout_sets ws
            JOIN workout_sessions s ON s.id = ws.workout_session_id
            WHERE s.user_id = ${userId}
              AND s.completed_at IS NOT NULL
              ${gteFilter}
              ${ltFilter}
              AND ws.is_warmup = false
              AND ws.weight IS NOT NULL
              AND ws.reps IS NOT NULL
          `
        })(),
        prisma.personalRecord.count({
          where: {
            userId,
            ...(prFilter ? { achievedAt: prFilter } : {}),
          },
        }),
      ])

      return {
        totalWorkouts: workouts,
        totalTimeSeconds: times._sum.durationSeconds ?? 0,
        totalVolume: Number(volumeResult[0].total),
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
      calculateStreak(userId),
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
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  switch (granularity) {
    case 'daily':
      return d
    case 'weekly': {
      const day = d.getUTCDay()
      const diff = day === 0 ? 6 : day - 1
      d.setUTCDate(d.getUTCDate() - diff)
      return d
    }
    case 'monthly':
      d.setUTCDate(1)
      return d
  }
}

function advancePeriod(date: Date, granularity: Granularity): Date {
  const d = new Date(date)
  switch (granularity) {
    case 'daily':
      d.setUTCDate(d.getUTCDate() + 1)
      return d
    case 'weekly':
      d.setUTCDate(d.getUTCDate() + 7)
      return d
    case 'monthly':
      d.setUTCMonth(d.getUTCMonth() + 1)
      return d
  }
}

export const getVolumeHistory = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      token: string | null
      startDate?: string
      granularity?: Granularity
    }) => data,
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    const granularity = data.granularity ?? 'weekly'
    const today = new Date()

    let startDate: Date

    if (data.startDate) {
      startDate = getPeriodStart(new Date(data.startDate), granularity)
    } else {
      // For "all" (no startDate), find the user's earliest completed workout
      const earliest = await prisma.workoutSession.findFirst({
        where: {
          userId,
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

    // Aggregate volume and workout counts per period in SQL
    const intervalMap = { daily: 'day', weekly: 'week', monthly: 'month' } as const
    const truncInterval = intervalMap[granularity]

    const rows = await prisma.$queryRaw<
      Array<{ period_start: Date; volume: number; workouts: bigint }>
    >`
      SELECT date_trunc(${truncInterval}, s.completed_at)::date AS period_start,
             COALESCE(SUM(ws.weight * ws.reps), 0) AS volume,
             COUNT(DISTINCT s.id) AS workouts
      FROM workout_sessions s
      LEFT JOIN workout_sets ws ON ws.workout_session_id = s.id
        AND ws.is_warmup = false AND ws.weight IS NOT NULL AND ws.reps IS NOT NULL
      WHERE s.user_id = ${userId} AND s.completed_at IS NOT NULL
        AND s.completed_at >= ${startDate}
      GROUP BY period_start ORDER BY period_start
    `

    const periodVolume: Record<string, number> = {}
    const periodWorkouts: Record<string, number> = {}
    for (const row of rows) {
      const key = row.period_start.toISOString().split('T')[0]
      periodVolume[key] = Number(row.volume)
      periodWorkouts[key] = Number(row.workouts)
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
  .inputValidator((data: { token: string | null; startDate?: string }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    const dateFilter = data.startDate
      ? { not: null, gte: new Date(data.startDate) }
      : { not: null }

    // Muscle group distribution via single JOIN query
    const startDateParam = data.startDate ? new Date(data.startDate) : null
    const startDateFilter = startDateParam
      ? Prisma.sql`AND s.completed_at >= ${startDateParam}`
      : Prisma.empty
    const muscleRows = await prisma.$queryRaw<Array<{ muscle_group: string; set_count: bigint }>>`
      SELECT e.muscle_group, COUNT(ws.id) AS set_count
      FROM workout_sets ws
      JOIN exercises e ON e.id = ws.exercise_id
      JOIN workout_sessions s ON s.id = ws.workout_session_id
      WHERE s.user_id = ${userId} AND s.completed_at IS NOT NULL
        ${startDateFilter}
        AND ws.is_warmup = false
      GROUP BY e.muscle_group ORDER BY set_count DESC
    `

    let totalSets = 0
    const muscleGroups = muscleRows.map((row) => {
      const count = Number(row.set_count)
      totalSets += count
      return { muscle: row.muscle_group, count, percentage: 0 }
    })
    for (const mg of muscleGroups) {
      mg.percentage = totalSets > 0 ? Math.round((mg.count / totalSets) * 100) : 0
    }

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
    (data: { token: string | null; limit?: number; startDate?: string }) => {
      // Validate limit if provided
      if (data.limit !== undefined && (data.limit < 1 || data.limit > 100)) {
        throw new Error('limit must be between 1 and 100')
      }
      return data
    },
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    const prs = await prisma.personalRecord.findMany({
      where: {
        userId,
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
  .inputValidator((data: { token: string | null; startDate?: string }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    const dateFilter = data.startDate
      ? { not: null, gte: new Date(data.startDate) }
      : { not: null }

    const agg = await prisma.workoutSession.aggregate({
      where: {
        userId,
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
        userId,
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
  .inputValidator((data: { token: string | null; startDate?: string }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    const dateFilter = data.startDate
      ? { not: null, gte: new Date(data.startDate) }
      : { not: null }

    const agg = await prisma.workoutSession.aggregate({
      where: {
        userId,
        completedAt: dateFilter,
        moodRating: { not: null },
      },
      _avg: { moodRating: true },
      _count: true,
    })

    // Get last 12 sessions with mood for sparkline trend
    const recentSessions = await prisma.workoutSession.findMany({
      where: {
        userId,
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
  .inputValidator((data: { token: string | null }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    // Get all PRs for the user
    const prs = await prisma.personalRecord.findMany({
      where: {
        userId,
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
  .inputValidator((data: { token: string | null }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    // Always last 16 weeks regardless of time range filter
    const today = new Date()
    const sixteenWeeksAgo = new Date(today)
    sixteenWeeksAgo.setDate(sixteenWeeksAgo.getDate() - 16 * 7)
    sixteenWeeksAgo.setHours(0, 0, 0, 0)

    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId,
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
  .inputValidator((data: { token: string | null; startDate?: string }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    const dateFilter = data.startDate
      ? { not: null, gte: new Date(data.startDate) }
      : { not: null }

    // Distribution + totals via SQL
    const rpeStartDate = data.startDate ? new Date(data.startDate) : null
    const rpeStartFilter = rpeStartDate
      ? Prisma.sql`AND s.completed_at >= ${rpeStartDate}`
      : Prisma.empty
    const distRows = await prisma.$queryRaw<Array<{ rpe: number; cnt: bigint }>>`
      SELECT ws.rpe, COUNT(*) AS cnt
      FROM workout_sets ws
      JOIN workout_sessions s ON s.id = ws.workout_session_id
      WHERE s.user_id = ${userId} AND s.completed_at IS NOT NULL
        ${rpeStartFilter}
        AND ws.is_warmup = false AND ws.rpe IS NOT NULL
      GROUP BY ws.rpe ORDER BY ws.rpe
    `

    if (distRows.length === 0)
      return { avgRpe: 0, totalRatedSets: 0, distribution: {}, trend: [] }

    const distribution: Record<number, number> = {}
    let totalRpe = 0
    let totalRatedSets = 0
    for (const row of distRows) {
      const count = Number(row.cnt)
      distribution[row.rpe] = count
      totalRpe += row.rpe * count
      totalRatedSets += count
    }

    // Trend: avg RPE per session (last 20 sessions)
    const trendRows = await prisma.$queryRaw<Array<{ completed_date: Date; avg_rpe: number }>>`
      SELECT s.completed_at::date AS completed_date, AVG(ws.rpe) AS avg_rpe
      FROM workout_sets ws
      JOIN workout_sessions s ON s.id = ws.workout_session_id
      WHERE s.user_id = ${userId} AND s.completed_at IS NOT NULL
        ${rpeStartFilter}
        AND ws.is_warmup = false AND ws.rpe IS NOT NULL
      GROUP BY s.id, s.completed_at
      ORDER BY s.completed_at DESC LIMIT 20
    `

    const trend = trendRows
      .reverse()
      .map((row) => ({
        avgRpe: Math.round(Number(row.avg_rpe) * 10) / 10,
        date: row.completed_date.toISOString().split('T')[0],
      }))

    return {
      avgRpe: Math.round((totalRpe / totalRatedSets) * 10) / 10,
      totalRatedSets,
      distribution,
      trend,
    }
  })

// ============================================
// PR TIMELINE
// ============================================

export const getPrTimeline = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { token: string | null; limit?: number; startDate?: string }) =>
      data,
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    const prs = await prisma.personalRecord.findMany({
      where: {
        userId,
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
