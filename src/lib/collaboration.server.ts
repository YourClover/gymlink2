import { createServerFn } from '@tanstack/react-start'
import { Prisma } from '@prisma/client'
import { prisma } from './db'
import { requirePlanAccess, requirePlanOwnership } from './plan-auth.server'
import type { PlanCollaboratorRole } from '@prisma/client'

// Get mutual followers who can be invited to a plan
export const getInvitableUsers = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { userId: string; planId: string; search?: string }) => data,
  )
  .handler(async ({ data }) => {
    await requirePlanOwnership(data.planId, data.userId)

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
        AND u.id != ${data.userId}
        AND EXISTS (
          SELECT 1 FROM follows f1
          WHERE f1.follower_id = u.id
            AND f1.following_id = ${data.userId}
            AND f1.status = 'ACCEPTED'
        )
        AND EXISTS (
          SELECT 1 FROM follows f2
          WHERE f2.follower_id = ${data.userId}
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
      userId: string
      planId: string
      inviteeId: string
      role: PlanCollaboratorRole
    }) => data,
  )
  .handler(async ({ data }) => {
    if (data.userId === data.inviteeId) {
      throw new Error('Cannot invite yourself')
    }

    await requirePlanOwnership(data.planId, data.userId)

    // Verify mutual follow
    const [theyFollowMe, iFollowThem] = await Promise.all([
      prisma.follow.findFirst({
        where: {
          followerId: data.inviteeId,
          followingId: data.userId,
          status: 'ACCEPTED',
        },
      }),
      prisma.follow.findFirst({
        where: {
          followerId: data.userId,
          followingId: data.inviteeId,
          status: 'ACCEPTED',
        },
      }),
    ])

    if (!theyFollowMe || !iFollowThem) {
      throw new Error('Can only invite mutual followers')
    }

    // Check if already a collaborator
    const existing = await prisma.planCollaborator.findUnique({
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

    const plan = await prisma.workoutPlan.findUnique({
      where: { id: data.planId },
      select: { name: true },
    })

    const inviter = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { name: true },
    })

    const collaborator = await prisma.planCollaborator.create({
      data: {
        workoutPlanId: data.planId,
        userId: data.inviteeId,
        role: data.role,
        invitedBy: data.userId,
      },
    })

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
    (data: { userId: string; planId: string; accept: boolean }) => data,
  )
  .handler(async ({ data }) => {
    const collaborator = await prisma.planCollaborator.findUnique({
      where: {
        workoutPlanId_userId: {
          workoutPlanId: data.planId,
          userId: data.userId,
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
        where: { id: data.userId },
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
      userId: string
      planId: string
      collaboratorUserId: string
      role: PlanCollaboratorRole
    }) => data,
  )
  .handler(async ({ data }) => {
    await requirePlanOwnership(data.planId, data.userId)

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
    (data: { userId: string; planId: string; collaboratorUserId: string }) =>
      data,
  )
  .handler(async ({ data }) => {
    await requirePlanOwnership(data.planId, data.userId)

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
  .inputValidator((data: { userId: string; planId: string }) => data)
  .handler(async ({ data }) => {
    // Verify the user is a collaborator (not the owner)
    const plan = await prisma.workoutPlan.findUnique({
      where: { id: data.planId },
      select: { userId: true },
    })

    if (!plan) {
      throw new Error('Plan not found')
    }

    if (plan.userId === data.userId) {
      throw new Error('Owner cannot leave their own plan')
    }

    await prisma.planCollaborator.deleteMany({
      where: {
        workoutPlanId: data.planId,
        userId: data.userId,
      },
    })

    return { success: true }
  })

// Get plan collaborators
export const getPlanCollaborators = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string; planId: string }) => data)
  .handler(async ({ data }) => {
    await requirePlanAccess(data.planId, data.userId)

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
