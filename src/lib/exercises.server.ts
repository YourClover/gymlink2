import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db'
import type { Equipment, ExerciseType, MuscleGroup  } from '@prisma/client'

// Get exercises with optional filtering
export const getExercises = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      muscleGroup?: MuscleGroup
      equipment?: Equipment
      exerciseType?: ExerciseType
      search?: string
      userId?: string
      includeBuiltIn?: boolean
    }) => data,
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
    })

    return { exercises }
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
      userId: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const {
      userId,
      exerciseType = 'STRENGTH' as ExerciseType,
      isTimed = false,
      ...rest
    } = data

    // Verify admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    })
    if (!user?.isAdmin) {
      throw new Error('Admin access required')
    }

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
  .inputValidator((data: { id: string; userId: string }) => data)
  .handler(async ({ data }) => {
    const { id, userId } = data

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
      userId: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const { id, userId, ...updateData } = data

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
