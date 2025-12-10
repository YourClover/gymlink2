// Progression calculation utilities

export type ProgressionMetric =
  | 'max_weight'
  | 'estimated_1rm'
  | 'volume'
  | 'max_time'
  | 'max_reps'

/**
 * Calculate estimated 1RM using Epley formula
 * Formula: weight * (1 + reps/30)
 */
export function calculate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30))
}

/**
 * Calculate volume for a set
 * Volume = weight * reps (or weight * time for timed exercises)
 */
export function calculateVolume(
  weight: number | null,
  reps: number | null,
  timeSeconds: number | null,
): number {
  if (weight && reps) {
    return weight * reps
  }
  if (weight && timeSeconds) {
    return weight * timeSeconds
  }
  return 0
}

/**
 * Calculate metric value for a set based on metric type
 */
export function calculateMetricValue(
  set: {
    weight: number | null
    reps: number | null
    timeSeconds: number | null
  },
  metric: ProgressionMetric,
): number {
  switch (metric) {
    case 'max_weight':
      return set.weight ?? 0
    case 'estimated_1rm':
      if (set.weight && set.reps) {
        return calculate1RM(set.weight, set.reps)
      }
      return 0
    case 'volume':
      return calculateVolume(set.weight, set.reps, set.timeSeconds)
    case 'max_time':
      return set.timeSeconds ?? 0
    case 'max_reps':
      return set.reps ?? 0
    default:
      return 0
  }
}

/**
 * Get available metrics for an exercise based on its type
 */
export function getAvailableMetrics(isTimed: boolean): Array<{
  value: ProgressionMetric
  label: string
}> {
  if (isTimed) {
    return [
      { value: 'max_time', label: 'Duration' },
      { value: 'volume', label: 'Weighted Duration' },
    ]
  }

  return [
    { value: 'max_weight', label: 'Max Weight' },
    { value: 'estimated_1rm', label: 'Est. 1RM' },
    { value: 'volume', label: 'Volume' },
    { value: 'max_reps', label: 'Max Reps' },
  ]
}

/**
 * Format metric value for display
 */
export function formatMetricValue(
  value: number,
  metric: ProgressionMetric,
): string {
  switch (metric) {
    case 'max_weight':
    case 'estimated_1rm':
      return `${value}kg`
    case 'volume':
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}t`
      }
      return `${value}kg`
    case 'max_time': {
      const mins = Math.floor(value / 60)
      const secs = value % 60
      if (mins > 0) {
        return `${mins}:${secs.toString().padStart(2, '0')}`
      }
      return `${secs}s`
    }
    case 'max_reps':
      return `${value} reps`
    default:
      return `${value}`
  }
}

/**
 * Get metric label for Y-axis
 */
export function getMetricAxisLabel(metric: ProgressionMetric): string {
  switch (metric) {
    case 'max_weight':
    case 'estimated_1rm':
      return 'Weight (kg)'
    case 'volume':
      return 'Volume (kg)'
    case 'max_time':
      return 'Time (sec)'
    case 'max_reps':
      return 'Reps'
    default:
      return 'Value'
  }
}

/**
 * Calculate improvement percentage between first and last value
 */
export function calculateImprovement(
  firstValue: number,
  lastValue: number,
): number | null {
  if (firstValue <= 0) return null
  return Math.round(((lastValue - firstValue) / firstValue) * 100)
}
