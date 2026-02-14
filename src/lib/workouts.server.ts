import { createServerFn } from '@tanstack/react-start'
import { RecordType, WeightUnit } from '@prisma/client'
import { prisma } from './db'
import { checkAchievements } from './achievements.server'
import { updateChallengeProgress } from './challenges.server'
import type { PrismaClient } from '@prisma/client'

type PrismaTransactionClient = Parameters<
  Parameters<PrismaClient['$transaction']>[0]
>[0]

// ============================================
// PR HELPERS (internal, not server functions)
// ============================================

/** Calculate PR score and record type for a set's values. Returns null if not PR-eligible. */
export function calculatePRScore(
  isTimed: boolean,
  weight: number,
  reps: number,
  timeSeconds: number,
): { score: number; recordType: RecordType } | null {
  if (isTimed) {
    if (weight > 0 && timeSeconds > 0) {
      return { score: weight * timeSeconds, recordType: RecordType.MAX_VOLUME }
    } else if (timeSeconds > 0) {
      return { score: timeSeconds, recordType: RecordType.MAX_TIME }
    }
  } else {
    if (weight > 0 && reps > 0) {
      return { score: weight * reps, recordType: RecordType.MAX_VOLUME }
    } else if (reps > 0) {
      return { score: reps, recordType: RecordType.MAX_REPS }
    }
  }
  return null
}

/** Rebuild PR records for a user+exercise from all qualifying sets. */
async function recalculatePR(
  tx: PrismaTransactionClient,
  userId: string,
  exerciseId: string,
): Promise<void> {
  const exercise = await tx.exercise.findUnique({
    where: { id: exerciseId },
    select: { isTimed: true },
  })
  if (!exercise) return

  const sets = await tx.workoutSet.findMany({
    where: {
      exerciseId,
      isWarmup: false,
      isDropset: false,
      workoutSession: { userId },
    },
  })

  // Find best score per recordType
  const bestByType = new Map<RecordType, { score: number; setId: string }>()

  for (const set of sets) {
    const result = calculatePRScore(
      exercise.isTimed,
      set.weight ?? 0,
      set.reps ?? 0,
      set.timeSeconds ?? 0,
    )
    if (!result) continue

    const existing = bestByType.get(result.recordType)
    if (!existing || result.score > existing.score) {
      bestByType.set(result.recordType, {
        score: result.score,
        setId: set.id,
      })
    }
  }

  // Get all existing PRs for this user+exercise
  const existingPRs = await tx.personalRecord.findMany({
    where: { userId, exerciseId },
  })

  const existingByType = new Map(existingPRs.map((pr) => [pr.recordType, pr]))

  // Upsert best PRs, delete orphaned record types
  for (const recordType of Object.values(RecordType)) {
    const best = bestByType.get(recordType)
    const existingPR = existingByType.get(recordType)

    if (best) {
      if (
        existingPR &&
        existingPR.value === best.score &&
        existingPR.workoutSetId === best.setId
      ) {
        // PR unchanged, skip
        continue
      }
      await tx.personalRecord.upsert({
        where: {
          userId_exerciseId_recordType: { userId, exerciseId, recordType },
        },
        create: {
          userId,
          exerciseId,
          recordType,
          value: best.score,
          workoutSetId: best.setId,
          previousRecord: existingPR?.previousRecord ?? null,
        },
        update: {
          value: best.score,
          workoutSetId: best.setId,
          // Preserve achievedAt and previousRecord — this is a recalculation, not a new PR
        },
      })
    } else if (existingPR) {
      // No qualifying sets for this record type anymore
      await tx.personalRecord.delete({
        where: { id: existingPR.id },
      })
    }
  }
}

// ============================================
// SESSION MANAGEMENT
// ============================================

// Get user's active (incomplete) workout session
export const getActiveSession = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const session = await prisma.workoutSession.findFirst({
      where: {
        userId: data.userId,
        completedAt: null,
      },
      include: {
        workoutPlan: {
          select: { id: true, name: true },
        },
        planDay: {
          select: {
            id: true,
            name: true,
            dayOrder: true,
            planExercises: {
              orderBy: { exerciseOrder: 'asc' },
              include: {
                exercise: true,
              },
            },
          },
        },
        workoutSets: {
          orderBy: { completedAt: 'asc' },
          include: {
            exercise: true,
          },
        },
      },
    })

    return { session }
  })

