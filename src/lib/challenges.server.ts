import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db'
import type { ChallengeType, ChallengeStatus } from '@prisma/client'

const CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

function generateInviteCode(): string {
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

// Create a new challenge
export const createChallenge = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      creatorId: string
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
      return data
    },
  )
  .handler(async ({ data }) => {
    // Generate unique invite code
    let inviteCode = generateInviteCode()
    let attempts = 0
    while (await prisma.challenge.findUnique({ where: { inviteCode } })) {
      inviteCode = generateInviteCode()
      if (++attempts > 10) throw new Error('Failed to generate unique code')
    }

    // Determine initial status
    const now = new Date()
    const startDate = new Date(data.startDate)
    const status: ChallengeStatus = startDate > now ? 'UPCOMING' : 'ACTIVE'

    const challenge = await prisma.challenge.create({
      data: {
        creatorId: data.creatorId,
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
        userId: data.creatorId,
        progress: 0,
      },
    })

    return { challenge }
  })

// Join a challenge
export const joinChallenge = createServerFn({ method: 'POST' })
  .inputValidator((data: { challengeId: string; userId: string }) => data)
  .handler(async ({ data }) => {
    const challenge = await prisma.challenge.findUnique({
      where: { id: data.challengeId },
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
    const existing = await prisma.challengeParticipant.findUnique({
      where: {
        challengeId_userId: {
          challengeId: data.challengeId,
          userId: data.userId,
        },
      },
    })
    if (existing) throw new Error('Already participating in this challenge')

    const participant = await prisma.challengeParticipant.create({
      data: {
        challengeId: data.challengeId,
        userId: data.userId,
        progress: 0,
      },
    })

    // Create activity item
    await prisma.activityFeedItem.create({
      data: {
        userId: data.userId,
        activityType: 'CHALLENGE_JOINED',
        referenceId: data.challengeId,
        metadata: { challengeName: challenge.name },
      },
    })

    return { participant }
  })

// Join by invite code
export const joinChallengeByCode = createServerFn({ method: 'POST' })
  .inputValidator((data: { inviteCode: string; userId: string }) => data)
  .handler(async ({ data }) => {
    const challenge = await prisma.challenge.findUnique({
      where: { inviteCode: data.inviteCode.toUpperCase() },
    })

    if (!challenge) throw new Error('Invalid invite code')

    return joinChallenge({
      data: { challengeId: challenge.id, userId: data.userId },
    })
  })

// Leave a challenge
export const leaveChallenge = createServerFn({ method: 'POST' })
  .inputValidator((data: { challengeId: string; userId: string }) => data)
  .handler(async ({ data }) => {
    const challenge = await prisma.challenge.findUnique({
      where: { id: data.challengeId },
    })

    if (challenge?.creatorId === data.userId) {
      throw new Error('Creator cannot leave their own challenge')
    }

    await prisma.challengeParticipant.delete({
      where: {
        challengeId_userId: {
          challengeId: data.challengeId,
          userId: data.userId,
        },
      },
    })

    return { success: true }
  })

// Get challenge details
export const getChallengeDetails = createServerFn({ method: 'GET' })
  .inputValidator((data: { challengeId: string; userId?: string }) => data)
  .handler(async ({ data }) => {
    const challenge = await prisma.challenge.findUnique({
      where: { id: data.challengeId },
      include: {
        creator: { select: { id: true, name: true } },
        exercise: { select: { id: true, name: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: [{ completedAt: 'asc' }, { progress: 'desc' }],
        },
      },
    })

    if (!challenge) return { challenge: null, userParticipation: null }

    // Get profiles for participants
    const userIds = challenge.participants.map((p) => p.userId)
    const profiles = await prisma.userProfile.findMany({
      where: { userId: { in: userIds } },
    })
    const profileMap = new Map(profiles.map((p) => [p.userId, p]))

    // Find user's participation
    const userParticipation = data.userId
      ? challenge.participants.find((p) => p.userId === data.userId)
      : null

    return {
      challenge: {
        ...challenge,
        participants: challenge.participants.map((p, index) => ({
          ...p,
          rank: index + 1,
          profile: profileMap.get(p.userId),
        })),
      },
      userParticipation,
    }
  })

// Get public challenges (for discovery)
export const getPublicChallenges = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    // Get challenges user is already participating in
    const userParticipations = await prisma.challengeParticipant.findMany({
      where: { userId: data.userId },
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
        _count: { select: { participants: true } },
      },
      orderBy: { createdAt: 'desc' },
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
    (data: { userId: string; status?: ChallengeStatus }) => data,
  )
  .handler(async ({ data }) => {
    const participations = await prisma.challengeParticipant.findMany({
      where: { userId: data.userId },
      include: {
        challenge: {
          include: {
            creator: { select: { name: true } },
            _count: { select: { participants: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
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

// Update challenge progress (called after workout completion)
export const updateChallengeProgress = createServerFn({ method: 'POST' })
  .inputValidator((data: { userId: string; sessionId: string }) => data)
  .handler(async ({ data }) => {
    // Get user's active challenges
    const participations = await prisma.challengeParticipant.findMany({
      where: {
        userId: data.userId,
        completedAt: null,
        challenge: { status: 'ACTIVE' },
      },
      include: { challenge: true },
    })

    for (const participation of participations) {
      const challenge = participation.challenge
      let newProgress = participation.progress

      // Calculate progress based on challenge type
      switch (challenge.challengeType) {
        case 'TOTAL_WORKOUTS':
          newProgress += 1
          break

        case 'TOTAL_VOLUME': {
          const session = await prisma.workoutSession.findUnique({
            where: { id: data.sessionId },
            include: {
              workoutSets: {
                where: { isWarmup: false },
                select: { weight: true, reps: true },
              },
            },
          })
          const sessionVolume =
            session?.workoutSets.reduce(
              (sum, set) => sum + (set.weight ?? 0) * (set.reps ?? 0),
              0,
            ) ?? 0
          newProgress += sessionVolume
          break
        }

        case 'TOTAL_SETS': {
          const setCount = await prisma.workoutSet.count({
            where: { workoutSessionId: data.sessionId, isWarmup: false },
          })
          newProgress += setCount
          break
        }

        case 'SPECIFIC_EXERCISE': {
          if (!challenge.exerciseId) break
          const exerciseSets = await prisma.workoutSet.findMany({
            where: {
              workoutSessionId: data.sessionId,
              exerciseId: challenge.exerciseId,
              isWarmup: false,
            },
            select: { weight: true, reps: true },
          })
          const exerciseVolume = exerciseSets.reduce(
            (sum, set) => sum + (set.weight ?? 0) * (set.reps ?? 0),
            0,
          )
          newProgress += exerciseVolume
          break
        }
      }

      // Update progress
      const completed = newProgress >= challenge.targetValue

      await prisma.challengeParticipant.update({
        where: { id: participation.id },
        data: {
          progress: newProgress,
          ...(completed && { completedAt: new Date() }),
        },
      })

      // Create activity if completed
      if (completed && !participation.completedAt) {
        await prisma.activityFeedItem.create({
          data: {
            userId: data.userId,
            activityType: 'CHALLENGE_COMPLETED',
            referenceId: challenge.id,
            metadata: { challengeName: challenge.name },
          },
        })
      }
    }

    return { success: true }
  })
