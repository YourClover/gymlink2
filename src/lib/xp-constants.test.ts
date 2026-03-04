import { describe, expect, it } from 'vitest'
import {
  getLevelBarColor,
  getLevelColor,
  getLevelForXp,
  getXpProgress,
} from './xp-constants'

describe('getLevelForXp', () => {
  it('returns Newcomer for 0 XP', () => {
    expect(getLevelForXp(0)).toMatchObject({ level: 1, name: 'Newcomer' })
  })

  it('returns Newcomer for 499 XP', () => {
    expect(getLevelForXp(499)).toMatchObject({ level: 1, name: 'Newcomer' })
  })

  it('returns Beginner at exactly 500 XP', () => {
    expect(getLevelForXp(500)).toMatchObject({ level: 2, name: 'Beginner' })
  })

  it('returns Regular at 2000 XP', () => {
    expect(getLevelForXp(2_000)).toMatchObject({ level: 3, name: 'Regular' })
  })

  it('returns Mythic at 500000 XP', () => {
    expect(getLevelForXp(500_000)).toMatchObject({ level: 12, name: 'Mythic' })
  })

  it('returns Mythic for XP well above max threshold', () => {
    expect(getLevelForXp(1_000_000)).toMatchObject({
      level: 12,
      name: 'Mythic',
    })
  })

  it('returns correct level at each boundary', () => {
    const boundaries = [
      { xp: 0, level: 1 },
      { xp: 500, level: 2 },
      { xp: 2_000, level: 3 },
      { xp: 5_000, level: 4 },
      { xp: 10_000, level: 5 },
      { xp: 20_000, level: 6 },
      { xp: 35_000, level: 7 },
      { xp: 60_000, level: 8 },
      { xp: 100_000, level: 9 },
      { xp: 150_000, level: 10 },
      { xp: 250_000, level: 11 },
      { xp: 500_000, level: 12 },
    ]
    for (const { xp, level } of boundaries) {
      expect(getLevelForXp(xp).level).toBe(level)
    }
  })

  it('returns previous level one XP below each boundary', () => {
    const boundaries = [
      { xp: 499, level: 1 },
      { xp: 1_999, level: 2 },
      { xp: 4_999, level: 3 },
      { xp: 9_999, level: 4 },
      { xp: 19_999, level: 5 },
      { xp: 34_999, level: 6 },
      { xp: 59_999, level: 7 },
      { xp: 99_999, level: 8 },
      { xp: 149_999, level: 9 },
      { xp: 249_999, level: 10 },
      { xp: 499_999, level: 11 },
    ]
    for (const { xp, level } of boundaries) {
      expect(getLevelForXp(xp).level).toBe(level)
    }
  })
})

describe('getXpProgress', () => {
  it('returns 0% progress at level start', () => {
    const progress = getXpProgress(500)
    expect(progress.currentLevel.level).toBe(2)
    expect(progress.nextLevel?.level).toBe(3)
    expect(progress.xpIntoLevel).toBe(0)
    expect(progress.xpNeededForNext).toBe(1_500)
    expect(progress.percent).toBe(0)
  })

  it('returns 50% progress midway through a level', () => {
    // Level 2 is 500-2000, midpoint is 1250
    const progress = getXpProgress(1_250)
    expect(progress.currentLevel.level).toBe(2)
    expect(progress.xpIntoLevel).toBe(750)
    expect(progress.xpNeededForNext).toBe(1_500)
    expect(progress.percent).toBe(50)
  })

  it('returns 100% for max level', () => {
    const progress = getXpProgress(500_000)
    expect(progress.currentLevel.level).toBe(12)
    expect(progress.nextLevel).toBeNull()
    expect(progress.percent).toBe(100)
  })

  it('returns 100% for max level with excess XP', () => {
    const progress = getXpProgress(1_000_000)
    expect(progress.currentLevel.level).toBe(12)
    expect(progress.nextLevel).toBeNull()
    expect(progress.percent).toBe(100)
  })

  it('returns correct values at 0 XP', () => {
    const progress = getXpProgress(0)
    expect(progress.currentLevel.level).toBe(1)
    expect(progress.nextLevel?.level).toBe(2)
    expect(progress.xpIntoLevel).toBe(0)
    expect(progress.xpNeededForNext).toBe(500)
    expect(progress.percent).toBe(0)
  })

  it('caps percent at 100', () => {
    // At max level, should be exactly 100
    const progress = getXpProgress(999_999)
    expect(progress.percent).toBe(100)
  })
})

describe('getLevelColor', () => {
  it('returns { text, bg } object shape', () => {
    const result = getLevelColor(1)
    expect(result).toHaveProperty('text')
    expect(result).toHaveProperty('bg')
    expect(typeof result.text).toBe('string')
    expect(typeof result.bg).toBe('string')
  })

  it('returns zinc for levels 1-3', () => {
    for (const level of [1, 2, 3]) {
      const result = getLevelColor(level)
      expect(result.text).toBe('text-zinc-400')
      expect(result.bg).toBe('bg-zinc-700/50')
    }
  })

  it('returns emerald for levels 4-5', () => {
    for (const level of [4, 5]) {
      const result = getLevelColor(level)
      expect(result.text).toBe('text-emerald-400')
      expect(result.bg).toBe('bg-emerald-500/20')
    }
  })

  it('returns blue for levels 6-7', () => {
    for (const level of [6, 7]) {
      const result = getLevelColor(level)
      expect(result.text).toBe('text-blue-400')
      expect(result.bg).toBe('bg-blue-500/20')
    }
  })

  it('returns purple for levels 8-9', () => {
    for (const level of [8, 9]) {
      const result = getLevelColor(level)
      expect(result.text).toBe('text-purple-400')
      expect(result.bg).toBe('bg-purple-500/20')
    }
  })

  it('returns amber for levels 10+', () => {
    for (const level of [10, 11, 12]) {
      const result = getLevelColor(level)
      expect(result.text).toBe('text-amber-400')
      expect(result.bg).toBe('bg-amber-500/20')
    }
  })
})

describe('getLevelBarColor', () => {
  it('returns a string', () => {
    expect(typeof getLevelBarColor(1)).toBe('string')
  })

  it('returns bg-zinc-400 for levels 1-3', () => {
    for (const level of [1, 2, 3]) {
      expect(getLevelBarColor(level)).toBe('bg-zinc-400')
    }
  })

  it('returns bg-emerald-500 for levels 4-5', () => {
    for (const level of [4, 5]) {
      expect(getLevelBarColor(level)).toBe('bg-emerald-500')
    }
  })

  it('returns bg-blue-500 for levels 6-7', () => {
    for (const level of [6, 7]) {
      expect(getLevelBarColor(level)).toBe('bg-blue-500')
    }
  })

  it('returns bg-purple-500 for levels 8-9', () => {
    for (const level of [8, 9]) {
      expect(getLevelBarColor(level)).toBe('bg-purple-500')
    }
  })

  it('returns bg-amber-500 for levels 10+', () => {
    for (const level of [10, 11, 12]) {
      expect(getLevelBarColor(level)).toBe('bg-amber-500')
    }
  })
})
