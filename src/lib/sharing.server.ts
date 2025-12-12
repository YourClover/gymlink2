import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db'

// Safe charset for share codes (no 0/O, 1/I/L confusion)
const SHARE_CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const SHARE_CODE_LENGTH = 8
const DEFAULT_EXPIRY_DAYS = 7

// Generate a random share code
function generateCode(): string {
  let code = ''
  for (let i = 0; i < SHARE_CODE_LENGTH; i++) {
    code +=
      SHARE_CODE_CHARSET[Math.floor(Math.random() * SHARE_CODE_CHARSET.length)]
  }
  return code
}

// Generate a unique share code (retry on collision)
async function generateUniqueCode(): Promise<string> {
  const maxAttempts = 10
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateCode()
    const existing = await prisma.planShareCode.findUnique({ where: { code } })
    if (!existing) return code
  }
  throw new Error('Failed to generate unique share code')
}

// ============================================
// SHARE CODE OPERATIONS
// ============================================

// Generate a share code for a plan
export const generateShareCode = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { workoutPlanId: string; userId: string; expiresInDays?: number }) =>
      data,
  )
  .handler(async ({ data }) => {
    // Verify user owns the plan
    const plan = await prisma.workoutPlan.findFirst({
      where: {
        id: data.workoutPlanId,
        userId: data.userId,
      },
    })

    if (!plan) {
      throw new Error('Plan not found or access denied')
    }

    // Generate unique code
    const code = await generateUniqueCode()

    // Calculate expiration
    const expiresInDays = data.expiresInDays ?? DEFAULT_EXPIRY_DAYS
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Create share code
    const shareCode = await prisma.planShareCode.create({
      data: {
        code,
        workoutPlanId: data.workoutPlanId,
        creatorId: data.userId,
        expiresAt,
      },
    })

    return {
      shareCode: {
        code: shareCode.code,
        expiresAt: shareCode.expiresAt,
        planName: plan.name,
      },
    }
  })

// Get preview info for a share code (before importing)
export const getShareCodePreview = createServerFn({ method: 'GET' })
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    const code = data.code.toUpperCase().trim()

    const shareCode = await prisma.planShareCode.findUnique({
      where: { code },
      include: {
        workoutPlan: {
          include: {
            planDays: {
              include: {
                _count: {
                  select: { planExercises: true },
                },
              },
            },
          },
        },
        creator: {
          select: { name: true },
        },
      },
    })

    if (!shareCode) {
      throw new Error('Share code not found')
    }

    // Check expiration
    if (new Date() > shareCode.expiresAt) {
      throw new Error('Share code has expired')
    }

    // Calculate totals
    const dayCount = shareCode.workoutPlan.planDays.length
    const exerciseCount = shareCode.workoutPlan.planDays.reduce(
      (sum, day) => sum + day._count.planExercises,
      0,
    )

    return {
      preview: {
        planName: shareCode.workoutPlan.name,
        planDescription: shareCode.workoutPlan.description,
        creatorName: shareCode.creator.name,
        dayCount,
        exerciseCount,
        expiresAt: shareCode.expiresAt,
      },
    }
  })

// Import a plan from a share code
export const importPlanFromCode = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { code: string; userId: string; newPlanName?: string }) => data,
  )
  .handler(async ({ data }) => {
    const code = data.code.toUpperCase().trim()

    // Find and validate share code
    const shareCode = await prisma.planShareCode.findUnique({
      where: { code },
      include: {
        workoutPlan: {
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
              },
            },
          },
        },
      },
    })

    if (!shareCode) {
      throw new Error('Share code not found')
    }

    // Check expiration
    if (new Date() > shareCode.expiresAt) {
      throw new Error('Share code has expired')
    }

    // Prevent importing your own plan
    if (shareCode.creatorId === data.userId) {
      throw new Error('Cannot import your own plan')
    }

    const sourcePlan = shareCode.workoutPlan

    // Create the new plan
    const newPlan = await prisma.workoutPlan.create({
      data: {
        name: data.newPlanName || `${sourcePlan.name} (Imported)`,
        description: sourcePlan.description,
        userId: data.userId,
        isActive: false,
      },
    })

    // Copy days and exercises
    for (const sourceDay of sourcePlan.planDays) {
      const newDay = await prisma.planDay.create({
        data: {
          workoutPlanId: newPlan.id,
          name: sourceDay.name,
          dayOrder: sourceDay.dayOrder,
          restDay: sourceDay.restDay,
        },
      })

      // Copy all exercises (custom exercises are now globally available)
      for (const sourcePlanExercise of sourceDay.planExercises) {
        await prisma.planExercise.create({
          data: {
            planDayId: newDay.id,
            exerciseId: sourcePlanExercise.exercise.id,
            exerciseOrder: sourcePlanExercise.exerciseOrder,
            targetSets: sourcePlanExercise.targetSets,
            targetReps: sourcePlanExercise.targetReps,
            targetTimeSeconds: sourcePlanExercise.targetTimeSeconds,
            targetWeight: sourcePlanExercise.targetWeight,
            restSeconds: sourcePlanExercise.restSeconds,
            notes: sourcePlanExercise.notes,
          },
        })
      }
    }

    // Increment usage count
    await prisma.planShareCode.update({
      where: { id: shareCode.id },
      data: { usageCount: { increment: 1 } },
    })

    return {
      newPlanId: newPlan.id,
    }
  })

// Revoke a share code
export const revokeShareCode = createServerFn({ method: 'POST' })
  .inputValidator((data: { codeId: string; userId: string }) => data)
  .handler(async ({ data }) => {
    // Verify ownership
    const shareCode = await prisma.planShareCode.findFirst({
      where: {
        id: data.codeId,
        creatorId: data.userId,
      },
    })

    if (!shareCode) {
      throw new Error('Share code not found or access denied')
    }

    await prisma.planShareCode.delete({
      where: { id: data.codeId },
    })

    return { success: true }
  })
