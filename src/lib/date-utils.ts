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
