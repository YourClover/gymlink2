import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  formatDuration,
  formatElapsedTime,
  formatFullDate,
  formatRelativeDate,
  formatTime,
  formatVolume,
  formatWeight,
} from './formatting'

describe('formatting utilities', () => {
  describe('formatRelativeDate', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns "Today" for today', () => {
      const now = new Date('2024-01-15T12:00:00')
      vi.setSystemTime(now)

      expect(formatRelativeDate(now)).toBe('Today')
    })

    it('returns "Yesterday" for yesterday', () => {
      const now = new Date('2024-01-15T12:00:00')
      vi.setSystemTime(now)

      const yesterday = new Date('2024-01-14T12:00:00')
      expect(formatRelativeDate(yesterday)).toBe('Yesterday')
    })

    it('returns "X days ago" for dates within a week', () => {
      const now = new Date('2024-01-15T12:00:00')
      vi.setSystemTime(now)

      const threeDaysAgo = new Date('2024-01-12T12:00:00')
      expect(formatRelativeDate(threeDaysAgo)).toBe('3 days ago')
    })

    it('returns formatted date for dates over a week ago', () => {
      const now = new Date('2024-01-15T12:00:00')
      vi.setSystemTime(now)

      const twoWeeksAgo = new Date('2024-01-01T12:00:00')
      expect(formatRelativeDate(twoWeeksAgo)).toBe('Jan 1')
    })

    it('accepts string dates', () => {
      const now = new Date('2024-01-15T12:00:00')
      vi.setSystemTime(now)

      expect(formatRelativeDate('2024-01-15T10:00:00')).toBe('Today')
    })
  })

  describe('formatFullDate', () => {
    it('formats date without year by default', () => {
      const date = new Date('2024-03-15')
      expect(formatFullDate(date)).toBe('March 15')
    })

    it('formats date with year when requested', () => {
      const date = new Date('2024-03-15')
      expect(formatFullDate(date, true)).toBe('March 15, 2024')
    })

    it('accepts string dates', () => {
      expect(formatFullDate('2024-12-25')).toBe('December 25')
    })
  })

  describe('formatDuration', () => {
    it('formats minutes only when less than an hour', () => {
      expect(formatDuration(1800)).toBe('30m')
      expect(formatDuration(2700)).toBe('45m')
    })

    it('formats hours and minutes when over an hour', () => {
      expect(formatDuration(3600)).toBe('1h 0m')
      expect(formatDuration(5400)).toBe('1h 30m')
      expect(formatDuration(7200)).toBe('2h 0m')
      expect(formatDuration(9000)).toBe('2h 30m')
    })

    it('handles zero', () => {
      expect(formatDuration(0)).toBe('0m')
    })
  })

  describe('formatElapsedTime', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('formats elapsed time in minutes for less than an hour', () => {
      const now = new Date('2024-01-15T12:30:00')
      vi.setSystemTime(now)

      const started = new Date('2024-01-15T12:00:00')
      expect(formatElapsedTime(started)).toBe('30 min')
    })

    it('formats elapsed time in hours for over an hour', () => {
      const now = new Date('2024-01-15T14:30:00')
      vi.setSystemTime(now)

      const started = new Date('2024-01-15T12:00:00')
      expect(formatElapsedTime(started)).toBe('2h 30m')
    })

    it('accepts string dates', () => {
      const now = new Date('2024-01-15T12:30:00')
      vi.setSystemTime(now)

      expect(formatElapsedTime('2024-01-15T12:00:00')).toBe('30 min')
    })
  })

  describe('formatVolume', () => {
    it('formats volumes under 1000 with locale string', () => {
      expect(formatVolume(500)).toBe('500')
      expect(formatVolume(999)).toBe('999')
    })

    it('formats volumes 1000+ in tonnes', () => {
      expect(formatVolume(1000)).toBe('1.0t')
      expect(formatVolume(2500)).toBe('2.5t')
      expect(formatVolume(10000)).toBe('10.0t')
    })
  })

  describe('formatTime', () => {
    it('formats time in MM:SS format', () => {
      expect(formatTime(90)).toBe('1:30')
      expect(formatTime(65)).toBe('1:05')
      expect(formatTime(45)).toBe('0:45')
      expect(formatTime(0)).toBe('0:00')
    })

    it('pads seconds with leading zero', () => {
      expect(formatTime(61)).toBe('1:01')
      expect(formatTime(5)).toBe('0:05')
    })
  })

  describe('formatWeight', () => {
    it('formats weight with default kg unit', () => {
      expect(formatWeight(100)).toBe('100 kg')
    })

    it('formats weight with custom unit', () => {
      expect(formatWeight(225, 'lbs')).toBe('225 lbs')
    })
  })
})
