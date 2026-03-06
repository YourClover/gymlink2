import { randomInt } from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { MAX_CODE_GENERATION_ATTEMPTS } from './constants'
import { prisma } from './db.server'
import { requireAuth } from './auth-guard.server'
import type { ChallengeStatus, ChallengeType } from '@prisma/client'

const CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

function generateInviteCode(): string {
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += CODE_CHARS[randomInt(CODE_CHARS.length)]
  }
  return code
}

// Create a new challenge
export const createChallenge = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      token: string | null
      name: string
      description?: string
      challengeType: ChallengeType
      targetValue: number
      exerciseId?: string
      startDate: string
      endDate: string
      isPublic?: boolean
      maxParticipants?: number
    }) => {
      if (new Date(data.startDate) >= new Date(data.endDate)) {
        throw new Error('End date must be after start date')
      }
      if (data.targetValue <= 0) {
        throw new Error('Target value must be positive')
      }
      if (
        data.maxParticipants !== undefined &&
        (data.maxParticipants < 2 || data.maxParticipants > 10000)
      ) {
        throw new Error('Max participants must be between 2 and 10,000')
      }
      return data
    },
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    // Generate unique invite code
    let inviteCode = generateInviteCode()
    let attempts = 0
    while (await prisma.challenge.findUnique({ where: { inviteCode } })) {
      inviteCode = generateInviteCode()
      if (++attempts > MAX_CODE_GENERATION_ATTEMPTS)
        throw new Error('Failed to generate unique code')
    }

    // Determine initial status
    const now = new Date()
    const startDate = new Date(data.startDate)
    const status: ChallengeStatus = startDate > now ? 'UPCOMING' : 'ACTIVE'

    const challenge = await prisma.challenge.create({
      data: {
        creatorId: userId,
        name: data.name,
        description: data.description,
        challengeType: data.challengeType,
        targetValue: data.targetValue,
        exerciseId: data.exerciseId,
        status,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isPublic: data.isPublic ?? false,
        inviteCode,
        maxParticipants: data.maxParticipants,
      },
    })

    // Auto-add creator as participant
    await prisma.challengeParticipant.create({
      data: {
        challengeId: challenge.id,
        userId,
        progress: 0,
      },
    })

    return { challenge }
  })

// Internal helper for joining a challenge (used by joinChallenge and joinChallengeByCode)
async function joinChallengeInternal(challengeId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const challenge = await tx.challenge.findUnique({
      where: { id: challengeId },
      include: { _count: { select: { participants: true } } },
    })

    if (!challenge) throw new Error('Challenge not found')
    if (challenge.status === 'COMPLETED' || challenge.status === 'CANCELLED') {
      throw new Error('Challenge is no longer active')
    }
    if (
      challenge.maxParticipants &&
      challenge._count.participants >= challenge.maxParticipants
    ) {
      throw new Error('Challenge is full')
    }

    // Check if already participating
    const existing = await tx.challengeParticipant.findUnique({
      where: {
        challengeId_userId: {
          challengeId,
          userId,
        },
      },
    })
    if (existing) throw new Error('Already participating in this challenge')

    const participant = await tx.challengeParticipant.create({
      data: {
        challengeId,
        userId,
        progress: 0,
      },
    })

    // Create activity item
    await tx.activityFeedItem.create({
      data: {
        userId,
        activityType: 'CHALLENGE_JOINED',
        referenceId: challengeId,
        metadata: { challengeName: challenge.name },
      },
    })

    return { participant }
  })
}

// Join a challenge
export const joinChallenge = createServerFn({ method: 'POST' })
  .inputValidator((data: { challengeId: string; token: string | null }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    const challenge = await prisma.challenge.findUnique({
      where: { id: data.challengeId },
      select: { isPublic: true },
    })
    if (!challenge) throw new Error('Challenge not found')
    if (!challenge.isPublic) throw new Error('Challenge not found')

    return joinChallengeInternal(data.challengeId, userId)
  })

// Join by invite code
export const joinChallengeByCode = createServerFn({ method: 'POST' })
  .inputValidator((data: { inviteCode: string; token: string | null }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    const challenge = await prisma.challenge.findUnique({
      where: { inviteCode: data.inviteCode.toUpperCase() },
    })

    if (!challenge) throw new Error('Invalid invite code')

    return joinChallengeInternal(challenge.id, userId)
  })

// Leave a challenge
export const leaveChallenge = createServerFn({ method: 'POST' })
  .inputValidator((data: { challengeId: string; token: string | null }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    const challenge = await prisma.challenge.findUnique({
      where: { id: data.challengeId },
    })

    if (challenge?.creatorId === userId) {
      throw new Error('Creator cannot leave their own challenge')
    }

    await prisma.challengeParticipant.delete({
      where: {
        challengeId_userId: {
          challengeId: data.challengeId,
          userId,
        },
      },
    })

    return { success: true }
  })

