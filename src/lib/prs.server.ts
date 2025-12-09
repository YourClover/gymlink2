import { createServerFn } from '@tanstack/react-start'
import { RecordType } from '@prisma/client'
import { prisma } from './db'

// Check if a set is a new PR and create record if so
// Uses combined scoring: weight × reps for rep exercises, weight × time for timed exercises
export const checkAndCreatePR = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      userId: string
      exerciseId: string
      weight?: number
      reps?: number
      timeSeconds?: number
      isTimed: boolean
      workoutSetId: string
    }) => data,
  )
  .handler(async ({ data }) => {
    // Calculate PR score based on exercise type
    let prScore: number | null = null
    let recordType: RecordType = RecordType.MAX_VOLUME

    const weight = data.weight ?? 0
    const reps = data.reps ?? 0
    const time = data.timeSeconds ?? 0

    if (data.isTimed) {
      if (weight > 0 && time > 0) {
        // Weighted timed exercise: weight × time
        prScore = weight * time
        recordType = RecordType.MAX_VOLUME
      } else if (time > 0) {
        // Bodyweight timed exercise: max time
        prScore = time
        recordType = RecordType.MAX_TIME
      }
    } else {
      if (weight > 0 && reps > 0) {
        // Weighted rep exercise: weight × reps
        prScore = weight * reps
        recordType = RecordType.MAX_VOLUME
      } else if (reps > 0) {
        // Bodyweight rep exercise: max reps
        prScore = reps
        recordType = RecordType.MAX_REPS
      }
    }

    if (prScore === null) {
      return { isNewPR: false }
    }

    // Get existing PR for this exercise and record type
    const existingPR = await prisma.personalRecord.findFirst({
      where: {
        userId: data.userId,
        exerciseId: data.exerciseId,
        recordType,
      },
      orderBy: { value: 'desc' },
    })

    const previousRecord = existingPR?.value ?? null

    // Check if this is a new PR
    if (!existingPR || prScore > existingPR.value) {
      // Create new PR record
      await prisma.personalRecord.create({
        data: {
          userId: data.userId,
          exerciseId: data.exerciseId,
          recordType,
          value: prScore,
          workoutSetId: data.workoutSetId,
          previousRecord: previousRecord,
        },
      })

      return {
        isNewPR: true,
        newRecord: prScore,
        previousRecord: previousRecord ?? undefined,
        recordType,
        weight: weight > 0 ? weight : undefined,
        reps: reps > 0 ? reps : undefined,
        timeSeconds: time > 0 ? time : undefined,
      }
    }

    return { isNewPR: false }
  })

// Get count of PRs achieved this week
export const getPRsThisWeek = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    // Calculate week boundaries (Monday to Sunday)
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() + mondayOffset)
    weekStart.setHours(0, 0, 0, 0)

    const count = await prisma.personalRecord.count({
      where: {
        userId: data.userId,
        achievedAt: {
          gte: weekStart,
        },
      },
    })

    return { count }
  })

// Get user's PRs, optionally filtered by exercise
// Returns the highest PR for each exercise (considering all record types)
export const getUserPRs = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string; exerciseId?: string }) => data)
  .handler(async ({ data }) => {
    // Get all PRs for this user
    const prs = await prisma.personalRecord.findMany({
      where: {
        userId: data.userId,
        exerciseId: data.exerciseId,
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
          select: {
            weight: true,
            reps: true,
            timeSeconds: true,
          },
        },
      },
      orderBy: { achievedAt: 'desc' },
    })

    // Group by exercise and record type, get the max value for each
    const prsByExercise = new Map<string, (typeof prs)[0]>()

    for (const pr of prs) {
      // Create a key that combines exercise and record type
      const key = `${pr.exerciseId}-${pr.recordType}`
      const existing = prsByExercise.get(key)
      if (!existing || pr.value > existing.value) {
        prsByExercise.set(key, pr)
      }
    }

    // For each exercise, return only the most relevant PR type
    // (prefer MAX_VOLUME, then MAX_TIME/MAX_REPS, then MAX_WEIGHT)
    const exerciseIds = [...new Set(prs.map((pr) => pr.exerciseId))]
    const result: (typeof prs)[0][] = []

    for (const exerciseId of exerciseIds) {
      // Get all PRs for this exercise
      const exercisePRs = Array.from(prsByExercise.values()).filter(
        (pr) => pr.exerciseId === exerciseId,
      )

      // Sort by priority: MAX_VOLUME > MAX_TIME/MAX_REPS > MAX_WEIGHT
      const priorityOrder = {
        [RecordType.MAX_VOLUME]: 0,
        [RecordType.MAX_TIME]: 1,
        [RecordType.MAX_REPS]: 1,
        [RecordType.MAX_WEIGHT]: 2,
      }

      exercisePRs.sort(
        (a, b) => priorityOrder[a.recordType] - priorityOrder[b.recordType],
      )

      if (exercisePRs.length > 0) {
        result.push(exercisePRs[0])
      }
    }

    return { prs: result }
  })

// Get PR for a specific exercise (current max, prioritizing combined score types)
export const getExercisePR = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string; exerciseId: string }) => data)
  .handler(async ({ data }) => {
    // Get all PRs for this exercise
    const prs = await prisma.personalRecord.findMany({
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
      orderBy: { value: 'desc' },
    })

    if (prs.length === 0) {
      return { pr: null }
    }

    // Group by record type and get the max value for each
    const prsByType = new Map<RecordType, (typeof prs)[0]>()

    for (const pr of prs) {
      const existing = prsByType.get(pr.recordType)
      if (!existing || pr.value > existing.value) {
        prsByType.set(pr.recordType, pr)
      }
    }

    // Return the most relevant PR type (prefer MAX_VOLUME > MAX_TIME/MAX_REPS > MAX_WEIGHT)
    const priorityOrder: RecordType[] = [
      RecordType.MAX_VOLUME,
      RecordType.MAX_TIME,
      RecordType.MAX_REPS,
      RecordType.MAX_WEIGHT,
    ]

    for (const recordType of priorityOrder) {
      const pr = prsByType.get(recordType)
      if (pr) {
        return { pr }
      }
    }

    return { pr: null }
  })
