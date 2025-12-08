import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db'
import { WeightUnit } from '@prisma/client'

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
    (data: {
      userId: string
      workoutPlanId?: string
      planDayId?: string
    }) => data,
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
    }) => data,
  )
  .handler(async ({ data }) => {
    // Verify ownership
    const existing = await prisma.workoutSession.findFirst({
      where: { id: data.sessionId, userId: data.userId },
    })

    if (!existing) {
      throw new Error('Session not found')
    }

    // Calculate duration
    const durationSeconds = Math.floor(
      (Date.now() - existing.startedAt.getTime()) / 1000,
    )

    const session = await prisma.workoutSession.update({
      where: { id: data.sessionId },
      data: {
        completedAt: new Date(),
        durationSeconds,
        notes: data.notes,
        moodRating: data.moodRating,
      },
    })

    return { session }
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

    // Delete session (cascade deletes sets)
    await prisma.workoutSession.delete({
      where: { id: data.sessionId },
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
    }) => data,
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

    const workoutSet = await prisma.workoutSet.create({
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

    return { workoutSet }
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

    const workoutSet = await prisma.workoutSet.update({
      where: { id },
      data: updateData,
      include: {
        exercise: true,
      },
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

    await prisma.workoutSet.delete({
      where: { id: data.id },
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
  .inputValidator((data: { userId: string; limit?: number }) => data)
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
        _count: {
          select: { workoutSets: true },
        },
      },
    })

    return { workouts }
  })
