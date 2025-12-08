import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db'
import { MuscleGroup, Equipment, ExerciseType } from '@prisma/client'

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
    const { muscleGroup, equipment, exerciseType, search, userId, includeBuiltIn = true } = data

    const where: {
      muscleGroup?: MuscleGroup
      equipment?: Equipment
      exerciseType?: ExerciseType
      name?: { contains: string; mode: 'insensitive' }
      OR?: Array<{ isCustom: boolean; userId?: string | null }>
    } = {}

    if (muscleGroup) where.muscleGroup = muscleGroup
    if (equipment) where.equipment = equipment
    if (exerciseType) where.exerciseType = exerciseType
    if (search) where.name = { contains: search, mode: 'insensitive' }

    // Filter by ownership: built-in exercises OR user's custom exercises
    if (userId) {
      where.OR = [
        { isCustom: false }, // Built-in exercises
        { isCustom: true, userId }, // User's custom exercises
      ]
    } else if (includeBuiltIn) {
      where.OR = [{ isCustom: false }]
    }

    const exercises = await prisma.exercise.findMany({
      where,
      orderBy: [{ muscleGroup: 'asc' }, { name: 'asc' }],
    })

    return { exercises }
  })

// Get a single exercise by ID
export const getExercise = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const exercise = await prisma.exercise.findUnique({
      where: { id: data.id },
    })

    return { exercise }
  })

// Create a custom exercise
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
    const { userId, exerciseType = ExerciseType.STRENGTH, isTimed = false, ...rest } = data

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
