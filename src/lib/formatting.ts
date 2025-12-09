/**
 * Shared formatting utilities for consistent display across the app
 */

/**
 * Format a date as a relative time or short date string
 * Examples: "Today", "Yesterday", "3 days ago", "Dec 5"
 */
export function formatRelativeDate(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Format a date with month, day, and optional year
 * Example: "December 5" or "December 5, 2024"
 */
export function formatFullDate(
  date: Date | string,
  includeYear = false,
): string {
  const d = new Date(date)
  const options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
  }
  if (includeYear) {
    options.year = 'numeric'
  }
  return d.toLocaleDateString('en-US', options)
}

/**
 * Format a duration in seconds to a human-readable string
 * Examples: "45m", "1h 30m", "2h 15m"
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

/**
 * Format elapsed time from a start date to now
 * Examples: "45 min", "1h 30m"
 */
export function formatElapsedTime(startedAt: Date | string): string {
  const start = new Date(startedAt)
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 60) {
    return `${diffMins} min`
  }
  const hours = Math.floor(diffMins / 60)
  return `${hours}h ${diffMins % 60}m`
}

/**
 * Format volume in kg to a readable string
 * Examples: "1,500", "2.5t" (for values >= 1000)
 */
export function formatVolume(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}t`
  }
  return kg.toLocaleString()
}

/**
 * Format time in seconds for display (MM:SS format)
 * Example: "1:30", "0:45"
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format weight with optional unit
 * Example: "100 kg", "225 lbs"
 */
export function formatWeight(weight: number, unit = 'kg'): string {
  return `${weight} ${unit}`
}
