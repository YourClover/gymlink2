import { prisma } from './db'

/**
 * Get the start of a week (Monday) for a given date
 * Returns a new Date object set to midnight on Monday of that week
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  // Adjust to Monday (day 0 = Sunday, so we need to go back 6 days; day 1 = Monday, go back 0 days)
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return d
}

/**
 * Calculate weekly workout streak for a user
 * A streak is counted in consecutive weeks where the user has at least one completed workout
 * The streak must include the current week or last week to be considered active
 */
export async function calculateStreak(userId: string): Promise<number> {
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
