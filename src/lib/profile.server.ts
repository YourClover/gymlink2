import { randomInt } from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { requireAuth } from './auth-guard.server'
import { MAX_CODE_GENERATION_ATTEMPTS } from './constants'
import { prisma } from './db.server'
import { rateLimit } from './rate-limit.server'

// Character set for profile codes (excludes confusing chars: 0/O, 1/I/L)
const CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

function generateProfileCode(): string {
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += CODE_CHARS[randomInt(CODE_CHARS.length)]
  }
  return code
}

// Create user profile (called after registration)
export const createUserProfile = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string | null; username: string }) => {
    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(data.username)) {
      throw new Error(
        'Username must be 3-20 characters, alphanumeric and underscores only',
      )
    }
    return data
  })
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    // Check username availability
    const existing = await prisma.userProfile.findUnique({
      where: { username: data.username.toLowerCase() },
    })
    if (existing) {
      throw new Error('Username already taken')
    }

    // Generate unique profile code
    let profileCode = generateProfileCode()
    let attempts = 0
    while (await prisma.userProfile.findUnique({ where: { profileCode } })) {
      profileCode = generateProfileCode()
      if (++attempts > MAX_CODE_GENERATION_ATTEMPTS)
        throw new Error('Failed to generate unique code')
    }

    const profile = await prisma.userProfile.create({
      data: {
        userId,
        username: data.username.toLowerCase(),
        profileCode,
        isPrivate: true,
        showAchievements: true,
        showStats: true,
      },
    })

    return { profile }
  })

// Update user profile
export const updateUserProfile = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      token: string | null
      bio?: string
      avatarUrl?: string
      isPrivate?: boolean
      showAchievements?: boolean
      showStats?: boolean
    }) => {
      if (data.bio !== undefined && data.bio.length > 500) {
        throw new Error('Bio must be 500 characters or fewer')
      }
      if (data.avatarUrl !== undefined && data.avatarUrl !== '') {
        if (data.avatarUrl.length > 2048) {
          throw new Error('Avatar URL is too long')
        }
        try {
          const url = new URL(data.avatarUrl)
          if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error('Avatar URL must use HTTP or HTTPS')
          }
        } catch (e) {
          if (e instanceof Error && e.message.includes('Avatar URL'))
            throw e
          throw new Error('Avatar URL must be a valid URL')
        }
      }
      return data
    },
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    const profile = await prisma.userProfile.update({
      where: { userId },
      data: {
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.isPrivate !== undefined && { isPrivate: data.isPrivate }),
        ...(data.showAchievements !== undefined && {
          showAchievements: data.showAchievements,
        }),
        ...(data.showStats !== undefined && { showStats: data.showStats }),
      },
    })

    return { profile }
  })

// Get profile by user ID
export const getUserProfile = createServerFn({ method: 'GET' })
  .inputValidator((data: { token: string | null }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, name: true, createdAt: true },
        },
      },
    })

    return { profile }
  })

// Get profile by username (for public profile pages)
export const getProfileByUsername = createServerFn({ method: 'GET' })
  .inputValidator((data: { username: string; token?: string | null }) => data)
  .handler(async ({ data }) => {
    let viewerId: string | undefined
    if (data.token) {
      try {
        const auth = await requireAuth(data.token)
        viewerId = auth.userId
      } catch {
        // Invalid token, proceed as public view
      }
    }

    const profile = await prisma.userProfile.findFirst({
      where: {
        username: data.username.toLowerCase(),
        user: { deletedAt: null }, // Exclude soft-deleted users
      },
      include: {
        user: {
          select: { id: true, name: true, createdAt: true },
        },
      },
    })

    if (!profile)
      return {
        profile: null,
        canView: false,
        followStatus: null,
      }

    // Check if viewer can see this profile
    let canView = !profile.isPrivate
    let followStatus: string | null = null

    if (viewerId) {
      if (viewerId === profile.userId) {
        canView = true // Own profile
      } else {
        const follow = await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewerId,
              followingId: profile.userId,
            },
          },
        })
        followStatus = follow?.status ?? null
        if (follow?.status === 'ACCEPTED') {
          canView = true
        }
      }
    }

    // Get follower/following counts
    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({
        where: { followingId: profile.userId, status: 'ACCEPTED' },
      }),
      prisma.follow.count({
        where: { followerId: profile.userId, status: 'ACCEPTED' },
      }),
    ])

    return {
      profile: {
        ...profile,
        followersCount,
        followingCount,
      },
      canView,
      followStatus,
    }
  })

// Get profile by share code
export const getProfileByCode = createServerFn({ method: 'GET' })
  .inputValidator((data: { profileCode: string }) => data)
  .handler(async ({ data }) => {
    const profile = await prisma.userProfile.findUnique({
      where: { profileCode: data.profileCode.toUpperCase() },
      include: {
        user: { select: { id: true, name: true } },
      },
    })

    return { profile }
  })

// Check if username is available
export const checkUsernameAvailable = createServerFn({ method: 'GET' })
  .inputValidator((data: { username: string }) => data)
  .handler(async ({ data }) => {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(data.username)) {
      return { available: false, reason: 'Invalid format' }
    }

    const existing = await prisma.userProfile.findUnique({
      where: { username: data.username.toLowerCase() },
    })

    return { available: !existing }
  })

