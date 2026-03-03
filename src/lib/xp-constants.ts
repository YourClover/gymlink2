export const XP_VALUES = {
  WORKOUT_COMPLETE: 100,
  SET_LOGGED: 5,
  PR_ACHIEVED: 50,
  RPE_LOGGED: 2,
  STREAK_BONUS: 20,
  CHALLENGE_COMPLETE: 150,
  ACHIEVEMENT_EARNED: 75,
  FIRST_WORKOUT_OF_WEEK: 50,
  NEW_EXERCISE: 25,
} as const

export const LEVELS = [
  { level: 1, name: 'Newcomer', xpRequired: 0 },
  { level: 2, name: 'Beginner', xpRequired: 500 },
  { level: 3, name: 'Regular', xpRequired: 2_000 },
  { level: 4, name: 'Dedicated', xpRequired: 5_000 },
  { level: 5, name: 'Athlete', xpRequired: 10_000 },
  { level: 6, name: 'Warrior', xpRequired: 20_000 },
  { level: 7, name: 'Veteran', xpRequired: 35_000 },
  { level: 8, name: 'Elite', xpRequired: 60_000 },
  { level: 9, name: 'Champion', xpRequired: 100_000 },
  { level: 10, name: 'Titan', xpRequired: 150_000 },
  { level: 11, name: 'Legend', xpRequired: 250_000 },
  { level: 12, name: 'Mythic', xpRequired: 500_000 },
] as const

export type LevelInfo = (typeof LEVELS)[number]

/** Get the level info for a given total XP amount */
export function getLevelForXp(totalXp: number): LevelInfo {
  let result = LEVELS[0]
  for (const level of LEVELS) {
    if (totalXp >= level.xpRequired) {
      result = level
    } else {
      break
    }
  }
  return result
}

/** Get XP progress toward the next level */
export function getXpProgress(totalXp: number): {
  currentLevel: LevelInfo
  nextLevel: LevelInfo | null
  xpIntoLevel: number
  xpNeededForNext: number
  percent: number
} {
  const currentLevel = getLevelForXp(totalXp)
  const currentIndex = LEVELS.findIndex((l) => l.level === currentLevel.level)
  const nextLevel =
    currentIndex < LEVELS.length - 1 ? LEVELS[currentIndex + 1] : null

  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel: null,
      xpIntoLevel: totalXp - currentLevel.xpRequired,
      xpNeededForNext: 0,
      percent: 100,
    }
  }

  const xpIntoLevel = totalXp - currentLevel.xpRequired
  const xpNeededForNext = nextLevel.xpRequired - currentLevel.xpRequired
  const percent = Math.min(
    100,
    Math.floor((xpIntoLevel / xpNeededForNext) * 100),
  )

  return {
    currentLevel,
    nextLevel,
    xpIntoLevel,
    xpNeededForNext,
    percent,
  }
}

/** Get the color classes for a level tier */
export function getLevelColor(level: number): string {
  if (level <= 3) return 'text-zinc-400 bg-zinc-700/50'
  if (level <= 5) return 'text-emerald-400 bg-emerald-500/20'
  if (level <= 7) return 'text-blue-400 bg-blue-500/20'
  if (level <= 9) return 'text-purple-400 bg-purple-500/20'
  return 'text-amber-400 bg-amber-500/20'
}
