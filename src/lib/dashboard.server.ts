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

// Helper function to get the start of a week (Monday) for a given date
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  // Adjust to Monday (day 0 = Sunday, so we need to go back 6 days; day 1 = Monday, go back 0 days)
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return d
}

// Helper function to calculate weekly workout streak
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

  // Get unique weeks (by week start date)
  const workoutWeeks = new Set<string>()
  for (const workout of workouts) {
    if (workout.completedAt) {
      const weekStart = getWeekStart(workout.completedAt)
      workoutWeeks.add(weekStart.toISOString().split('T')[0])
    }
  }

  const uniqueWeeks = Array.from(workoutWeeks).sort().reverse()

  // Get current week and last week
  const today = new Date()
  const currentWeekStart = getWeekStart(today)
  const lastWeekStart = new Date(currentWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

  const currentWeekStr = currentWeekStart.toISOString().split('T')[0]
  const lastWeekStr = lastWeekStart.toISOString().split('T')[0]

  // Streak must include current week or last week
  if (uniqueWeeks[0] !== currentWeekStr && uniqueWeeks[0] !== lastWeekStr) {
    return 0
  }

  // Count consecutive weeks
  let streak = 0
  const expectedWeek = new Date(
    uniqueWeeks[0] === currentWeekStr ? currentWeekStart : lastWeekStart,
  )

  for (const weekStr of uniqueWeeks) {
    const expectedStr = expectedWeek.toISOString().split('T')[0]

    if (weekStr === expectedStr) {
      streak++
      expectedWeek.setDate(expectedWeek.getDate() - 7)
    } else if (weekStr < expectedStr) {
      // Gap in weeks, streak broken
      break
    }
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
