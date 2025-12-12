// ============================================
// AUTH & SECURITY
// ============================================
export const PASSWORD_MIN_LENGTH = 8
export const BCRYPT_ROUNDS = 12
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/
export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 30

// ============================================
// PAGINATION
// ============================================
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100
export const DEFAULT_FEED_LIMIT = 20
export const DEFAULT_HISTORY_LIMIT = 50
export const DEFAULT_SEARCH_LIMIT = 50
export const MAX_LEADERBOARD_SIZE = 100

// ============================================
// WORKOUT
// ============================================
export const WEIGHT_INCREMENT = 2.5 // kg
export const TIME_INCREMENT = 15 // seconds
export const MIN_REPS = 1
export const MIN_WEIGHT = 0
export const MIN_TIME_SECONDS = 5
export const DEFAULT_REST_TIMER_SECONDS = 90
export const REST_TIMER_AUTO_CLOSE_DELAY_MS = 1500

// ============================================
// RPE (Rate of Perceived Exertion)
// ============================================
export const RPE_MIN = 1
export const RPE_MAX = 10
export const RPE_VALUES = [6, 7, 8, 9, 10] as const

// ============================================
// MOOD RATING
// ============================================
export const MOOD_MIN = 1
export const MOOD_MAX = 10

// ============================================
// STREAK CALCULATION
// ============================================
export const MAX_STREAK_WEEKS = 52 // One year lookback
export const DAYS_PER_WEEK = 7

// ============================================
// SHARING
// ============================================
export const SHARE_CODE_LENGTH = 8
export const SHARE_CODE_MAX_USES = 10
export const SHARE_CODE_EXPIRY_DAYS = 7

// ============================================
// CHALLENGES
// ============================================
export const CHALLENGE_MIN_DURATION_DAYS = 1
export const CHALLENGE_MAX_DURATION_DAYS = 365

// ============================================
// UI TIMING
// ============================================
export const DEBOUNCE_DELAY_MS = 300
export const TOAST_DURATION_MS = 5000
export const ANIMATION_DURATION_MS = 300

// ============================================
// FILE LIMITS
// ============================================
export const MAX_AVATAR_SIZE_MB = 5
export const MAX_AVATAR_SIZE_BYTES = MAX_AVATAR_SIZE_MB * 1024 * 1024