// Search users by username or name
export const searchUsers = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { query: string; limit?: number; token: string | null }) => data,
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)
    const limit = Math.min(Math.max(1, data.limit ?? 20), 50)
    const query = data.query.toLowerCase()

    const profiles = await prisma.userProfile.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { user: { name: { contains: query, mode: 'insensitive' } } },
        ],
        userId: {
          not: userId, // Exclude self
        },
        user: {
          deletedAt: null, // Exclude soft-deleted users
        },
      },
      take: limit,
      include: {
        user: { select: { id: true, name: true } },
      },
    })

    // Get follow status for each result
    const followStatuses = await prisma.follow.findMany({
      where: {
        followerId: userId,
        followingId: { in: profiles.map((p) => p.userId) },
      },
    })

    const statusMap = new Map(
      followStatuses.map((f) => [f.followingId, f.status]),
    )

    return {
      users: profiles.map((p) => ({
        ...p,
        followStatus: statusMap.get(p.userId) ?? null,
      })),
    }
  })

// Soft delete user account
export const deleteUserAccount = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { token: string | null; confirmEmail: string; password: string }) =>
      data,
  )
  .handler(async ({ data }) => {
    rateLimit({ key: 'account-delete', limit: 3, windowMs: 3600_000 })

    const { userId } = await requireAuth(data.token)

    // Verify user exists and is not already deleted
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Verify email matches for confirmation
    if (user.email !== data.confirmEmail) {
      throw new Error('Email confirmation does not match')
    }

    // Import password verification
    const { verifyPassword } = await import('./auth')
    const isValid = await verifyPassword(data.password, user.passwordHash)
    if (!isValid) {
      throw new Error('Invalid password')
    }

    // Soft delete the user
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    })

    // Optionally: clear sensitive profile data while keeping the record
    await prisma.userProfile.updateMany({
      where: { userId },
      data: {
        bio: null,
        avatarUrl: null,
      },
    })

    return { success: true }
  })

// Restore a soft-deleted user account (admin only or within grace period)
export const restoreUserAccount = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { targetUserId: string; token: string | null }) => data,
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth(data.token)

    // Find the soft-deleted user
    const user = await prisma.user.findFirst({
      where: {
        id: data.targetUserId,
        deletedAt: { not: null },
      },
    })

    if (!user) {
      throw new Error('Deleted user not found')
    }

    // Check if within grace period (30 days) or admin is restoring
    const gracePeriodDays = 30
    const deletedAt = user.deletedAt!
    const daysSinceDelete = Math.floor(
      (Date.now() - deletedAt.getTime()) / (1000 * 60 * 60 * 24),
    )

    const isSelfRestore = auth.userId === data.targetUserId

    if (isSelfRestore && daysSinceDelete > gracePeriodDays) {
      throw new Error(
        `Account can only be restored within ${gracePeriodDays} days of deletion`,
      )
    }

    if (!isSelfRestore && !auth.isAdmin) {
      throw new Error('Admin access required')
    }

    // Restore the user
    await prisma.user.update({
      where: { id: data.targetUserId },
      data: { deletedAt: null },
    })

    return { success: true }
  })

// Get profile stats for a user (workout counts, PRs, etc.)
export const getProfileStats = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { token: string | null; targetUserId?: string }) => data,
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth(data.token)
    const userId = data.targetUserId ?? auth.userId

    // Access control: verify the requester can view this user's stats
    if (data.targetUserId && data.targetUserId !== auth.userId) {
      const targetProfile = await prisma.userProfile.findUnique({
        where: { userId: data.targetUserId },
      })
      if (!targetProfile || !targetProfile.showStats) {
        throw new Error('Cannot view this content')
      }
      if (targetProfile.isPrivate) {
        const follow = await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: auth.userId,
              followingId: data.targetUserId,
            },
          },
        })
        if (follow?.status !== 'ACCEPTED') {
          throw new Error('Cannot view this content')
        }
      }
    }

    const [
      totalWorkouts,
      totalSets,
      totalPRs,
      totalAchievements,
      recentWorkout,
    ] = await Promise.all([
      prisma.workoutSession.count({
        where: { userId, completedAt: { not: null } },
      }),
      prisma.workoutSet.count({
        where: {
          workoutSession: { userId, completedAt: { not: null } },
          isWarmup: false,
        },
      }),
      prisma.personalRecord.count({
        where: { userId },
      }),
      prisma.userAchievement.count({
        where: { userId },
      }),
      prisma.workoutSession.findFirst({
        where: { userId, completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        select: { completedAt: true },
      }),
    ])

    // Calculate total volume (weight × reps)
    const volumeSets = await prisma.workoutSet.findMany({
      where: {
        workoutSession: { userId, completedAt: { not: null } },
        isWarmup: false,
      },
      select: { weight: true, reps: true },
    })

    let totalVolume = 0
    for (const set of volumeSets) {
      if (set.weight != null && set.reps != null) {
        totalVolume += set.weight * set.reps
      }
    }

    return {
      stats: {
        totalWorkouts,
        totalSets,
        totalPRs,
        totalAchievements,
        totalVolume,
        lastWorkoutAt: recentWorkout?.completedAt ?? null,
      },
    }
  })
