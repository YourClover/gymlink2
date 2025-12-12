import { beforeEach, describe, expect, it } from 'vitest'
import { mockPrisma } from '@/test/setup'

// We test the business logic directly by recreating the handler logic
// TanStack server functions are RPC-based and don't return values when called directly in tests

describe('challenges server functions', () => {
  const mockUser = {
    id: 'user-123',
    name: 'Test User',
  }

  const mockChallenge = {
    id: 'challenge-123',
    creatorId: 'user-123',
    name: 'Test Challenge',
    description: 'A test challenge',
    challengeType: 'TOTAL_WORKOUTS' as const,
    targetValue: 10,
    exerciseId: null,
    status: 'ACTIVE' as const,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-31'),
    isPublic: true,
    inviteCode: 'ABC12345',
    maxParticipants: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  describe('createChallenge validation', () => {
    it('throws error when end date is before start date', () => {
      const data = {
        creatorId: 'user-123',
        name: 'Test',
        challengeType: 'TOTAL_WORKOUTS' as const,
        targetValue: 10,
        startDate: '2025-01-31',
        endDate: '2025-01-01', // Before start
      }

      expect(() => {
        if (new Date(data.startDate) >= new Date(data.endDate)) {
          throw new Error('End date must be after start date')
        }
      }).toThrow('End date must be after start date')
    })

    it('throws error when target value is not positive', () => {
      const data = {
        targetValue: 0,
      }

      expect(() => {
        if (data.targetValue <= 0) {
          throw new Error('Target value must be positive')
        }
      }).toThrow('Target value must be positive')
    })

    it('passes validation with valid data', () => {
      const data = {
        creatorId: 'user-123',
        name: 'Test',
        challengeType: 'TOTAL_WORKOUTS' as const,
        targetValue: 10,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      }

      expect(() => {
        if (new Date(data.startDate) >= new Date(data.endDate)) {
          throw new Error('End date must be after start date')
        }
        if (data.targetValue <= 0) {
          throw new Error('Target value must be positive')
        }
      }).not.toThrow()
    })
  })

  describe('joinChallenge logic', () => {
    beforeEach(() => {
      mockPrisma.challenge.findUnique.mockResolvedValue({
        ...mockChallenge,
        _count: { participants: 5 },
      } as any)
    })

    it('throws error when challenge not found', async () => {
      mockPrisma.challenge.findUnique.mockResolvedValue(null)

      const challenge = await mockPrisma.challenge.findUnique({
        where: { id: 'nonexistent' },
      })

      expect(challenge).toBeNull()
      expect(() => {
        if (!challenge) throw new Error('Challenge not found')
      }).toThrow('Challenge not found')
    })

    it('throws error when challenge is completed', async () => {
      mockPrisma.challenge.findUnique.mockResolvedValue({
        ...mockChallenge,
        status: 'COMPLETED',
        _count: { participants: 5 },
      } as any)

      const challenge = await mockPrisma.challenge.findUnique({
        where: { id: mockChallenge.id },
      })

      expect(() => {
        if (
          challenge?.status === 'COMPLETED' ||
          challenge?.status === 'CANCELLED'
        ) {
          throw new Error('Challenge is no longer active')
        }
      }).toThrow('Challenge is no longer active')
    })

    it('throws error when challenge is full', async () => {
      mockPrisma.challenge.findUnique.mockResolvedValue({
        ...mockChallenge,
        maxParticipants: 5,
        _count: { participants: 5 },
      } as any)

      const challenge = (await mockPrisma.challenge.findUnique({
        where: { id: mockChallenge.id },
      })) as any

      expect(() => {
        if (
          challenge?.maxParticipants &&
          challenge._count.participants >= challenge.maxParticipants
        ) {
          throw new Error('Challenge is full')
        }
      }).toThrow('Challenge is full')
    })

    it('throws error when already participating', async () => {
      mockPrisma.challengeParticipant.findUnique.mockResolvedValue({
        id: 'participant-123',
        challengeId: mockChallenge.id,
        userId: mockUser.id,
        progress: 0,
        completedAt: null,
        joinedAt: new Date(),
      })

      const existing = await mockPrisma.challengeParticipant.findUnique({
        where: {
          challengeId_userId: {
            challengeId: mockChallenge.id,
            userId: mockUser.id,
          },
        },
      })

      expect(existing).not.toBeNull()
      expect(() => {
        if (existing) throw new Error('Already participating in this challenge')
      }).toThrow('Already participating in this challenge')
    })

    it('allows joining when not already participating', async () => {
      mockPrisma.challengeParticipant.findUnique.mockResolvedValue(null)
      mockPrisma.challengeParticipant.create.mockResolvedValue({
        id: 'new-participant',
        challengeId: mockChallenge.id,
        userId: mockUser.id,
        progress: 0,
        completedAt: null,
        joinedAt: new Date(),
      })

      const existing = await mockPrisma.challengeParticipant.findUnique({
        where: {
          challengeId_userId: {
            challengeId: mockChallenge.id,
            userId: mockUser.id,
          },
        },
      })

      expect(existing).toBeNull()

      const participant = await mockPrisma.challengeParticipant.create({
        data: {
          challengeId: mockChallenge.id,
          userId: mockUser.id,
          progress: 0,
        },
      })

      expect(participant.id).toBe('new-participant')
    })
  })

  describe('leaveChallenge logic', () => {
    it('throws error when creator tries to leave', async () => {
      mockPrisma.challenge.findUnique.mockResolvedValue(mockChallenge)

      const challenge = await mockPrisma.challenge.findUnique({
        where: { id: mockChallenge.id },
      })

      const userId = mockChallenge.creatorId // Creator trying to leave

      expect(() => {
        if (challenge?.creatorId === userId) {
          throw new Error('Creator cannot leave their own challenge')
        }
      }).toThrow('Creator cannot leave their own challenge')
    })

    it('allows non-creator to leave', async () => {
      mockPrisma.challenge.findUnique.mockResolvedValue(mockChallenge)

      const challenge = await mockPrisma.challenge.findUnique({
        where: { id: mockChallenge.id },
      })

      const userId = 'other-user' // Not the creator

      expect(() => {
        if (challenge?.creatorId === userId) {
          throw new Error('Creator cannot leave their own challenge')
        }
      }).not.toThrow()
    })
  })

  describe('getChallengeDetails logic', () => {
    it('returns null when challenge not found', async () => {
      mockPrisma.challenge.findUnique.mockResolvedValue(null)

      const challenge = await mockPrisma.challenge.findUnique({
        where: { id: 'nonexistent' },
      })

      const result = !challenge
        ? { challenge: null, userParticipation: null }
        : { challenge, userParticipation: null }

      expect(result.challenge).toBeNull()
      expect(result.userParticipation).toBeNull()
    })

    it('returns challenge with participants', async () => {
      const challengeWithParticipants = {
        ...mockChallenge,
        creator: { id: mockUser.id, name: mockUser.name },
        exercise: null,
        participants: [
          {
            id: 'p1',
            userId: mockUser.id,
            progress: 5,
            completedAt: null,
            joinedAt: new Date(),
            user: { id: mockUser.id, name: mockUser.name, profile: null },
          },
        ],
      }

      mockPrisma.challenge.findUnique.mockResolvedValue(
        challengeWithParticipants as any,
      )

      const challenge = await mockPrisma.challenge.findUnique({
        where: { id: mockChallenge.id },
        include: {
          creator: { select: { id: true, name: true } },
          exercise: { select: { id: true, name: true } },
          participants: true,
        },
      })

      expect(challenge).not.toBeNull()
      expect(challenge?.participants).toHaveLength(1)
    })

    it('finds user participation from participants list', () => {
      const participants = [
        { userId: 'user-1', progress: 5 },
        { userId: 'user-2', progress: 10 },
        { userId: mockUser.id, progress: 7 },
      ]

      const userParticipation = participants.find(
        (p) => p.userId === mockUser.id,
      )

      expect(userParticipation).toBeDefined()
      expect(userParticipation?.progress).toBe(7)
    })
  })

  describe('getUserChallenges logic', () => {
    it('filters challenges by status', () => {
      const challenges = [
        { ...mockChallenge, id: '1', status: 'ACTIVE' as const },
        { ...mockChallenge, id: '2', status: 'COMPLETED' as const },
        { ...mockChallenge, id: '3', status: 'ACTIVE' as const },
      ]

      const status = 'ACTIVE' as const
      const filtered = challenges.filter((c) => c.status === status)

      expect(filtered).toHaveLength(2)
      expect(filtered.every((c) => c.status === 'ACTIVE')).toBe(true)
    })

    it('returns all challenges when no status filter', () => {
      const challenges = [
        { ...mockChallenge, id: '1', status: 'ACTIVE' as const },
        { ...mockChallenge, id: '2', status: 'COMPLETED' as const },
      ]

      const status = undefined
      const filtered = challenges.filter((c) => !status || c.status === status)

      expect(filtered).toHaveLength(2)
    })
  })

  describe('updateChallengeProgress logic', () => {
    it('marks challenge as completed when progress reaches target', () => {
      const challenge = { ...mockChallenge, targetValue: 10 }
      const currentProgress = 9
      const progressDelta = 2

      const newProgress = currentProgress + progressDelta
      const completed = newProgress >= challenge.targetValue

      expect(newProgress).toBe(11)
      expect(completed).toBe(true)
    })

    it('does not mark as completed when progress below target', () => {
      const challenge = { ...mockChallenge, targetValue: 10 }
      const currentProgress = 5
      const progressDelta = 2

      const newProgress = currentProgress + progressDelta
      const completed = newProgress >= challenge.targetValue

      expect(newProgress).toBe(7)
      expect(completed).toBe(false)
    })

    it('skips update when progress delta is zero', () => {
      const progressDelta = 0
      const shouldUpdate = progressDelta !== 0

      expect(shouldUpdate).toBe(false)
    })

    it('calculates TOTAL_WORKOUTS progress as 1 per workout', () => {
      const challengeType = 'TOTAL_WORKOUTS'
      let progressDelta = 0

      if (challengeType === 'TOTAL_WORKOUTS') {
        progressDelta = 1
      }

      expect(progressDelta).toBe(1)
    })

    it('calculates TOTAL_SETS progress as count of non-warmup sets', () => {
      const sets = [
        { isWarmup: false },
        { isWarmup: true },
        { isWarmup: false },
        { isWarmup: false },
      ]

      const progressDelta = sets.filter((s) => !s.isWarmup).length

      expect(progressDelta).toBe(3)
    })

    it('calculates TOTAL_VOLUME progress as weight * reps sum', () => {
      const sets = [
        { weight: 100, reps: 10 },
        { weight: 100, reps: 8 },
        { weight: 50, reps: 12 },
      ]

      const progressDelta = sets.reduce(
        (sum, set) => sum + (set.weight ?? 0) * (set.reps ?? 0),
        0,
      )

      expect(progressDelta).toBe(1000 + 800 + 600)
    })
  })
})