// Start a new workout session
export const startWorkoutSession = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { userId: string; workoutPlanId?: string; planDayId?: string }) =>
      data,
  )
  .handler(async ({ data }) => {
    // If plan/day provided, verify ownership
    if (data.planDayId) {
      const planDay = await prisma.planDay.findFirst({
        where: { id: data.planDayId },
        include: {
          workoutPlan: { select: { userId: true, id: true } },
        },
      })

      if (!planDay || planDay.workoutPlan.userId !== data.userId) {
        throw new Error('Plan day not found')
      }

      // Use the plan ID from the day
      data.workoutPlanId = planDay.workoutPlan.id
    }

    const session = await prisma.workoutSession.create({
      data: {
        userId: data.userId,
        workoutPlanId: data.workoutPlanId,
        planDayId: data.planDayId,
        startedAt: new Date(),
      },
      include: {
        workoutPlan: {
          select: { id: true, name: true },
        },
        planDay: {
          select: {
            id: true,
            name: true,
            dayOrder: true,
            planExercises: {
              orderBy: { exerciseOrder: 'asc' },
              include: {
                exercise: true,
              },
            },
          },
        },
      },
    })

    return { session }
  })

// Complete a workout session
export const completeWorkoutSession = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      sessionId: string
      userId: string
      notes?: string
      moodRating?: number
      durationSeconds?: number
    }) => {
      // Validate moodRating if provided
      if (
        data.moodRating !== undefined &&
        (data.moodRating < 1 || data.moodRating > 10)
      ) {
        throw new Error('moodRating must be between 1 and 10')
      }
      // Validate durationSeconds if provided
      if (data.durationSeconds !== undefined && data.durationSeconds < 0) {
        throw new Error('durationSeconds must be non-negative')
      }
      return data
    },
  )
  .handler(async ({ data }) => {
    // Verify ownership and get plan info for activity metadata
    const existing = await prisma.workoutSession.findFirst({
      where: { id: data.sessionId, userId: data.userId },
      include: {
        planDay: {
          include: {
            workoutPlan: { select: { name: true } },
          },
        },
      },
    })

    if (!existing) {
      throw new Error('Session not found')
    }

    // Use client-provided duration or calculate from start time
    const durationSeconds =
      data.durationSeconds ??
      Math.floor((Date.now() - existing.startedAt.getTime()) / 1000)

    // Use transaction to ensure session update and activity feed are atomic
    const session = await prisma.$transaction(async (tx) => {
      const updatedSession = await tx.workoutSession.update({
        where: { id: data.sessionId },
        data: {
          completedAt: new Date(),
          durationSeconds,
          notes: data.notes,
          moodRating: data.moodRating,
        },
      })

      // Create activity feed item for workout completion
      await tx.activityFeedItem.create({
        data: {
          userId: data.userId,
          activityType: 'WORKOUT_COMPLETED',
          referenceId: updatedSession.id,
          metadata: {
            durationSeconds,
            planName: existing.planDay?.workoutPlan.name ?? null,
            dayName: existing.planDay?.name ?? null,
          },
        },
      })

      return updatedSession
    })

    // Update challenge progress (has its own error handling)
    await updateChallengeProgress({
      data: { userId: data.userId, sessionId: data.sessionId },
    })

    // Check for newly earned achievements (has its own error handling)
    const achievementResult = await checkAchievements({
      data: { userId: data.userId, triggerType: 'workout_complete' },
    })

    return { session, newAchievements: achievementResult.newlyEarned }
  })

// Discard/cancel an active workout
export const discardWorkoutSession = createServerFn({ method: 'POST' })
  .inputValidator((data: { sessionId: string; userId: string }) => data)
  .handler(async ({ data }) => {
    // Verify ownership
    const existing = await prisma.workoutSession.findFirst({
      where: { id: data.sessionId, userId: data.userId },
    })

    if (!existing) {
      throw new Error('Session not found')
    }

    await prisma.$transaction(async (tx) => {
      // Collect affected exercises before deleting
      const affectedExercises = await tx.workoutSet.findMany({
        where: { workoutSessionId: data.sessionId },
        select: { exerciseId: true },
        distinct: ['exerciseId'],
      })

      // Delete session (cascade deletes sets and their PRs)
      await tx.workoutSession.delete({
        where: { id: data.sessionId },
      })

      // Recalculate PRs for all affected exercises
      for (const { exerciseId } of affectedExercises) {
        await recalculatePR(tx, data.userId, exerciseId)
      }
    })

    return { success: true }
  })

// ============================================
// SET LOGGING
// ============================================

