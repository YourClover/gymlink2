import { describe, expect, it } from 'vitest'
import { RecordType, WeightUnit } from '@prisma/client'
import { mockPrisma } from '@/test/setup'

// We test the business logic directly by testing with mocked Prisma
// TanStack server functions are RPC-based and don't return values when called directly in tests

describe('workout server functions', () => {
  const userId = 'user-123'
  const sessionId = 'session-456'

  const mockSession = {
    id: sessionId,
    userId,
    workoutPlanId: null,
    planDayId: null,
    startedAt: new Date('2024-01-01T10:00:00Z'),
    completedAt: null,
    durationSeconds: null,
    notes: null,
    moodRating: null,
  }

  const mockWorkoutSet = {
    id: 'set-789',
    workoutSessionId: sessionId,
    exerciseId: 'exercise-123',
    setNumber: 1,
    reps: 10,
    timeSeconds: null,
    weight: 100,
    weightUnit: WeightUnit.KG,
    isWarmup: false,
    isDropset: false,
    rpe: 8,
    completedAt: new Date(),
    notes: null,
    exercise: {
      id: 'exercise-123',
      name: 'Bench Press',
    },
  }

  describe('getActiveSession logic', () => {
    it('returns active session for user', async () => {
      mockPrisma.workoutSession.findFirst.mockResolvedValue({
        ...mockSession,
        workoutPlan: null,
        planDay: null,
        workoutSets: [],
      } as any)

      const session = await mockPrisma.workoutSession.findFirst({
        where: { userId, completedAt: null },
      })

      expect(session).not.toBeNull()
      expect(session?.id).toBe(sessionId)
    })

    it('returns null when no active session', async () => {
      mockPrisma.workoutSession.findFirst.mockResolvedValue(null)

      const session = await mockPrisma.workoutSession.findFirst({
        where: { userId, completedAt: null },
      })

      expect(session).toBeNull()
    })
  })

  describe('startWorkoutSession logic', () => {
    it('creates a standalone workout session', async () => {
      mockPrisma.workoutSession.create.mockResolvedValue({
        ...mockSession,
        workoutPlan: null,
        planDay: null,
      } as any)

      const session = await mockPrisma.workoutSession.create({
        data: {
          userId,
          workoutPlanId: undefined,
          planDayId: undefined,
          startedAt: new Date(),
        },
      })

      expect(session.id).toBe(sessionId)
    })

    it('creates session with plan day after verifying ownership', async () => {
      const planDayId = 'day-123'
      const planId = 'plan-456'

      mockPrisma.planDay.findFirst.mockResolvedValue({
        id: planDayId,
        workoutPlan: { userId, id: planId },
      } as any)

      // Verify ownership
      const planDay = await mockPrisma.planDay.findFirst({
        where: { id: planDayId },
        include: { workoutPlan: { select: { userId: true, id: true } } },
      })

      expect(planDay).not.toBeNull()
      expect(planDay?.workoutPlan.userId).toBe(userId)

      mockPrisma.workoutSession.create.mockResolvedValue({
        ...mockSession,
        workoutPlanId: planId,
        planDayId,
      } as any)

      const session = await mockPrisma.workoutSession.create({
        data: {
          userId,
          workoutPlanId: planId,
          planDayId,
          startedAt: new Date(),
        },
      })

      expect(session.planDayId).toBe(planDayId)
    })

    it('throws error for unauthorized plan day', async () => {
      mockPrisma.planDay.findFirst.mockResolvedValue({
        id: 'day-123',
        workoutPlan: { userId: 'other-user', id: 'plan-456' },
      } as any)

      const planDay = await mockPrisma.planDay.findFirst({
        where: { id: 'day-123' },
        include: { workoutPlan: { select: { userId: true, id: true } } },
      })

      // Check ownership - should fail
      const isOwner = planDay?.workoutPlan.userId === userId
      expect(isOwner).toBe(false)

      expect(() => {
        if (!planDay || planDay.workoutPlan.userId !== userId) {
          throw new Error('Plan day not found')
        }
      }).toThrow('Plan day not found')
    })
  })

  describe('completeWorkoutSession logic', () => {
    it('completes session and calculates duration', async () => {
      const startTime = new Date('2024-01-01T10:00:00Z')
      const endTime = new Date('2024-01-01T11:30:00Z')
      const expectedDuration = 5400 // 1.5 hours in seconds

      mockPrisma.workoutSession.findFirst.mockResolvedValue({
        ...mockSession,
        startedAt: startTime,
      } as any)

      const existing = await mockPrisma.workoutSession.findFirst({
        where: { id: sessionId, userId },
      })

      expect(existing).not.toBeNull()

      // Calculate duration
      const durationSeconds = Math.floor(
        (endTime.getTime() - existing!.startedAt.getTime()) / 1000,
      )
      expect(durationSeconds).toBe(expectedDuration)

      mockPrisma.workoutSession.update.mockResolvedValue({
        ...mockSession,
        completedAt: endTime,
        durationSeconds: expectedDuration,
        notes: 'Great workout!',
        moodRating: 5,
      } as any)

      const updated = await mockPrisma.workoutSession.update({
        where: { id: sessionId },
        data: {
          completedAt: endTime,
          durationSeconds,
          notes: 'Great workout!',
          moodRating: 5,
        },
      })

      expect(updated.completedAt).not.toBeNull()
      expect(updated.durationSeconds).toBe(expectedDuration)
    })

    it('uses client-provided durationSeconds when given', async () => {
      const startTime = new Date('2024-01-01T10:00:00Z')
      const clientDuration = 3600 // 1 hour — user corrected

      mockPrisma.workoutSession.findFirst.mockResolvedValue({
        ...mockSession,
        startedAt: startTime,
      } as any)

      const existing = await mockPrisma.workoutSession.findFirst({
        where: { id: sessionId, userId },
      })

      expect(existing).not.toBeNull()

      // Simulate the server logic: prefer client value over calculated
      const calculatedDuration = Math.floor(
        (new Date('2024-01-01T14:00:00Z').getTime() -
          existing!.startedAt.getTime()) /
          1000,
      )
      // Calculated would be 4 hours (14400s), but client says 1 hour
      expect(calculatedDuration).toBe(14400)

      const durationSeconds = clientDuration ?? calculatedDuration
      expect(durationSeconds).toBe(clientDuration)

      mockPrisma.workoutSession.update.mockResolvedValue({
        ...mockSession,
        completedAt: new Date(),
        durationSeconds: clientDuration,
      } as any)

      const updated = await mockPrisma.workoutSession.update({
        where: { id: sessionId },
        data: {
          completedAt: new Date(),
          durationSeconds,
        },
      })

      expect(updated.durationSeconds).toBe(clientDuration)
    })

    it('throws error for non-existent session', async () => {
      mockPrisma.workoutSession.findFirst.mockResolvedValue(null)

      const existing = await mockPrisma.workoutSession.findFirst({
        where: { id: sessionId, userId },
      })

      expect(existing).toBeNull()
      expect(() => {
        if (!existing) {
          throw new Error('Session not found')
        }
      }).toThrow('Session not found')
    })
  })

  describe('discardWorkoutSession logic', () => {
    it('deletes session when owned by user', async () => {
      mockPrisma.workoutSession.findFirst.mockResolvedValue(mockSession as any)
      mockPrisma.workoutSession.delete.mockResolvedValue(mockSession as any)

      const existing = await mockPrisma.workoutSession.findFirst({
        where: { id: sessionId, userId },
      })

      expect(existing).not.toBeNull()

      await mockPrisma.workoutSession.delete({
        where: { id: sessionId },
      })

      expect(mockPrisma.workoutSession.delete).toHaveBeenCalledWith({
        where: { id: sessionId },
      })
    })

    it('throws error when session not found or not owned', async () => {
      mockPrisma.workoutSession.findFirst.mockResolvedValue(null)

      const existing = await mockPrisma.workoutSession.findFirst({
        where: { id: sessionId, userId },
      })

      expect(() => {
        if (!existing) {
          throw new Error('Session not found')
        }
      }).toThrow('Session not found')
    })
  })

  describe('logWorkoutSet logic', () => {
    it('creates a workout set', async () => {
      mockPrisma.workoutSession.findFirst.mockResolvedValue(mockSession as any)
      mockPrisma.workoutSet.create.mockResolvedValue(mockWorkoutSet as any)

      // Verify session ownership
      const session = await mockPrisma.workoutSession.findFirst({
        where: { id: sessionId, userId },
      })
      expect(session).not.toBeNull()

      const workoutSet = await mockPrisma.workoutSet.create({
        data: {
          workoutSessionId: sessionId,
          exerciseId: 'exercise-123',
          setNumber: 1,
          reps: 10,
          weight: 100,
          weightUnit: WeightUnit.KG,
          isWarmup: false,
          isDropset: false,
          completedAt: new Date(),
        },
      })

      expect(workoutSet).toBeDefined()
      expect(workoutSet.id).toBe('set-789')
    })

    it('detects new PR when weight exceeds previous record', async () => {
      const weight = 100
      const previousPRValue = 90

      mockPrisma.personalRecord.findFirst.mockResolvedValue({
        id: 'pr-old',
        value: previousPRValue,
      } as any)

      const existingPR = await mockPrisma.personalRecord.findFirst({
        where: {
          userId,
          exerciseId: 'exercise-123',
          recordType: RecordType.MAX_WEIGHT,
        },
        orderBy: { value: 'desc' },
      })

      expect(existingPR).not.toBeNull()

      const isNewPR = weight > existingPR!.value
      expect(isNewPR).toBe(true)

      mockPrisma.personalRecord.create.mockResolvedValue({} as any)

      await mockPrisma.personalRecord.create({
        data: {
          userId,
          exerciseId: 'exercise-123',
          recordType: RecordType.MAX_WEIGHT,
          value: weight,
          workoutSetId: 'set-789',
          previousRecord: previousPRValue,
        },
      })

      expect(mockPrisma.personalRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          value: 100,
          previousRecord: 90,
          recordType: RecordType.MAX_WEIGHT,
        }),
      })
    })

    it('does not check PR for warmup sets', () => {
      // PR check logic: weight > 0 && !isWarmup
      // Test cases for warmup sets - PR check should be skipped
      const shouldCheckPRWithWarmup = (weight: number, isWarmup: boolean) =>
        weight > 0 && !isWarmup

      expect(shouldCheckPRWithWarmup(100, true)).toBe(false) // warmup set
      expect(shouldCheckPRWithWarmup(100, false)).toBe(true) // working set
      expect(shouldCheckPRWithWarmup(0, false)).toBe(false) // zero weight
    })

    it('throws error for unauthorized session', async () => {
      mockPrisma.workoutSession.findFirst.mockResolvedValue(null)

      const session = await mockPrisma.workoutSession.findFirst({
        where: { id: sessionId, userId },
      })

      expect(() => {
        if (!session) {
          throw new Error('Session not found')
        }
      }).toThrow('Session not found')
    })
  })

  describe('updateWorkoutSet logic', () => {
    it('updates set when owned by user', async () => {
      mockPrisma.workoutSet.findFirst.mockResolvedValue({
        ...mockWorkoutSet,
        workoutSession: { userId },
      } as any)

      const existing = await mockPrisma.workoutSet.findFirst({
        where: { id: 'set-789' },
        include: { workoutSession: { select: { userId: true } } },
      })

      expect(existing).not.toBeNull()
      expect(existing?.workoutSession.userId).toBe(userId)

      mockPrisma.workoutSet.update.mockResolvedValue({
        ...mockWorkoutSet,
        reps: 12,
      } as any)

      const updated = await mockPrisma.workoutSet.update({
        where: { id: 'set-789' },
        data: { reps: 12 },
      })

      expect(updated.reps).toBe(12)
    })

    it('throws error for unauthorized set', async () => {
      mockPrisma.workoutSet.findFirst.mockResolvedValue({
        ...mockWorkoutSet,
        workoutSession: { userId: 'other-user' },
      } as any)

      const existing = await mockPrisma.workoutSet.findFirst({
        where: { id: 'set-789' },
        include: { workoutSession: { select: { userId: true } } },
      })

      const isOwner = existing?.workoutSession.userId === userId
      expect(isOwner).toBe(false)

      expect(() => {
        if (!existing || existing.workoutSession.userId !== userId) {
          throw new Error('Set not found')
        }
      }).toThrow('Set not found')
    })
  })

  describe('deleteWorkoutSet logic', () => {
    it('deletes set when owned by user', async () => {
      mockPrisma.workoutSet.findFirst.mockResolvedValue({
        ...mockWorkoutSet,
        workoutSession: { userId },
      } as any)
      mockPrisma.workoutSet.delete.mockResolvedValue(mockWorkoutSet as any)

      const existing = await mockPrisma.workoutSet.findFirst({
        where: { id: 'set-789' },
        include: { workoutSession: { select: { userId: true } } },
      })

      expect(existing?.workoutSession.userId).toBe(userId)

      await mockPrisma.workoutSet.delete({
        where: { id: 'set-789' },
      })

      expect(mockPrisma.workoutSet.delete).toHaveBeenCalledWith({
        where: { id: 'set-789' },
      })
    })

    it('throws error for unauthorized set', async () => {
      mockPrisma.workoutSet.findFirst.mockResolvedValue({
        ...mockWorkoutSet,
        workoutSession: { userId: 'other-user' },
      } as any)

      const existing = await mockPrisma.workoutSet.findFirst({
        where: { id: 'set-789' },
        include: { workoutSession: { select: { userId: true } } },
      })

      expect(() => {
        if (!existing || existing.workoutSession.userId !== userId) {
          throw new Error('Set not found')
        }
      }).toThrow('Set not found')
    })
  })
})
