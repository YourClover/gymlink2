import { getRequestIP } from '@tanstack/react-start/server'

interface RateLimitEntry {
  timestamps: Array<number>
}

const store = new Map<string, RateLimitEntry>()

// Limit total entries to prevent unbounded memory growth
const MAX_STORE_SIZE = 10_000

// Clean up expired entries every 10 minutes
const CLEANUP_INTERVAL = 10 * 60 * 1000
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 3600_000)
    if (entry.timestamps.length === 0) store.delete(key)
  }
}, CLEANUP_INTERVAL).unref?.()

function getClientIP(): string {
  try {
    return getRequestIP() ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Simple sliding-window rate limiter keyed by client IP.
 * Throws if the limit is exceeded.
 */
export function rateLimit(opts: {
  /** Unique namespace to separate different endpoints */
  key: string
  /** Maximum number of requests allowed in the window */
  limit: number
  /** Window size in milliseconds */
  windowMs: number
}): void {
  const ip = getClientIP()
  const bucketKey = `${opts.key}:${ip}`
  const now = Date.now()

  const entry = store.get(bucketKey) ?? { timestamps: [] }
  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < opts.windowMs)

  if (entry.timestamps.length >= opts.limit) {
    throw new Error('Too many requests. Please try again later.')
  }

  entry.timestamps.push(now)
  store.set(bucketKey, entry)

  // Evict oldest entries if store grows too large
  if (store.size > MAX_STORE_SIZE) {
    const keysToDelete = Array.from(store.keys()).slice(
      0,
      store.size - MAX_STORE_SIZE,
    )
    for (const k of keysToDelete) store.delete(k)
  }
}