// Log a workout set
export const logWorkoutSet = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      workoutSessionId: string
      exerciseId: string
      setNumber: number
      reps?: number
      timeSeconds?: number
      weight?: number
      weightUnit?: WeightUnit
      isWarmup?: boolean
      isDropset?: boolean
      rpe?: number
      notes?: string
      userId: string
    }) => {
      // Validate numeric fields
      if (data.reps !== undefined && data.reps < 0) {
        throw new Error('reps must be non-negative')
      }
      if (data.timeSeconds !== undefined && data.timeSeconds < 0) {
        throw new Error('timeSeconds must be non-negative')
      }
      if (data.weight !== undefined && data.weight < 0) {
        throw new Error('weight must be non-negative')
      }
      if (data.rpe !== undefined && (data.rpe < 1 || data.rpe > 10)) {
        throw new Error('rpe must be between 1 and 10')
      }
      // Validate that set has meaningful data (must have reps or time)
      const hasReps = data.reps !== undefined && data.reps > 0
      const hasTime = data.timeSeconds !== undefined && data.timeSeconds > 0
      if (!hasReps && !hasTime) {
        throw new Error('Set must have either reps or time recorded')
      }
      return data
    },
  )
  .handler(async ({ data }) => {
    const { userId, ...setData } = data

    // Verify session ownership
    const session = await prisma.workoutSession.findFirst({
      where: { id: setData.workoutSessionId, userId },
    })

    if (!session) {
      throw new Error('Session not found')
    }

    // Use transaction to ensure set creation and PR records are atomic
    const result = await prisma.$transaction(async (tx) => {
      const workoutSet = await tx.workoutSet.create({
        data: {
          workoutSessionId: setData.workoutSessionId,
          exerciseId: setData.exerciseId,
          setNumber: setData.setNumber,
          reps: setData.reps,
          timeSeconds: setData.timeSeconds,
          weight: setData.weight,
          weightUnit: setData.weightUnit ?? WeightUnit.KG,
          isWarmup: setData.isWarmup ?? false,
          isDropset: setData.isDropset ?? false,
          rpe: setData.rpe,
          notes: setData.notes,
          completedAt: new Date(),
        },
        include: {
          exercise: true,
        },
      })

      // Check for PR (only for working sets, not warmups)
      let prResult: {
        isNewPR: boolean
        newRecord?: number
        previousRecord?: number
        recordType?: RecordType
        weight?: number
        reps?: number
        timeSeconds?: number
      } = { isNewPR: false }

      if (!setData.isWarmup && !setData.isDropset) {
        const weight = setData.weight ?? 0
        const reps = setData.reps ?? 0
        const time = setData.timeSeconds ?? 0

        const scoreResult = calculatePRScore(
          workoutSet.exercise.isTimed,
          weight,
          reps,
          time,
        )

        // Check if this is a new PR
        if (scoreResult) {
          const { score: prScore, recordType } = scoreResult

          const existingPR = await tx.personalRecord.findUnique({
            where: {
              userId_exerciseId_recordType: {
                userId,
                exerciseId: setData.exerciseId,
                recordType,
              },
            },
          })

          const isNewPR = !existingPR || prScore > existingPR.value

          if (isNewPR) {
            // Determine previousRecord: if the existing PR's set is from this
            // same session, keep its previousRecord (the original beaten value),
            // otherwise use the existing PR's value.
            let previousRecord: number | null = null
            if (existingPR) {
              const existingSet = await tx.workoutSet.findUnique({
                where: { id: existingPR.workoutSetId },
                select: { workoutSessionId: true },
              })
              if (existingSet?.workoutSessionId === setData.workoutSessionId) {
                // Same session — preserve the original beaten value
                previousRecord = existingPR.previousRecord
              } else {
                previousRecord = existingPR.value
              }
            }

            // Use upsert to handle the unique constraint
            const newPR = await tx.personalRecord.upsert({
              where: {
                userId_exerciseId_recordType: {
                  userId,
                  exerciseId: setData.exerciseId,
                  recordType,
                },
              },
              create: {
                userId,
                exerciseId: setData.exerciseId,
                recordType,
                value: prScore,
                workoutSetId: workoutSet.id,
                previousRecord,
              },
              update: {
                value: prScore,
                workoutSetId: workoutSet.id,
                previousRecord,
                achievedAt: new Date(),
              },
            })

            // Create activity feed item for PR achieved
            await tx.activityFeedItem.create({
              data: {
                userId,
                activityType: 'PR_ACHIEVED',
                referenceId: newPR.id,
                metadata: {
                  exerciseName: workoutSet.exercise.name,
                  recordType,
                  value: prScore,
                  weight: weight > 0 ? weight : null,
                  reps: reps > 0 ? reps : null,
                  timeSeconds: time > 0 ? time : null,
                },
              },
            })

            prResult = {
              isNewPR: true,
              newRecord: prScore,
              previousRecord: previousRecord ?? undefined,
              recordType,
              weight: weight > 0 ? weight : undefined,
              reps: reps > 0 ? reps : undefined,
              timeSeconds: time > 0 ? time : undefined,
            }
          }
        }
      }

      return { workoutSet, ...prResult }
    })

    return result
  })