// Get challenge details
export const getChallengeDetails = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { challengeId: string; token?: string | null }) => data,
  )
  .handler(async ({ data }) => {
    let userId: string | undefined
    if (data.token) {
      try {
        const auth = await requireAuth(data.token)
        userId = auth.userId
      } catch {
        // Token invalid or expired — treat as unauthenticated
      }
    }

    // Fetch challenge with participants and profiles in a single query (fixes N+1)
    const challenge = await prisma.challenge.findUnique({
      where: { id: data.challengeId },
      include: {
        creator: { select: { id: true, name: true } },
        exercise: { select: { id: true, name: true } },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profile: { select: { username: true, avatarUrl: true } },
              },
            },
          },
          orderBy: { progress: 'desc' },
        },
      },
    })

    if (!challenge) return { challenge: null, userParticipation: null }

    // Find user's participation
    const userParticipation = userId
      ? challenge.participants.find((p) => p.userId === userId)
      : null

    return {
      challenge: {
        ...challenge,
        participants: challenge.participants.map((p, index) => ({
          ...p,
          rank: index + 1,
          profile: p.user.profile,
        })),
      },
      userParticipation,
    }
  })

// Get public challenges (for discovery)
export const getPublicChallenges = createServerFn({ method: 'GET' })
  .inputValidator((data: { token: string | null }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    // Get challenges user is already participating in
    const userParticipations = await prisma.challengeParticipant.findMany({
      where: { userId },
      select: { challengeId: true },
    })
    const participatingIds = userParticipations.map((p) => p.challengeId)

    // Find public challenges the user hasn't joined
    const challenges = await prisma.challenge.findMany({
      where: {
        isPublic: true,
        status: { in: ['ACTIVE', 'UPCOMING'] },
        id: { notIn: participatingIds },
      },
      include: {
        creator: { select: { name: true } },
        exercise: { select: { id: true, name: true } },
        _count: { select: { participants: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    return {
      challenges: challenges.map((c) => ({
        ...c,
        participantCount: c._count.participants,
      })),
    }
  })

// Get user's challenges
export const getUserChallenges = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { token: string | null; status?: ChallengeStatus }) => data,
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    const participations = await prisma.challengeParticipant.findMany({
      where: { userId },
      include: {
        challenge: {
          include: {
            creator: { select: { name: true } },
            exercise: { select: { id: true, name: true } },
            _count: { select: { participants: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
      take: 50,
    })

    const challenges = participations
      .map((p) => ({
        ...p.challenge,
        userProgress: p.progress,
        userCompletedAt: p.completedAt,
        participantCount: p.challenge._count.participants,
      }))
      .filter((c) => !data.status || c.status === data.status)

    return { challenges }
  })

// Internal helper for updating challenge progress (used by server fn and completeWorkoutSession)
export async function updateChallengeProgressInternal(
  userId: string,
  sessionId: string,
) {
  // Get user's active challenges and session data in parallel
  const [participations, session] = await Promise.all([
    prisma.challengeParticipant.findMany({
      where: {
        userId,
        completedAt: null,
        challenge: { status: 'ACTIVE' },
      },
      include: { challenge: true },
    }),
    prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: {
        workoutSets: {
          where: { isWarmup: false, isDropset: false },
          select: { weight: true, reps: true, exerciseId: true },
        },
      },
    }),
  ])

  if (!session) return { success: true }

  // Pre-compute session-level aggregates
  const sessionVolume = session.workoutSets.reduce(
    (sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0),
    0,
  )
  const sessionSetCount = session.workoutSets.length

  // Compute progress deltas in-memory first
  const deltas = participations.map((participation) => {
    const challenge = participation.challenge
    let progressDelta = 0

    switch (challenge.challengeType) {
      case 'TOTAL_WORKOUTS':
        progressDelta = 1
        break

      case 'TOTAL_VOLUME':
        progressDelta = sessionVolume
        break

      case 'TOTAL_SETS':
        progressDelta = sessionSetCount
        break

      case 'SPECIFIC_EXERCISE': {
        if (!challenge.exerciseId) break
        progressDelta = session.workoutSets
          .filter((s) => s.exerciseId === challenge.exerciseId)
          .reduce(
            (sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0),
            0,
          )
        break
      }
    }

    return { participation, challenge, progressDelta }
  })

  // Single transaction for all participation updates
  await prisma.$transaction(async (tx) => {
    for (const { participation, challenge, progressDelta } of deltas) {
      if (progressDelta === 0) continue

      const current = await tx.challengeParticipant.findUnique({
        where: { id: participation.id },
        select: { progress: true, completedAt: true },
      })

      if (current?.completedAt) continue

      const newProgress = (current?.progress ?? 0) + progressDelta
      const completed = newProgress >= challenge.targetValue

      await tx.challengeParticipant.update({
        where: {
          id: participation.id,
          completedAt: null,
        },
        data: {
          progress: newProgress,
          ...(completed && { completedAt: new Date() }),
        },
      })

      if (completed) {
        await tx.activityFeedItem.create({
          data: {
            userId,
            activityType: 'CHALLENGE_COMPLETED',
            referenceId: challenge.id,
            metadata: { challengeName: challenge.name },
          },
        })
      }
    }
  })

  return { success: true }
}

// Update challenge progress (called after workout completion)
export const updateChallengeProgress = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string | null; sessionId: string }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    return updateChallengeProgressInternal(userId, data.sessionId)
  })
