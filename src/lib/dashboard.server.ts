import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db'
import { calculateStreak } from './date-utils'

// ============================================
// DASHBOARD STATS
// ============================================

export const getDashboardStats = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    // Calculate week boundaries (Monday to Sunday)
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() + mondayOffset)
    weekStart.setHours(0, 0, 0, 0)

    // Get workouts completed this week
    const workoutsThisWeek = await prisma.workoutSession.findMany({
      where: {
        userId: data.userId,
        completedAt: {
          gte: weekStart,
        },
      },
      include: {
        workoutSets: {
          select: {
            weight: true,
            reps: true,
            isWarmup: true,
          },
        },
      },
    })

    // Calculate total volume (weight × reps for working sets)
    let totalVolumeThisWeek = 0
    for (const workout of workoutsThisWeek) {
      for (const set of workout.workoutSets) {
        if (!set.isWarmup && set.weight && set.reps) {
          totalVolumeThisWeek += set.weight * set.reps
        }
      }
    }

    // Calculate streak
    const currentStreak = await calculateStreak(data.userId)

    // Count PRs this week
    const prsThisWeek = await prisma.personalRecord.count({
      where: {
        userId: data.userId,
        achievedAt: {
          gte: weekStart,
        },
      },
    })

    return {
      stats: {
        workoutsThisWeek: workoutsThisWeek.length,
        totalVolumeThisWeek,
        currentStreak,
        prsThisWeek,
      },
    }
  })

// ============================================
// WORKOUT SUGGESTION
// ============================================

export const getNextWorkoutSuggestion = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    // Find active plan
    const activePlan = await prisma.workoutPlan.findFirst({
      where: {
        userId: data.userId,
        isActive: true,
      },
      include: {
        planDays: {
          orderBy: { dayOrder: 'asc' },
          include: {
            planExercises: {
              orderBy: { exerciseOrder: 'asc' },
              take: 3, // Only need first 3 for preview
              include: {
                exercise: {
                  select: {
                    id: true,
                    name: true,
                    muscleGroup: true,
                  },
                },
              },
            },
            _count: {
              select: { planExercises: true },
            },
          },
        },
      },
    })

    if (!activePlan || activePlan.planDays.length === 0) {
      return { suggestion: null }
    }

    // Get non-rest days only
    const workoutDays = activePlan.planDays.filter((d) => !d.restDay)

    if (workoutDays.length === 0) {
      return { suggestion: null }
    }

    // Find last completed workout for this plan
    const lastWorkout = await prisma.workoutSession.findFirst({
      where: {
        userId: data.userId,
        workoutPlanId: activePlan.id,
        completedAt: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      select: {
        planDayId: true,
        planDay: {
          select: { dayOrder: true },
        },
      },
    })

    let nextDay = workoutDays[0] // Default to first workout day

    if (lastWorkout?.planDay) {
      // Find next day in sequence
      const lastDayOrder = lastWorkout.planDay.dayOrder
      const nextDayIndex = workoutDays.findIndex(
        (d) => d.dayOrder > lastDayOrder,
      )

      if (nextDayIndex !== -1) {
        nextDay = workoutDays[nextDayIndex]
      } else {
        // Wrap around to first workout day
        nextDay = workoutDays[0]
      }
    }

    return {
      suggestion: {
        planId: activePlan.id,
        planName: activePlan.name,
        dayId: nextDay.id,
        dayName: nextDay.name,
        dayOrder: nextDay.dayOrder,
        exerciseCount: nextDay._count.planExercises,
        exercises: nextDay.planExercises.map((pe) => ({
          id: pe.exercise.id,
          name: pe.exercise.name,
          muscleGroup: pe.exercise.muscleGroup,
        })),
      },
    }
  })
