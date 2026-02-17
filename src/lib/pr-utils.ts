import { RecordType } from '@prisma/client'

/**
 * Internal base score for bodyweight exercises. When equipment is BODYWEIGHT,
 * we treat every set as (BODYWEIGHT_BASE_SCORE + addedWeight) × reps/time
 * so weighted and unweighted sets compete on the same MAX_VOLUME scale.
 * This value is never shown to the user.
 */
export const BODYWEIGHT_BASE_SCORE = 60

/**
 * PR display priority: lower number = higher priority.
 * MAX_VOLUME (weighted sets) is most impressive, MAX_WEIGHT least.
 * MAX_TIME and MAX_REPS share the same tier (bodyweight equivalents).
 */
export const PR_PRIORITY: Record<RecordType, number> = {
  [RecordType.MAX_VOLUME]: 0,
  [RecordType.MAX_TIME]: 1,
  [RecordType.MAX_REPS]: 1,
  [RecordType.MAX_WEIGHT]: 2,
}

type PRRecord = {
  recordType: RecordType
  value: number
  achievedAt: Date | string
}

/**
 * From a list of PRs for the same exercise, pick the one to display.
 * Priority: MAX_VOLUME > MAX_TIME = MAX_REPS > MAX_WEIGHT.
 * Tiebreak: higher value, then more recent achievedAt.
 */
export function selectDisplayPR<T extends PRRecord>(prs: Array<T>): T | null {
  if (prs.length === 0) return null
  if (prs.length === 1) return prs[0]

  return prs.reduce((best, current) => {
    const bestPriority = PR_PRIORITY[best.recordType]
    const currentPriority = PR_PRIORITY[current.recordType]

    if (currentPriority < bestPriority) return current
    if (currentPriority > bestPriority) return best

    // Same priority tier — prefer higher value
    if (current.value > best.value) return current
    if (current.value < best.value) return best

    // Same value — prefer more recent
    const bestDate = new Date(best.achievedAt).getTime()
    const currentDate = new Date(current.achievedAt).getTime()
    return currentDate > bestDate ? current : best
  })
}

/**
 * Returns true if `newType` is dominated by (lower priority than) any type
 * already in `existingTypes`. Used to suppress celebration for lesser PRs
 * when a more impressive PR type already exists.
 */
export function isDominatedByExistingPR(
  newType: RecordType,
  existingTypes: Array<RecordType>,
): boolean {
  const newPriority = PR_PRIORITY[newType]
  return existingTypes.some((t) => PR_PRIORITY[t] < newPriority)
}
