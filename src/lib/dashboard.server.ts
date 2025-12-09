import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db'

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

// Helper function to calculate workout streak
async function calculateStreak(userId: string): Promise<number> {
  // Get all completed workout dates, newest first
  const workouts = await prisma.workoutSession.findMany({
    where: {
      userId,
      completedAt: { not: null },
    },
    select: {
      completedAt: true,
    },
    orderBy: {
      completedAt: 'desc',
    },
  })

  if (workouts.length === 0) return 0

  // Get unique dates (normalize to date only)
  const workoutDates = new Set<string>()
  for (const workout of workouts) {
    if (workout.completedAt) {
      const dateStr = workout.completedAt.toISOString().split('T')[0]
      workoutDates.add(dateStr)
    }
  }

  const uniqueDates = Array.from(workoutDates).sort().reverse()

  // Check if there's a workout today or yesterday to start counting
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const todayStr = today.toISOString().split('T')[0]
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  // Streak must start from today or yesterday
  if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
    return 0
  }

  // Count consecutive days
  let streak = 0
  const expectedDate = uniqueDates[0] === todayStr ? today : yesterday

  for (const dateStr of uniqueDates) {
    const expectedStr = expectedDate.toISOString().split('T')[0]

    if (dateStr === expectedStr) {
      streak++
      expectedDate.setDate(expectedDate.getDate() - 1)
    } else if (dateStr < expectedStr) {
      // Gap in dates, streak broken
      break
    }
    // If dateStr > expectedStr, skip (shouldn't happen with sorted desc)
  }

  return streak
}

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