// Update a logged set
export const updateWorkoutSet = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: string
      reps?: number
      timeSeconds?: number
      weight?: number
      weightUnit?: WeightUnit
      isWarmup?: boolean
      isDropset?: boolean
      rpe?: number
      notes?: string
      userId: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const { id, userId, ...updateData } = data

    // Verify ownership through session
    const existing = await prisma.workoutSet.findFirst({
      where: { id },
      include: {
        workoutSession: { select: { userId: true } },
      },
    })

    if (!existing || existing.workoutSession.userId !== userId) {
      throw new Error('Set not found')
    }

    const workoutSet = await prisma.$transaction(async (tx) => {
      const updated = await tx.workoutSet.update({
        where: { id },
        data: updateData,
        include: {
          exercise: true,
        },
      })

      // Recalculate PRs since the set's values may have changed
      await recalculatePR(tx, userId, existing.exerciseId)

      return updated
    })

    return { workoutSet }
  })

// Delete a logged set
export const deleteWorkoutSet = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; userId: string }) => data)
  .handler(async ({ data }) => {
    // Verify ownership through session
    const existing = await prisma.workoutSet.findFirst({
      where: { id: data.id },
      include: {
        workoutSession: { select: { userId: true } },
      },
    })

    if (!existing || existing.workoutSession.userId !== data.userId) {
      throw new Error('Set not found')
    }

    await prisma.$transaction(async (tx) => {
      await tx.workoutSet.delete({
        where: { id: data.id },
      })

      // Recalculate PRs since the deleted set may have held a PR
      await recalculatePR(tx, data.userId, existing.exerciseId)
    })

    return { success: true }
  })

// ============================================
// HISTORY / SUMMARY
// ============================================

// Get workout session with full details (for summary page)
export const getWorkoutSession = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string; userId: string }) => data)
  .handler(async ({ data }) => {
    const session = await prisma.workoutSession.findFirst({
      where: {
        id: data.id,
        userId: data.userId,
      },
      include: {
        workoutPlan: {
          select: { id: true, name: true },
        },
        planDay: {
          select: { id: true, name: true, dayOrder: true },
        },
        workoutSets: {
          orderBy: { completedAt: 'asc' },
          include: {
            exercise: true,
          },
        },
      },
    })

    return { session }
  })

