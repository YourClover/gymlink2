import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db.server'
import { requireAdmin, requireAuth } from './auth-guard.server'
import {
  validateDescription,
  validateInstructions,
  validateNameLength,
} from './validation'
import { rateLimit } from './rate-limit.server'
import type { Equipment, ExerciseType, MuscleGroup } from '@prisma/client'

// Get exercises with optional filtering and cursor pagination
export const getExercises = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      muscleGroup?: MuscleGroup
      equipment?: Equipment
      exerciseType?: ExerciseType
      search?: string
      userId?: string
      includeBuiltIn?: boolean
      cursor?: string
      limit?: number
    }) => {
      if (data.limit !== undefined && (data.limit < 1 || data.limit > 100)) {
        throw new Error('limit must be between 1 and 100')
      }
      return data
    },
  )
  .handler(async ({ data }) => {
    const {
      muscleGroup,
      equipment,
      exerciseType,
      search,
      // userId and includeBuiltIn kept for API compatibility but not used
      // since all exercises are now globally available
    } = data

    const limit = data.limit ?? 50

    const where: {
      muscleGroup?: MuscleGroup
      equipment?: Equipment
      exerciseType?: ExerciseType
      name?: { contains: string; mode: 'insensitive' }
    } = {}

    if (muscleGroup) where.muscleGroup = muscleGroup
    if (equipment) where.equipment = equipment
    if (exerciseType) where.exerciseType = exerciseType
    if (search) where.name = { contains: search, mode: 'insensitive' }

    // Show all exercises (built-in + all custom) - custom exercises are globally available
    // No user filtering needed - everyone can see all exercises

    const exercises = await prisma.exercise.findMany({
      where,
      orderBy: [{ muscleGroup: 'asc' }, { name: 'asc' }],
      take: limit + 1,
      ...(data.cursor && { cursor: { id: data.cursor }, skip: 1 }),
    })

    const hasMore = exercises.length > limit
    if (hasMore) exercises.pop()

    return {
      exercises,
      nextCursor: hasMore ? exercises[exercises.length - 1].id : null,
    }
  })

// Get a single exercise by ID
export const getExercise = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string; userId?: string }) => data)
  .handler(async ({ data }) => {
    const exercise = await prisma.exercise.findUnique({
      where: { id: data.id },
    })

    // All exercises (built-in and custom) are viewable by everyone

    return { exercise }
  })

// Create a custom exercise (admin only)
export const createExercise = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      name: string
      description?: string
      muscleGroup: MuscleGroup
      equipment: Equipment
      exerciseType?: ExerciseType
      isTimed?: boolean
      instructions?: string
      token: string | null
    }) => data,
  )
  .handler(async ({ data }) => {
    rateLimit({ key: 'create-exercise', limit: 20, windowMs: 60_000 })
    validateNameLength(data.name)
    validateDescription(data.description)
    validateInstructions(data.instructions)
    const { userId } = await requireAdmin(data.token)
    const {
      token: _,
      exerciseType = 'STRENGTH' as ExerciseType,
      isTimed = false,
      ...rest
    } = data

    const exercise = await prisma.exercise.create({
      data: {
        ...rest,
        exerciseType,
        isTimed,
        isCustom: true,
        userId,
      },
    })

    return { exercise }
  })

// Delete a custom exercise (only owner can delete)
export const deleteExercise = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; token: string | null }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)
    const id = data.id

    // Verify ownership
    const exercise = await prisma.exercise.findUnique({
      where: { id },
      select: { userId: true, isCustom: true },
    })

    if (!exercise) {
      throw new Error('Exercise not found')
    }

    if (!exercise.isCustom) {
      throw new Error('Cannot delete built-in exercises')
    }

    if (exercise.userId !== userId) {
      throw new Error('Not authorized to delete this exercise')
    }

    await prisma.exercise.delete({
      where: { id },
    })

    return { success: true }
  })

// Update a custom exercise (only owner can update)
export const updateExercise = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: string
      name?: string
      description?: string
      muscleGroup?: MuscleGroup
      equipment?: Equipment
      exerciseType?: ExerciseType
      isTimed?: boolean
      instructions?: string
      token: string | null
    }) => data,
  )
  .handler(async ({ data }) => {
    rateLimit({ key: 'update-exercise', limit: 20, windowMs: 60_000 })
    if (data.name) validateNameLength(data.name)
    validateDescription(data.description)
    validateInstructions(data.instructions)
    const { userId } = await requireAuth(data.token)
    const { id, token: _, ...updateData } = data

    // Verify ownership and that it's a custom exercise
    const existing = await prisma.exercise.findUnique({
      where: { id },
      select: { userId: true, isCustom: true },
    })

    if (!existing) {
      throw new Error('Exercise not found')
    }

    if (!existing.isCustom) {
      throw new Error('Cannot edit built-in exercises')
    }

    if (existing.userId !== userId) {
      throw new Error('Not authorized to edit this exercise')
    }

    const exercise = await prisma.exercise.update({
      where: { id },
      data: updateData,
    })

    return { exercise }
  })
