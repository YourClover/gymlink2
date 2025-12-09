import { createServerFn } from '@tanstack/react-start'
import { RecordType } from '@prisma/client'
import { prisma } from './db'

// Check if a weight is a new PR and create record if so
export const checkAndCreatePR = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      userId: string
      exerciseId: string
      weight: number
      workoutSetId: string
    }) => data,
  )
  .handler(async ({ data }) => {
    // Skip if no weight
    if (!data.weight || data.weight <= 0) {
      return { isNewPR: false }
    }

    // Get existing max weight PR for this exercise
    const existingPR = await prisma.personalRecord.findFirst({
      where: {
        userId: data.userId,
        exerciseId: data.exerciseId,
        recordType: RecordType.MAX_WEIGHT,
      },
      orderBy: { value: 'desc' },
    })

    const previousRecord = existingPR?.value ?? null

    // Check if this is a new PR
    if (!existingPR || data.weight > existingPR.value) {
      // Create new PR record
      await prisma.personalRecord.create({
        data: {
          userId: data.userId,
          exerciseId: data.exerciseId,
          recordType: RecordType.MAX_WEIGHT,
          value: data.weight,
          workoutSetId: data.workoutSetId,
          previousRecord: previousRecord,
        },
      })

      return {
        isNewPR: true,
        newRecord: data.weight,
        previousRecord: previousRecord ?? undefined,
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
export const getUserPRs = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string; exerciseId?: string }) => data)
  .handler(async ({ data }) => {
    // Get the latest (highest) PR for each exercise
    const prs = await prisma.personalRecord.findMany({
      where: {
        userId: data.userId,
        exerciseId: data.exerciseId,
        recordType: RecordType.MAX_WEIGHT,
      },
      include: {
        exercise: {
          select: {
            id: true,
            name: true,
            muscleGroup: true,
          },
        },
      },
      orderBy: { achievedAt: 'desc' },
    })

    // Group by exercise and get the max value for each
    const prsByExercise = new Map<string, (typeof prs)[0]>()

    for (const pr of prs) {
      const existing = prsByExercise.get(pr.exerciseId)
      if (!existing || pr.value > existing.value) {
        prsByExercise.set(pr.exerciseId, pr)
      }
    }

    return { prs: Array.from(prsByExercise.values()) }
  })

// Get PR for a specific exercise (current max)
export const getExercisePR = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string; exerciseId: string }) => data)
  .handler(async ({ data }) => {
    const pr = await prisma.personalRecord.findFirst({
      where: {
        userId: data.userId,
        exerciseId: data.exerciseId,
        recordType: RecordType.MAX_WEIGHT,
      },
      orderBy: { value: 'desc' },
    })

    return { pr }
  })
