import { describe, expect, it } from 'vitest'
import { RecordType } from '@prisma/client'
import {
  BODYWEIGHT_BASE_SCORE,
  PR_PRIORITY,
  isDominatedByExistingPR,
  selectDisplayPR,
} from './pr-utils'

describe('BODYWEIGHT_BASE_SCORE', () => {
  it('exports a constant equal to 60', () => {
    expect(BODYWEIGHT_BASE_SCORE).toBe(60)
  })
})

describe('PR_PRIORITY', () => {
  it('ranks MAX_VOLUME as highest priority (0)', () => {
    expect(PR_PRIORITY[RecordType.MAX_VOLUME]).toBe(0)
  })

  it('ranks MAX_TIME and MAX_REPS equally (1)', () => {
    expect(PR_PRIORITY[RecordType.MAX_TIME]).toBe(1)
    expect(PR_PRIORITY[RecordType.MAX_REPS]).toBe(1)
  })

  it('ranks MAX_WEIGHT as lowest priority (2)', () => {
    expect(PR_PRIORITY[RecordType.MAX_WEIGHT]).toBe(2)
  })
})

describe('selectDisplayPR', () => {
  const makePR = (
    recordType: RecordType,
    value: number,
    achievedAt = '2026-01-15T00:00:00Z',
  ) => ({ recordType, value, achievedAt: new Date(achievedAt) })

  it('returns null for empty array', () => {
    expect(selectDisplayPR([])).toBeNull()
  })

  it('returns the only PR when array has one element', () => {
    const pr = makePR(RecordType.MAX_REPS, 15)
    expect(selectDisplayPR([pr])).toBe(pr)
  })

  it('picks MAX_VOLUME over MAX_REPS', () => {
    const volume = makePR(RecordType.MAX_VOLUME, 1000)
    const reps = makePR(RecordType.MAX_REPS, 24)
    expect(selectDisplayPR([reps, volume])?.recordType).toBe(
      RecordType.MAX_VOLUME,
    )
  })

  it('picks MAX_VOLUME over MAX_WEIGHT', () => {
    const volume = makePR(RecordType.MAX_VOLUME, 500)
    const weight = makePR(RecordType.MAX_WEIGHT, 100)
    expect(selectDisplayPR([weight, volume])?.recordType).toBe(
      RecordType.MAX_VOLUME,
    )
  })

  it('picks MAX_REPS over MAX_WEIGHT', () => {
    const reps = makePR(RecordType.MAX_REPS, 20)
    const weight = makePR(RecordType.MAX_WEIGHT, 80)
    expect(selectDisplayPR([weight, reps])?.recordType).toBe(
      RecordType.MAX_REPS,
    )
  })

  it('picks MAX_TIME over MAX_WEIGHT', () => {
    const time = makePR(RecordType.MAX_TIME, 120)
    const weight = makePR(RecordType.MAX_WEIGHT, 80)
    expect(selectDisplayPR([weight, time])?.recordType).toBe(
      RecordType.MAX_TIME,
    )
  })

  it('breaks ties in same priority tier by higher value', () => {
    const reps = makePR(RecordType.MAX_REPS, 20)
    const time = makePR(RecordType.MAX_TIME, 120)
    expect(selectDisplayPR([reps, time])?.value).toBe(120)
  })

  it('breaks value ties by more recent achievedAt', () => {
    const older = makePR(RecordType.MAX_REPS, 20, '2026-01-01T00:00:00Z')
    const newer = makePR(RecordType.MAX_TIME, 20, '2026-02-01T00:00:00Z')
    expect(selectDisplayPR([older, newer])?.achievedAt).toEqual(
      new Date('2026-02-01T00:00:00Z'),
    )
  })

  it('handles the ab crunch scenario: MAX_VOLUME(1000) vs MAX_REPS(24)', () => {
    const volume = makePR(RecordType.MAX_VOLUME, 1000)
    const reps = makePR(RecordType.MAX_REPS, 24)
    const result = selectDisplayPR([reps, volume])
    expect(result?.recordType).toBe(RecordType.MAX_VOLUME)
    expect(result?.value).toBe(1000)
  })
})

describe('isDominatedByExistingPR', () => {
  it('returns true when MAX_REPS is dominated by existing MAX_VOLUME', () => {
    expect(
      isDominatedByExistingPR(RecordType.MAX_REPS, [RecordType.MAX_VOLUME]),
    ).toBe(true)
  })

  it('returns true when MAX_WEIGHT is dominated by existing MAX_VOLUME', () => {
    expect(
      isDominatedByExistingPR(RecordType.MAX_WEIGHT, [RecordType.MAX_VOLUME]),
    ).toBe(true)
  })

  it('returns true when MAX_WEIGHT is dominated by existing MAX_REPS', () => {
    expect(
      isDominatedByExistingPR(RecordType.MAX_WEIGHT, [RecordType.MAX_REPS]),
    ).toBe(true)
  })

  it('returns false when MAX_VOLUME has no dominator', () => {
    expect(
      isDominatedByExistingPR(RecordType.MAX_VOLUME, [
        RecordType.MAX_REPS,
        RecordType.MAX_WEIGHT,
      ]),
    ).toBe(false)
  })

  it('returns false when same-tier types exist (MAX_REPS with MAX_TIME)', () => {
    expect(
      isDominatedByExistingPR(RecordType.MAX_REPS, [RecordType.MAX_TIME]),
    ).toBe(false)
  })

  it('returns false when no existing types', () => {
    expect(isDominatedByExistingPR(RecordType.MAX_REPS, [])).toBe(false)
  })

  it('returns true for ab crunch scenario: bodyweight MAX_REPS with weighted MAX_VOLUME existing', () => {
    expect(
      isDominatedByExistingPR(RecordType.MAX_REPS, [
        RecordType.MAX_VOLUME,
        RecordType.MAX_WEIGHT,
      ]),
    ).toBe(true)
  })
})
