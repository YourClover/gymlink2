import { createServerFn } from '@tanstack/react-start'
import { RecordType } from '@prisma/client'
import { prisma } from './db'
import { calculateStreak, getWeekStart } from './date-utils'

// ============================================
// OVERVIEW STATS
// ============================================

export const getOverviewStats = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string; startDate?: string }) => data)
  .handler(async ({ data }) => {
    const dateFilter = data.startDate
      ? { not: null as null, gte: new Date(data.startDate) }
      : { not: null as null }

    // Total completed workouts
    const totalWorkouts = await prisma.workoutSession.count({
      where: {
        userId: data.userId,
        completedAt: dateFilter,
      },
    })

    // Total workout time (in seconds)
    const workoutTimes = await prisma.workoutSession.aggregate({
      where: {
        userId: data.userId,
        completedAt: dateFilter,
      },
      _sum: {
        durationSeconds: true,
      },
    })
    const totalTimeSeconds = workoutTimes._sum.durationSeconds ?? 0

    // Total volume
    const allSets = await prisma.workoutSet.findMany({
      where: {
        workoutSession: {
          userId: data.userId,
          completedAt: dateFilter,
        },
        isWarmup: false,
      },
      select: {
        weight: true,
        reps: true,
      },
    })

    let totalVolume = 0
    for (const set of allSets) {
      if (set.weight && set.reps) {
        totalVolume += set.weight * set.reps
      }
    }

    // Total PRs
    const totalPRs = await prisma.personalRecord.count({
      where: {
        userId: data.userId,
        ...(data.startDate
          ? { achievedAt: { gte: new Date(data.startDate) } }
          : {}),
      },
    })

    // Current streak (always unfiltered)
    const currentStreak = await calculateStreak(data.userId)

    return {
      stats: {
        totalWorkouts,
        totalTimeSeconds,
        totalVolume,
        totalPRs,
        currentStreak,
      },
    }
  })

// ============================================
// VOLUME HISTORY (last 12 weeks)
// ============================================

export const getVolumeHistory = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { userId: string; weeks?: number; startDate?: string }) => data,
  )
  .handler(async ({ data }) => {
    const today = new Date()
    const currentWeekStart = getWeekStart(today)

    let weeksToFetch: number
    let startDate: Date

    if (data.startDate) {
      const rangeStart = new Date(data.startDate)
      const diffMs = currentWeekStart.getTime() - rangeStart.getTime()
      weeksToFetch = Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1)
      startDate = getWeekStart(rangeStart)
    } else {
      weeksToFetch = data.weeks ?? 12
      startDate = new Date(currentWeekStart)
      startDate.setDate(startDate.getDate() - (weeksToFetch - 1) * 7)
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

    // Group by week
    const weeklyVolume: Record<string, number> = {}
    const weeklyWorkouts: Record<string, number> = {}

    for (const workout of workouts) {
      if (!workout.completedAt) continue

      const weekStart = getWeekStart(workout.completedAt)
      const weekKey = weekStart.toISOString().split('T')[0]

      if (!weeklyVolume[weekKey]) {
        weeklyVolume[weekKey] = 0
        weeklyWorkouts[weekKey] = 0
      }

      weeklyWorkouts[weekKey]++

      for (const set of workout.workoutSets) {
        if (set.weight && set.reps) {
          weeklyVolume[weekKey] += set.weight * set.reps
        }
      }
    }

    // Build array of weeks with data
    const weeks: Array<{
      weekStart: string
      volume: number
      workouts: number
    }> = []

    for (let i = 0; i < weeksToFetch; i++) {
      const weekDate = new Date(startDate)
      weekDate.setDate(weekDate.getDate() + i * 7)
      const weekKey = weekDate.toISOString().split('T')[0]

      weeks.push({
        weekStart: weekKey,
        volume: weeklyVolume[weekKey] ?? 0,
        workouts: weeklyWorkouts[weekKey] ?? 0,
      })
    }

    return { weeks }
  })

// ============================================
// EXERCISE STATS
// ============================================

export const getExerciseStats = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string; startDate?: string }) => data)
  .handler(async ({ data }) => {
    const dateFilter = data.startDate
      ? { not: null as null, gte: new Date(data.startDate) }
      : { not: null as null }

    // Most trained exercises (by working set count)
    const exerciseCounts = await prisma.workoutSet.groupBy({
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
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    })

    // Get exercise details
    const exerciseIds = exerciseCounts.map((e) => e.exerciseId)
    const exercises = await prisma.exercise.findMany({
      where: { id: { in: exerciseIds } },
      select: { id: true, name: true, muscleGroup: true },
    })

    const topExercises = exerciseCounts.map((ec) => {
      const exercise = exercises.find((e) => e.id === ec.exerciseId)
      return {
        exerciseId: ec.exerciseId,
        name: exercise?.name ?? 'Unknown',
        muscleGroup: exercise?.muscleGroup ?? null,
        setCount: ec._count.id,
      }
    })

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
      if (exercise?.muscleGroup) {
        muscleDistribution[exercise.muscleGroup] =
          (muscleDistribution[exercise.muscleGroup] ?? 0) + ec._count.id
        totalSets += ec._count.id
      }
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
      topExercises,
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
      ? { not: null as null, gte: new Date(data.startDate) }
      : { not: null as null }

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
      ? { not: null as null, gte: new Date(data.startDate) }
      : { not: null as null }

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

    const priorityOrder = {
      [RecordType.MAX_VOLUME]: 0,
      [RecordType.MAX_TIME]: 1,
      [RecordType.MAX_REPS]: 1,
      [RecordType.MAX_WEIGHT]: 2,
    }

    for (const exerciseId of exerciseIds) {
      const exercisePRsForType = Array.from(exercisePRsByType.values()).filter(
        (pr) => pr.exerciseId === exerciseId,
      )

      exercisePRsForType.sort(
        (a, b) => priorityOrder[a.recordType] - priorityOrder[b.recordType],
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
      })
    }

    return { grouped, total: allPRs.length }
  })
