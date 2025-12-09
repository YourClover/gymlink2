import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db'

// ============================================
// WORKOUT PLAN OPERATIONS
// ============================================

// Get user's plans with day counts
export const getPlans = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const plans = await prisma.workoutPlan.findMany({
      where: { userId: data.userId },
      include: {
        _count: {
          select: { planDays: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return { plans }
  })

// Get single plan with full details
export const getPlan = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string; userId: string }) => data)
  .handler(async ({ data }) => {
    const plan = await prisma.workoutPlan.findFirst({
      where: {
        id: data.id,
        userId: data.userId,
      },
      include: {
        planDays: {
          orderBy: { dayOrder: 'asc' },
          include: {
            planExercises: {
              orderBy: { exerciseOrder: 'asc' },
              include: {
                exercise: true,
              },
            },
            _count: {
              select: { planExercises: true },
            },
          },
        },
      },
    })

    return { plan }
  })

// Create a new plan
export const createPlan = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { name: string; description?: string; userId: string }) => data,
  )
  .handler(async ({ data }) => {
    const plan = await prisma.workoutPlan.create({
      data: {
        name: data.name,
        description: data.description,
        userId: data.userId,
      },
    })

    return { plan }
  })

// Update a plan
export const updatePlan = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: string
      name?: string
      description?: string
      userId: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const { id, userId, ...updateData } = data

    // Verify ownership
    const existing = await prisma.workoutPlan.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      throw new Error('Plan not found')
    }

    const plan = await prisma.workoutPlan.update({
      where: { id },
      data: updateData,
    })

    return { plan }
  })

// Delete a plan
export const deletePlan = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; userId: string }) => data)
  .handler(async ({ data }) => {
    // Verify ownership
    const existing = await prisma.workoutPlan.findFirst({
      where: { id: data.id, userId: data.userId },
    })

    if (!existing) {
      throw new Error('Plan not found')
    }

    await prisma.workoutPlan.delete({
      where: { id: data.id },
    })

    return { success: true }
  })

// Set a plan as active (deactivates others)
export const setActivePlan = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; userId: string }) => data)
  .handler(async ({ data }) => {
    // Deactivate all other plans
    await prisma.workoutPlan.updateMany({
      where: { userId: data.userId },
      data: { isActive: false },
    })

    // Activate this plan
    const plan = await prisma.workoutPlan.update({
      where: { id: data.id },
      data: { isActive: true },
    })

    return { plan }
  })

// ============================================
// PLAN DAY OPERATIONS
// ============================================

// Create a plan day
export const createPlanDay = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      workoutPlanId: string
      name: string
      dayOrder: number
      restDay?: boolean
      userId: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const { userId, ...dayData } = data

    // Verify plan ownership
    const plan = await prisma.workoutPlan.findFirst({
      where: { id: dayData.workoutPlanId, userId },
    })

    if (!plan) {
      throw new Error('Plan not found')
    }

    const planDay = await prisma.planDay.create({
      data: {
        workoutPlanId: dayData.workoutPlanId,
        name: dayData.name,
        dayOrder: dayData.dayOrder,
        restDay: dayData.restDay ?? false,
      },
    })

    return { planDay }
  })

// Update a plan day
export const updatePlanDay = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: string
      name?: string
      dayOrder?: number
      restDay?: boolean
      userId: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const { id, userId, ...updateData } = data

    // Verify ownership through plan
    const existing = await prisma.planDay.findFirst({
      where: { id },
      include: { workoutPlan: { select: { userId: true } } },
    })

    if (!existing || existing.workoutPlan.userId !== userId) {
      throw new Error('Day not found')
    }

    const planDay = await prisma.planDay.update({
      where: { id },
      data: updateData,
    })

    return { planDay }
  })

// Delete a plan day
export const deletePlanDay = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; userId: string }) => data)
  .handler(async ({ data }) => {
    // Verify ownership through plan
    const existing = await prisma.planDay.findFirst({
      where: { id: data.id },
      include: { workoutPlan: { select: { userId: true } } },
    })

    if (!existing || existing.workoutPlan.userId !== data.userId) {
      throw new Error('Day not found')
    }

    await prisma.planDay.delete({
      where: { id: data.id },
    })

    return { success: true }
  })

