import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db'
import {
  
  calculateMetricValue
} from './progression-utils'
import type {ProgressionMetric} from './progression-utils';

export type ProgressionDataPoint = {
  date: string
  value: number
  sessionId: string
}

// ============================================
// GET EXERCISE PROGRESSION DATA
// ============================================

export const getExerciseProgression = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      userId: string
      exerciseId: string
      metric: ProgressionMetric
      startDate?: string
      endDate?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (data.startDate) {
      dateFilter.gte = new Date(data.startDate)
    }
    if (data.endDate) {
      dateFilter.lte = new Date(data.endDate)
    }

    // Fetch all working sets for this exercise
    const sets = await prisma.workoutSet.findMany({
      where: {
        exerciseId: data.exerciseId,
        isWarmup: false,
        workoutSession: {
          userId: data.userId,
          completedAt: { not: null },
          ...(Object.keys(dateFilter).length > 0 && {
            completedAt: dateFilter,
          }),
        },
      },
      include: {
        workoutSession: {
          select: {
            id: true,
            completedAt: true,
          },
        },
      },
      orderBy: {
        workoutSession: {
          completedAt: 'asc',
        },
      },
    })

    // Group by session and find best set for each
    const sessionData = new Map<
      string,
      { date: Date; value: number; sessionId: string }
    >()

    for (const set of sets) {
      if (!set.workoutSession.completedAt) continue

      const sessionId = set.workoutSessionId
      const currentValue = calculateMetricValue(
        {
          weight: set.weight,
          reps: set.reps,
          timeSeconds: set.timeSeconds,
        },
        data.metric,
      )

      // Skip zero values
      if (currentValue <= 0) continue

      const existing = sessionData.get(sessionId)
      if (!existing || currentValue > existing.value) {
        sessionData.set(sessionId, {
          date: set.workoutSession.completedAt,
          value: currentValue,
          sessionId,
        })
      }
    }

    // Convert to array and format dates
    const dataPoints: Array<ProgressionDataPoint> = Array.from(
      sessionData.values(),
    ).map((item) => ({
      date: item.date.toISOString().split('T')[0],
      value: item.value,
      sessionId: item.sessionId,
    }))

    return { dataPoints }
  })

// ============================================
// GET EXERCISE SUMMARY
// ============================================

export const getExerciseSummary = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string; exerciseId: string }) => data)
  .handler(async ({ data }) => {
    // Get exercise details
    const exercise = await prisma.exercise.findUnique({
      where: { id: data.exerciseId },
      select: {
        id: true,
        name: true,
        muscleGroup: true,
        equipment: true,
        isTimed: true,
      },
    })

    if (!exercise) {
      throw new Error('Exercise not found')
    }

    // Get all completed sessions that include this exercise
    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId: data.userId,
        completedAt: { not: null },
        workoutSets: {
          some: {
            exerciseId: data.exerciseId,
            isWarmup: false,
          },
        },
      },
      select: {
        id: true,
        completedAt: true,
      },
      orderBy: {
        completedAt: 'asc',
      },
    })

    const totalSessions = sessions.length
    const firstTrained = sessions[0]?.completedAt ?? null
    const lastTrained = sessions[sessions.length - 1]?.completedAt ?? null

    // Get current PR (MAX_VOLUME as primary, fallback to MAX_WEIGHT or MAX_TIME)
    const currentPR = await prisma.personalRecord.findFirst({
      where: {
        userId: data.userId,
        exerciseId: data.exerciseId,
      },
      include: {
        workoutSet: {
          select: {
            weight: true,
            reps: true,
            timeSeconds: true,
          },
        },
      },
      orderBy: [{ recordType: 'asc' }, { value: 'desc' }],
    })

    return {
      exercise,
      totalSessions,
      firstTrained: firstTrained?.toISOString() ?? null,
      lastTrained: lastTrained?.toISOString() ?? null,
      currentPR: currentPR
        ? {
            recordType: currentPR.recordType,
            value: currentPR.value,
            weight: currentPR.workoutSet.weight,
            reps: currentPR.workoutSet.reps,
            timeSeconds: currentPR.workoutSet.timeSeconds,
            achievedAt: currentPR.achievedAt.toISOString(),
          }
        : null,
    }
  })

// ============================================
// GET RECENT SESSIONS FOR EXERCISE
// ============================================

export const getExerciseRecentSessions = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { userId: string; exerciseId: string; limit?: number }) => data,
  )
  .handler(async ({ data }) => {
    const limit = data.limit ?? 5

    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId: data.userId,
        completedAt: { not: null },
        workoutSets: {
          some: {
            exerciseId: data.exerciseId,
            isWarmup: false,
          },
        },
      },
      include: {
        workoutSets: {
          where: {
            exerciseId: data.exerciseId,
            isWarmup: false,
          },
          select: {
            weight: true,
            reps: true,
            timeSeconds: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
      take: limit,
    })

    return {
      sessions: sessions.map((session) => {
        // Find best set by weight or volume
        let bestWeight = 0
        let bestReps = 0
        let totalVolume = 0
        let bestTime = 0

        for (const set of session.workoutSets) {
          if (set.weight && set.weight > bestWeight) {
            bestWeight = set.weight
            bestReps = set.reps ?? 0
          }
          if (set.weight && set.reps) {
            totalVolume += set.weight * set.reps
          }
          if (set.timeSeconds && set.timeSeconds > bestTime) {
            bestTime = set.timeSeconds
          }
        }

        return {
          id: session.id,
          completedAt: session.completedAt?.toISOString() ?? '',
          setCount: session.workoutSets.length,
          bestWeight,
          bestReps,
          totalVolume,
          bestTime,
        }
      }),
    }
  })
