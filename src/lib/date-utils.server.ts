import { prisma } from './db.server'
import { getWeekStart } from './date-utils'

/** Format a date as YYYY-MM-DD using local time (avoids UTC offset issues) */
export function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Calculate weekly workout streak for a user
 * A streak is counted in consecutive weeks where the user has at least one completed workout
 * The streak must include the current week or last week to be considered active
 * Optimized: Uses a single query with 52-week time window
 */
export async function calculateStreak(userId: string): Promise<number> {
  const today = new Date()
  const currentWeekStart = getWeekStart(today)

  // Fetch workouts from last 52 weeks in a single query (optimized)
  const oneYearAgo = new Date(currentWeekStart)
  oneYearAgo.setDate(oneYearAgo.getDate() - 52 * 7)

  const workouts = await prisma.workoutSession.findMany({
    where: {
      userId,
      completedAt: {
        gte: oneYearAgo,
        not: null,
      },
    },
    select: { completedAt: true },
  })

  if (workouts.length === 0) return 0

  // Get unique weeks (by week start date)
  const workoutWeeks = new Set<string>()
  for (const workout of workouts) {
    if (workout.completedAt) {
      const weekStart = getWeekStart(workout.completedAt)
      workoutWeeks.add(toDateString(weekStart))
    }
  }

  const uniqueWeeks = Array.from(workoutWeeks).sort().reverse()

  // Get current week and last week
  const lastWeekStart = new Date(currentWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

  const currentWeekStr = toDateString(currentWeekStart)
  const lastWeekStr = toDateString(lastWeekStart)

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
    const expectedStr = toDateString(expectedWeek)

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
