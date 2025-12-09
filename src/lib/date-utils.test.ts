import { describe, expect, it } from 'vitest'
import { getWeekStart } from './date-utils'

// Helper to get local date string (YYYY-MM-DD)
const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Note: calculateStreak requires database access and is tested via integration tests

describe('date-utils', () => {
  describe('getWeekStart', () => {
    it('returns Monday for a date on Monday', () => {
      // Jan 15, 2024 is a Monday
      const monday = new Date(2024, 0, 15, 12, 0, 0) // Monday
      const result = getWeekStart(monday)

      expect(result.getDay()).toBe(1) // Monday
      expect(getLocalDateString(result)).toBe('2024-01-15')
      expect(result.getHours()).toBe(0)
      expect(result.getMinutes()).toBe(0)
      expect(result.getSeconds()).toBe(0)
    })

    it('returns Monday for a date on Tuesday', () => {
      const tuesday = new Date(2024, 0, 16, 12, 0, 0) // Tuesday
      const result = getWeekStart(tuesday)

      expect(result.getDay()).toBe(1) // Monday
      expect(getLocalDateString(result)).toBe('2024-01-15')
    })

    it('returns Monday for a date on Sunday', () => {
      const sunday = new Date(2024, 0, 21, 12, 0, 0) // Sunday
      const result = getWeekStart(sunday)

      expect(result.getDay()).toBe(1) // Monday
      expect(getLocalDateString(result)).toBe('2024-01-15')
    })

    it('returns Monday for a date on Saturday', () => {
      const saturday = new Date(2024, 0, 20, 12, 0, 0) // Saturday
      const result = getWeekStart(saturday)

      expect(result.getDay()).toBe(1) // Monday
      expect(getLocalDateString(result)).toBe('2024-01-15')
    })

    it('returns Monday for a date on Wednesday', () => {
      const wednesday = new Date(2024, 0, 17, 12, 0, 0) // Wednesday
      const result = getWeekStart(wednesday)

      expect(result.getDay()).toBe(1) // Monday
      expect(getLocalDateString(result)).toBe('2024-01-15')
    })

    it('resets time to midnight', () => {
      const dateWithTime = new Date(2024, 0, 17, 15, 30, 45, 123)
      const result = getWeekStart(dateWithTime)

      expect(result.getHours()).toBe(0)
      expect(result.getMinutes()).toBe(0)
      expect(result.getSeconds()).toBe(0)
      expect(result.getMilliseconds()).toBe(0)
    })

    it('does not mutate the original date', () => {
      const original = new Date(2024, 0, 17, 15, 30, 45)
      const originalTime = original.getTime()

      getWeekStart(original)

      expect(original.getTime()).toBe(originalTime)
    })

    it('handles dates at the start of the year', () => {
      // Jan 2, 2024 is a Tuesday, so Monday is Jan 1
      const jan2 = new Date(2024, 0, 2, 12, 0, 0) // Tuesday
      const result = getWeekStart(jan2)

      expect(result.getDay()).toBe(1) // Monday
      expect(getLocalDateString(result)).toBe('2024-01-01')
    })

    it('handles dates that cross month boundaries', () => {
      // Feb 1, 2024 is a Thursday, so Monday is Jan 29
      const feb1 = new Date(2024, 1, 1, 12, 0, 0) // Thursday
      const result = getWeekStart(feb1)

      expect(result.getDay()).toBe(1) // Monday
      expect(getLocalDateString(result)).toBe('2024-01-29')
    })
  })
})