// Get user's recent completed workouts
export const getRecentWorkouts = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string; limit?: number }) => {
    // Validate limit if provided
    if (data.limit !== undefined && (data.limit < 1 || data.limit > 100)) {
      throw new Error('limit must be between 1 and 100')
    }
    return data
  })
  .handler(async ({ data }) => {
    const workouts = await prisma.workoutSession.findMany({
      where: {
        userId: data.userId,
        completedAt: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      take: data.limit ?? 10,
      include: {
        workoutPlan: {
          select: { name: true },
        },
        planDay: {
          select: { name: true },
        },
        workoutSets: {
          select: {
            exercise: {
              select: { name: true, muscleGroup: true },
            },
          },
          distinct: ['exerciseId'],
        },
        _count: {
          select: { workoutSets: true },
        },
      },
    })

    return { workouts }
  })

// Get last workout data for a specific exercise (for showing previous performance)
export const getLastExerciseSets = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { userId: string; exerciseId: string; excludeSessionId?: string }) =>
      data,
  )
  .handler(async ({ data }) => {
    // Find the most recent completed session that includes this exercise
    const lastSession = await prisma.workoutSession.findFirst({
      where: {
        userId: data.userId,
        completedAt: { not: null },
        ...(data.excludeSessionId && { id: { not: data.excludeSessionId } }),
        workoutSets: {
          some: {
            exerciseId: data.exerciseId,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        completedAt: true,
        workoutSets: {
          where: {
            exerciseId: data.exerciseId,
            isWarmup: false,
            isDropset: false,
          },
          orderBy: { setNumber: 'asc' },
          select: {
            setNumber: true,
            weight: true,
            reps: true,
            timeSeconds: true,
            rpe: true,
            weightUnit: true,
          },
        },
      },
    })

    if (!lastSession || lastSession.workoutSets.length === 0) {
      return { lastSession: null }
    }

    return {
      lastSession: {
        date: lastSession.completedAt,
        sets: lastSession.workoutSets,
      },
    }
  })

// ============================================
// MONTHLY CALENDAR DATA
// ============================================

export const getMonthlyWorkoutDays = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string; year: number; month: number }) => {
    if (data.month < 1 || data.month > 12) {
      throw new Error('month must be between 1 and 12')
    }
    return data
  })
  .handler(async ({ data }) => {
    const startDate = new Date(data.year, data.month - 1, 1)
    const endDate = new Date(data.year, data.month, 1)

    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId: data.userId,
        completedAt: { gte: startDate, lt: endDate },
      },
      orderBy: { completedAt: 'asc' },
      include: {
        workoutPlan: { select: { name: true } },
        planDay: { select: { name: true } },
        workoutSets: {
          select: {
            exercise: {
              select: { name: true, muscleGroup: true },
            },
          },
          distinct: ['exerciseId'],
        },
        _count: { select: { workoutSets: true } },
      },
    })

    const dayMap: Record<
      number,
      Array<{
        id: string
        completedAt: Date | null
        durationSeconds: number | null
        workoutPlan: { name: string } | null
        planDay: { name: string } | null
        _count: { workoutSets: number }
        workoutSets: Array<{
          exercise: { name: string; muscleGroup: string }
        }>
      }>
    > = {}

    for (const session of sessions) {
      if (!session.completedAt) continue
      const day = session.completedAt.getDate()
      dayMap[day] ??= []
      dayMap[day].push({
        id: session.id,
        completedAt: session.completedAt,
        durationSeconds: session.durationSeconds,
        workoutPlan: session.workoutPlan,
        planDay: session.planDay,
        _count: session._count,
        workoutSets: session.workoutSets,
      })
    }

    return { dayMap }
  })

// ============================================
// FILTERED WORKOUTS
// ============================================

export const getFilteredWorkouts = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      userId: string
      limit?: number
      offset?: number
      muscleGroups?: Array<string>
      planId?: string
      exerciseSearch?: string
      startDate?: string
      endDate?: string
    }) => {
      if (data.limit !== undefined && (data.limit < 1 || data.limit > 100)) {
        throw new Error('limit must be between 1 and 100')
      }
      return data
    },
  )
  .handler(async ({ data }) => {
    const where: Record<string, unknown> = {
      userId: data.userId,
      completedAt: { not: null },
    }

    // Date range filter
    if (data.startDate || data.endDate) {
      const completedAt: Record<string, unknown> = { not: null }
      if (data.startDate) completedAt.gte = new Date(data.startDate)
      if (data.endDate) completedAt.lte = new Date(data.endDate)
      where.completedAt = completedAt
    }

    // Plan filter
    if (data.planId) {
      where.workoutPlanId = data.planId
    }

    // Exercise search and muscle group filters use workoutSets relation
    if (data.exerciseSearch || data.muscleGroups?.length) {
      const exerciseFilter: Record<string, unknown> = {}

      if (data.exerciseSearch) {
        exerciseFilter.name = {
          contains: data.exerciseSearch,
          mode: 'insensitive',
        }
      }

      if (data.muscleGroups?.length) {
        exerciseFilter.muscleGroup = { in: data.muscleGroups }
      }

      where.workoutSets = {
        some: {
          exercise: exerciseFilter,
        },
      }
    }

    const whereClause = where as any

    const [workouts, total] = await Promise.all([
      prisma.workoutSession.findMany({
        where: whereClause,
        orderBy: { completedAt: 'desc' },
        take: data.limit ?? 50,
        skip: data.offset ?? 0,
        include: {
          workoutPlan: { select: { name: true } },
          planDay: { select: { name: true } },
          workoutSets: {
            select: {
              exercise: {
                select: { name: true, muscleGroup: true },
              },
            },
            distinct: ['exerciseId'],
          },
          _count: { select: { workoutSets: true } },
        },
      }),
      prisma.workoutSession.count({
        where: whereClause,
      }),
    ])

    return { workouts, total }
  })