// Reorder plan days
export const reorderPlanDays = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { workoutPlanId: string; dayIds: Array<string>; userId: string }) =>
      data,
  )
  .handler(async ({ data }) => {
    // Verify plan ownership
    const plan = await prisma.workoutPlan.findFirst({
      where: { id: data.workoutPlanId, userId: data.userId },
    })

    if (!plan) {
      throw new Error('Plan not found')
    }

    // Update each day's order
    await Promise.all(
      data.dayIds.map((dayId, index) =>
        prisma.planDay.update({
          where: { id: dayId },
          data: { dayOrder: index + 1 },
        }),
      ),
    )

    return { success: true }
  })

// ============================================
// PLAN EXERCISE OPERATIONS
// ============================================

// Add exercise to a day
export const addPlanExercise = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      planDayId: string
      exerciseId: string
      exerciseOrder: number
      targetSets: number
      targetReps?: number
      targetTimeSeconds?: number
      targetWeight?: number
      restSeconds?: number
      notes?: string
      userId: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const { userId, ...exerciseData } = data

    // Verify ownership through plan day
    const planDay = await prisma.planDay.findFirst({
      where: { id: exerciseData.planDayId },
      include: { workoutPlan: { select: { userId: true } } },
    })

    if (!planDay || planDay.workoutPlan.userId !== userId) {
      throw new Error('Day not found')
    }

    const planExercise = await prisma.planExercise.create({
      data: {
        planDayId: exerciseData.planDayId,
        exerciseId: exerciseData.exerciseId,
        exerciseOrder: exerciseData.exerciseOrder,
        targetSets: exerciseData.targetSets,
        targetReps: exerciseData.targetReps,
        targetTimeSeconds: exerciseData.targetTimeSeconds,
        targetWeight: exerciseData.targetWeight,
        restSeconds: exerciseData.restSeconds ?? 60,
        notes: exerciseData.notes,
      },
      include: {
        exercise: true,
      },
    })

    return { planExercise }
  })

// Update plan exercise
export const updatePlanExercise = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: string
      targetSets?: number
      targetReps?: number
      targetTimeSeconds?: number
      targetWeight?: number
      restSeconds?: number
      notes?: string
      userId: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const { id, userId, ...updateData } = data

    // Verify ownership through plan day and plan
    const existing = await prisma.planExercise.findFirst({
      where: { id },
      include: {
        planDay: {
          include: { workoutPlan: { select: { userId: true } } },
        },
      },
    })

    if (!existing || existing.planDay.workoutPlan.userId !== userId) {
      throw new Error('Exercise not found')
    }

    const planExercise = await prisma.planExercise.update({
      where: { id },
      data: updateData,
      include: {
        exercise: true,
      },
    })

    return { planExercise }
  })

// Remove exercise from day
export const removePlanExercise = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; userId: string }) => data)
  .handler(async ({ data }) => {
    // Verify ownership through plan day and plan
    const existing = await prisma.planExercise.findFirst({
      where: { id: data.id },
      include: {
        planDay: {
          include: { workoutPlan: { select: { userId: true } } },
        },
      },
    })

    if (!existing || existing.planDay.workoutPlan.userId !== data.userId) {
      throw new Error('Exercise not found')
    }

    await prisma.planExercise.delete({
      where: { id: data.id },
    })

    return { success: true }
  })

// Reorder exercises in a day
export const reorderPlanExercises = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { planDayId: string; exerciseIds: Array<string>; userId: string }) =>
      data,
  )
  .handler(async ({ data }) => {
    // Verify ownership through plan day
    const planDay = await prisma.planDay.findFirst({
      where: { id: data.planDayId },
      include: { workoutPlan: { select: { userId: true } } },
    })

    if (!planDay || planDay.workoutPlan.userId !== data.userId) {
      throw new Error('Day not found')
    }

    // Update each exercise's order
    await Promise.all(
      data.exerciseIds.map((exerciseId, index) =>
        prisma.planExercise.update({
          where: { id: exerciseId },
          data: { exerciseOrder: index + 1 },
        }),
      ),
    )

    return { success: true }
  })

// Get a single plan day with exercises
export const getPlanDay = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string; userId: string }) => data)
  .handler(async ({ data }) => {
    const planDay = await prisma.planDay.findFirst({
      where: { id: data.id },
      include: {
        workoutPlan: {
          select: { id: true, name: true, userId: true },
        },
        planExercises: {
          orderBy: { exerciseOrder: 'asc' },
          include: {
            exercise: true,
          },
        },
      },
    })

    if (!planDay || planDay.workoutPlan.userId !== data.userId) {
      return { planDay: null }
    }

    return { planDay }
  })
