import { prisma } from './db'
import type { PlanAccess, PlanRole } from './plan-types'

export type { PlanAccess, PlanRole } from './plan-types'

export async function checkPlanAccess(
  planId: string,
  userId: string,
): Promise<PlanAccess> {
  const plan = await prisma.workoutPlan.findUnique({
    where: { id: planId },
    select: { userId: true },
  })

  if (!plan) {
    return { hasAccess: false, isOwner: false, role: null }
  }

  if (plan.userId === userId) {
    return { hasAccess: true, isOwner: true, role: 'OWNER' }
  }

  const collaborator = await prisma.planCollaborator.findUnique({
    where: {
      workoutPlanId_userId: { workoutPlanId: planId, userId },
    },
    select: { role: true, inviteStatus: true },
  })

  if (collaborator && collaborator.inviteStatus === 'ACCEPTED') {
    return {
      hasAccess: true,
      isOwner: false,
      role: collaborator.role as PlanRole,
    }
  }

  return { hasAccess: false, isOwner: false, role: null }
}

export async function requirePlanAccess(
  planId: string,
  userId: string,
): Promise<PlanAccess> {
  const access = await checkPlanAccess(planId, userId)
  if (!access.hasAccess) {
    throw new Error('Plan not found')
  }
  return access
}

export async function requirePlanEditAccess(
  planId: string,
  userId: string,
): Promise<PlanAccess> {
  const access = await requirePlanAccess(planId, userId)
  if (access.role === 'VIEWER') {
    throw new Error('You do not have edit access to this plan')
  }
  return access
}

export async function requirePlanOwnership(
  planId: string,
  userId: string,
): Promise<PlanAccess> {
  const access = await requirePlanAccess(planId, userId)
  if (!access.isOwner) {
    throw new Error('Only the plan owner can perform this action')
  }
  return access
}
