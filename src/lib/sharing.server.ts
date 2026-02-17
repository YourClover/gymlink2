import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db'
import { requirePlanOwnership } from './plan-auth.server'

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
    await requirePlanOwnership(data.workoutPlanId, data.userId)

    const plan = await prisma.workoutPlan.findUnique({
      where: { id: data.workoutPlanId },
    })

    if (!plan) {
      throw new Error('Plan not found')
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

    // Use transaction to ensure atomic plan import (all or nothing)
    const newPlan = await prisma.$transaction(async (tx) => {
      // Create the new plan
      const plan = await tx.workoutPlan.create({
        data: {
          name: data.newPlanName || `${sourcePlan.name} (Imported)`,
          description: sourcePlan.description,
          userId: data.userId,
          isActive: false,
        },
      })

      // Copy days and exercises
      for (const sourceDay of sourcePlan.planDays) {
        const newDay = await tx.planDay.create({
          data: {
            workoutPlanId: plan.id,
            name: sourceDay.name,
            dayOrder: sourceDay.dayOrder,
            restDay: sourceDay.restDay,
          },
        })

        // Copy all exercises (custom exercises are now globally available)
        for (const sourcePlanExercise of sourceDay.planExercises) {
          await tx.planExercise.create({
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
      await tx.planShareCode.update({
        where: { id: shareCode.id },
        data: { usageCount: { increment: 1 } },
      })

      return plan
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

// ============================================
// CLEANUP OPERATIONS
// ============================================

// Clean up expired share codes
// This should be called periodically (e.g., via cron job or scheduled task)
export const cleanupExpiredShareCodes = createServerFn({ method: 'POST' })
  .inputValidator((data: { adminId?: string }) => data)
  .handler(async ({ data }) => {
    // Optional: verify admin access for manual cleanup
    if (data.adminId) {
      const admin = await prisma.user.findFirst({
        where: { id: data.adminId, isAdmin: true, deletedAt: null },
      })
      if (!admin) {
        throw new Error('Admin access required')
      }
    }

    const now = new Date()

    // Delete expired share codes
    const result = await prisma.planShareCode.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    })

    return {
      deletedCount: result.count,
      cleanedAt: now.toISOString(),
    }
  })

// Get statistics about share codes (admin only)
export const getShareCodeStats = createServerFn({ method: 'GET' })
  .inputValidator((data: { adminId: string }) => data)
  .handler(async ({ data }) => {
    // Verify admin access
    const admin = await prisma.user.findFirst({
      where: { id: data.adminId, isAdmin: true, deletedAt: null },
    })
    if (!admin) {
      throw new Error('Admin access required')
    }

    const now = new Date()

    const [total, expired, active] = await Promise.all([
      prisma.planShareCode.count(),
      prisma.planShareCode.count({
        where: { expiresAt: { lt: now } },
      }),
      prisma.planShareCode.count({
        where: { expiresAt: { gte: now } },
      }),
    ])

    return {
      total,
      expired,
      active,
    }
  })
