import { prisma } from './db.server'

/**
 * Calculate total volume (weight * reps) for a user.
 * Shared across dashboard, achievements, and profile stats.
 */
export async function getTotalVolume(userId: string): Promise<number> {
  const result = await prisma.$queryRaw<[{ total: number | null }]>`
    SELECT COALESCE(SUM(ws.weight * ws.reps), 0) AS total
    FROM workout_sets ws
    JOIN workout_sessions s ON s.id = ws.workout_session_id
    WHERE s.user_id = ${userId}
      AND s.completed_at IS NOT NULL
      AND ws.is_warmup = false
      AND ws.weight IS NOT NULL
      AND ws.reps IS NOT NULL
  `
  return Number(result[0].total)
}

/**
 * Calculate weekly volume for a user since a given date.
 * Used by dashboard stats.
 */
export async function getWeeklyVolume(
  userId: string,
  since: Date,
): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ volume: bigint | null }>>`
    SELECT SUM(wset.weight * wset.reps) as volume
    FROM "workout_sets" wset
    JOIN "workout_sessions" ws ON wset."workout_session_id" = ws.id
    WHERE ws."user_id" = ${userId}
      AND ws."completed_at" >= ${since}
      AND wset."is_warmup" = false
      AND wset."is_dropset" = false
      AND wset.weight IS NOT NULL
      AND wset.reps IS NOT NULL
  `
  return Number(result[0]?.volume ?? 0)
}
