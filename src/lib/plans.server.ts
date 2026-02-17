import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db'
import {
  requirePlanAccess,
  requirePlanEditAccess,
  requirePlanOwnership,
} from './plan-auth'

// ============================================
// WORKOUT PLAN OPERATIONS
// ============================================

// Get user's plans (owned + shared)
export const getPlans = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    // Own plans
    const plans = await prisma.workoutPlan.findMany({
      where: { userId: data.userId },
      include: {
        _count: {
          select: { planDays: true, collaborators: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Plans shared with me (accepted collaborations)
    const collaborations = await prisma.planCollaborator.findMany({
      where: {
        userId: data.userId,
        inviteStatus: 'ACCEPTED',
      },
      include: {
        workoutPlan: {
          include: {
            user: { select: { name: true } },
            _count: {
              select: { planDays: true, collaborators: true },
            },
          },
        },
      },
      orderBy: { workoutPlan: { updatedAt: 'desc' } },
    })

    const sharedPlans = collaborations.map((c) => ({
      ...c.workoutPlan,
      ownerName: c.workoutPlan.user.name,
      role: c.role,
    }))

    return { plans, sharedPlans }
  })

// Get single plan with full details
export const getPlan = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string; userId: string }) => data)
  .handler(async ({ data }) => {
    const access = await requirePlanAccess(data.id, data.userId)

    const plan = await prisma.workoutPlan.findUnique({
      where: { id: data.id },
      include: {
        user: { select: { id: true, name: true } },
        collaborators: {
          where: { inviteStatus: 'ACCEPTED' },
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
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

    // Check for pending invite
    let pendingInvite = false
    if (!access.isOwner) {
      const invite = await prisma.planCollaborator.findUnique({
        where: {
          workoutPlanId_userId: {
            workoutPlanId: data.id,
            userId: data.userId,
          },
        },
        select: { inviteStatus: true },
      })
      if (invite?.inviteStatus === 'PENDING') {
        pendingInvite = true
      }
    }

    return {
      plan,
      access: {
        isOwner: access.isOwner,
        role: access.role,
      },
      pendingInvite,
    }
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

    await requirePlanEditAccess(id, userId)

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
    await requirePlanOwnership(data.id, data.userId)

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

    await requirePlanEditAccess(dayData.workoutPlanId, userId)

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

    const existing = await prisma.planDay.findFirst({
      where: { id },
      select: { workoutPlanId: true },
    })

    if (!existing) {
      throw new Error('Day not found')
    }

    await requirePlanEditAccess(existing.workoutPlanId, userId)

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
    const existing = await prisma.planDay.findFirst({
      where: { id: data.id },
      select: { workoutPlanId: true },
    })

    if (!existing) {
      throw new Error('Day not found')
    }

    await requirePlanEditAccess(existing.workoutPlanId, data.userId)

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
    await requirePlanEditAccess(data.workoutPlanId, data.userId)

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

    const planDay = await prisma.planDay.findFirst({
      where: { id: exerciseData.planDayId },
      select: { workoutPlanId: true },
    })

    if (!planDay) {
      throw new Error('Day not found')
    }

    await requirePlanEditAccess(planDay.workoutPlanId, userId)

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

    const existing = await prisma.planExercise.findFirst({
      where: { id },
      include: {
        planDay: { select: { workoutPlanId: true } },
      },
    })

    if (!existing) {
      throw new Error('Exercise not found')
    }

    await requirePlanEditAccess(existing.planDay.workoutPlanId, userId)

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
    const existing = await prisma.planExercise.findFirst({
      where: { id: data.id },
      include: {
        planDay: { select: { workoutPlanId: true } },
      },
    })

    if (!existing) {
      throw new Error('Exercise not found')
    }

    await requirePlanEditAccess(existing.planDay.workoutPlanId, data.userId)

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
    const planDay = await prisma.planDay.findFirst({
      where: { id: data.planDayId },
      select: { workoutPlanId: true },
    })

    if (!planDay) {
      throw new Error('Day not found')
    }

    await requirePlanEditAccess(planDay.workoutPlanId, data.userId)

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

    if (!planDay) {
      return { planDay: null, access: null }
    }

    const access = await requirePlanAccess(planDay.workoutPlan.id, data.userId)

    return {
      planDay,
      access: {
        isOwner: access.isOwner,
        role: access.role,
      },
    }
  })
