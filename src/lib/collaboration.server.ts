import { createServerFn } from '@tanstack/react-start'
import { Prisma } from '@prisma/client'
import { prisma } from './db.server'
import { requireAdmin, requireAuth } from './auth-guard.server'
import { requirePlanAccess, requirePlanOwnership } from './plan-auth.server'
import type { PlanCollaboratorRole } from '@prisma/client'

// Get mutual followers who can be invited to a plan
export const getInvitableUsers = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { token: string | null; planId: string; search?: string }) => data,
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)
    await requirePlanOwnership(data.planId, userId)

    // Find mutual followers (both sides ACCEPTED)
    const searchFilter = data.search
      ? Prisma.sql`AND (u.name ILIKE ${'%' + data.search + '%'} OR up.username ILIKE ${'%' + data.search + '%'})`
      : Prisma.empty

    const mutualFollowers = await prisma.$queryRaw<
      Array<{ id: string; name: string; username: string | null }>
    >(Prisma.sql`
      SELECT u.id, u.name, up.username
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE u.deleted_at IS NULL
        AND u.id != ${userId}
        AND EXISTS (
          SELECT 1 FROM follows f1
          WHERE f1.follower_id = u.id
            AND f1.following_id = ${userId}
            AND f1.status = 'ACCEPTED'
        )
        AND EXISTS (
          SELECT 1 FROM follows f2
          WHERE f2.follower_id = ${userId}
            AND f2.following_id = u.id
            AND f2.status = 'ACCEPTED'
        )
        AND NOT EXISTS (
          SELECT 1 FROM plan_collaborators pc
          WHERE pc.workout_plan_id = ${data.planId}
            AND pc.user_id = u.id
        )
        ${searchFilter}
      ORDER BY u.name ASC
      LIMIT 20
    `)

    return { users: mutualFollowers }
  })

// Invite a collaborator to a plan
export const inviteCollaborator = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      token: string | null
      planId: string
      inviteeId: string
      role: PlanCollaboratorRole
    }) => data,
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    if (userId === data.inviteeId) {
      throw new Error('Cannot invite yourself')
    }

    await requirePlanOwnership(data.planId, userId)

    // Verify mutual follow
    const [theyFollowMe, iFollowThem] = await Promise.all([
      prisma.follow.findFirst({
        where: {
          followerId: data.inviteeId,
          followingId: userId,
          status: 'ACCEPTED',
        },
      }),
      prisma.follow.findFirst({
        where: {
          followerId: userId,
          followingId: data.inviteeId,
          status: 'ACCEPTED',
        },
      }),
    ])

    if (!theyFollowMe || !iFollowThem) {
      throw new Error('Can only invite mutual followers')
    }

    const [plan, inviter] = await Promise.all([
      prisma.workoutPlan.findUnique({
        where: { id: data.planId },
        select: { name: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      }),
    ])

    // Use transaction to prevent duplicate invite race condition
    let collaborator
    try {
      collaborator = await prisma.$transaction(async (tx) => {
        const existing = await tx.planCollaborator.findUnique({
          where: {
            workoutPlanId_userId: {
              workoutPlanId: data.planId,
              userId: data.inviteeId,
            },
          },
        })

        if (existing) {
          throw new Error('User has already been invited to this plan')
        }

        return tx.planCollaborator.create({
          data: {
            workoutPlanId: data.planId,
            userId: data.inviteeId,
            role: data.role,
            invitedBy: userId,
          },
        })
      })
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'User has already been invited to this plan'
      ) {
        throw error
      }
      throw new Error('User has already been invited to this plan')
    }

    // Send notification
    await prisma.notification.create({
      data: {
        userId: data.inviteeId,
        type: 'PLAN_INVITE',
        title: 'Plan Invitation',
        message: `${inviter?.name} invited you to collaborate on "${plan?.name}"`,
        referenceId: data.planId,
      },
    })

    return { collaborator }
  })

// Accept or decline a collaboration invite
export const respondToCollabInvite = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { token: string | null; planId: string; accept: boolean }) => data,
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    const collaborator = await prisma.planCollaborator.findUnique({
      where: {
        workoutPlanId_userId: {
          workoutPlanId: data.planId,
          userId,
        },
      },
      include: {
        workoutPlan: { select: { userId: true, name: true } },
      },
    })

    if (!collaborator || collaborator.inviteStatus !== 'PENDING') {
      throw new Error('No pending invite found')
    }

    if (data.accept) {
      await prisma.planCollaborator.update({
        where: { id: collaborator.id },
        data: { inviteStatus: 'ACCEPTED', joinedAt: new Date() },
      })

      // Notify the plan owner
      const joiner = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      })

      await prisma.notification.create({
        data: {
          userId: collaborator.workoutPlan.userId,
          type: 'PLAN_INVITE',
          title: 'Invite Accepted',
          message: `${joiner?.name} joined your plan "${collaborator.workoutPlan.name}"`,
          referenceId: data.planId,
        },
      })
    } else {
      await prisma.planCollaborator.update({
        where: { id: collaborator.id },
        data: { inviteStatus: 'DECLINED' },
      })
    }

    return { success: true }
  })

// Update a collaborator's role (owner only)
export const updateCollaboratorRole = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      token: string | null
      planId: string
      collaboratorUserId: string
      role: PlanCollaboratorRole
    }) => data,
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)
    await requirePlanOwnership(data.planId, userId)

    const collaborator = await prisma.planCollaborator.findUnique({
      where: {
        workoutPlanId_userId: {
          workoutPlanId: data.planId,
          userId: data.collaboratorUserId,
        },
      },
    })

    if (!collaborator) {
      throw new Error('Collaborator not found')
    }

    await prisma.planCollaborator.update({
      where: { id: collaborator.id },
      data: { role: data.role },
    })

    return { success: true }
  })

// Remove a collaborator (owner only)
export const removeCollaborator = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      token: string | null
      planId: string
      collaboratorUserId: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)
    await requirePlanOwnership(data.planId, userId)

    await prisma.planCollaborator.deleteMany({
      where: {
        workoutPlanId: data.planId,
        userId: data.collaboratorUserId,
      },
    })

    return { success: true }
  })

// Leave a collaboration (collaborator self-removes)
export const leaveCollaboration = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string | null; planId: string }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    // Verify the user is a collaborator (not the owner)
    const plan = await prisma.workoutPlan.findUnique({
      where: { id: data.planId },
      select: { userId: true },
    })

    if (!plan) {
      throw new Error('Plan not found')
    }

    if (plan.userId === userId) {
      throw new Error('Owner cannot leave their own plan')
    }

    await prisma.planCollaborator.deleteMany({
      where: {
        workoutPlanId: data.planId,
        userId,
      },
    })

    return { success: true }
  })

// Get plan collaborators
export const getPlanCollaborators = createServerFn({ method: 'GET' })
  .inputValidator((data: { token: string | null; planId: string }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)
    await requirePlanAccess(data.planId, userId)

    const plan = await prisma.workoutPlan.findUnique({
      where: { id: data.planId },
      select: {
        userId: true,
        user: { select: { id: true, name: true } },
      },
    })

    if (!plan) {
      throw new Error('Plan not found')
    }

    const collaborators = await prisma.planCollaborator.findMany({
      where: { workoutPlanId: data.planId },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return {
      owner: plan.user,
      collaborators: collaborators.map((c) => ({
        id: c.id,
        userId: c.user.id,
        name: c.user.name,
        role: c.role,
        inviteStatus: c.inviteStatus,
      })),
    }
  })
