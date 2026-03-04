import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db.server'
import { MAX_PAGE_SIZE } from './constants'
import { requireAuth } from './auth-guard.server'

// Validate pagination parameters to prevent DoS
function validatePagination(limit?: number, offset?: number): void {
  if (limit !== undefined) {
    if (limit < 1) throw new Error('Limit must be at least 1')
    if (limit > MAX_PAGE_SIZE)
      throw new Error(`Limit cannot exceed ${MAX_PAGE_SIZE}`)
  }
  if (offset !== undefined && offset < 0) {
    throw new Error('Offset cannot be negative')
  }
}

// Send a follow request
export const sendFollowRequest = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string | null; followingId: string }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    if (userId === data.followingId) {
      throw new Error('Cannot follow yourself')
    }

    // Check if follow already exists
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: data.followingId,
        },
      },
    })

    if (existing) {
      if (existing.status === 'DECLINED') {
        // Allow re-requesting after decline
        const follow = await prisma.follow.update({
          where: { id: existing.id },
          data: { status: 'PENDING', respondedAt: null },
        })
        return { follow }
      }
      throw new Error('Follow request already exists')
    }

    // Check if target user is private
    const targetProfile = await prisma.userProfile.findUnique({
      where: { userId: data.followingId },
    })

    const status = targetProfile?.isPrivate ? 'PENDING' : 'ACCEPTED'

    const follow = await prisma.follow.create({
      data: {
        followerId: userId,
        followingId: data.followingId,
        status,
        respondedAt: status === 'ACCEPTED' ? new Date() : null,
      },
    })

    // Create notification if pending
    if (status === 'PENDING') {
      const follower = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      })

      await prisma.notification.create({
        data: {
          userId: data.followingId,
          type: 'FOLLOW_REQUEST',
          title: 'New Follow Request',
          message: `${follower?.name} wants to follow you`,
          referenceId: follow.id,
        },
      })
    }

    return { follow }
  })

// Respond to a follow request (accept/decline)
export const respondToFollowRequest = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { followId: string; token: string | null; accept: boolean }) => data,
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    const follow = await prisma.follow.findFirst({
      where: {
        id: data.followId,
        followingId: userId, // Must be the person being followed
        status: 'PENDING',
      },
      include: { following: { select: { name: true } } },
    })

    if (!follow) {
      throw new Error('Follow request not found')
    }

    const updated = await prisma.follow.update({
      where: { id: data.followId },
      data: {
        status: data.accept ? 'ACCEPTED' : 'DECLINED',
        respondedAt: new Date(),
      },
    })

    // Notify the requester if accepted
    if (data.accept) {
      await prisma.notification.create({
        data: {
          userId: follow.followerId,
          type: 'FOLLOW_ACCEPTED',
          title: 'Follow Request Accepted',
          message: `${follow.following.name} accepted your follow request`,
          referenceId: follow.followingId,
        },
      })
    }

    return { follow: updated }
  })

// Remove a follower (as the person being followed)
export const removeFollower = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string | null; followerId: string }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    await prisma.follow.deleteMany({
      where: {
        followerId: data.followerId,
        followingId: userId,
      },
    })
    return { success: true }
  })

// Unfollow someone (as the follower)
export const unfollow = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string | null; followingId: string }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    await prisma.follow.deleteMany({
      where: {
        followerId: userId,
        followingId: data.followingId,
      },
    })
    return { success: true }
  })

// Internal helper for getFollowers logic (used by getFollowers and getPendingFollowRequests)
async function getFollowersInternal(
  userId: string,
  status?: 'PENDING' | 'ACCEPTED',
  limit?: number,
  offset?: number,
) {
  // Fetch followers with profiles in a single query (fixes N+1)
  const followers = await prisma.follow.findMany({
    where: {
      followingId: userId,
      ...(status && { status }),
    },
    take: limit ?? 50,
    skip: offset ?? 0,
    orderBy: { createdAt: 'desc' },
    include: {
      follower: {
        select: {
          id: true,
          name: true,
          profile: true,
        },
      },
    },
  })

  const followerIds = followers.map((f) => f.followerId)

  // Get mutual follows (users I also follow back)
  const mutualFollows =
    followerIds.length > 0
      ? await prisma.follow.findMany({
          where: {
            followerId: userId,
            followingId: { in: followerIds },
            status: 'ACCEPTED',
          },
          select: { followingId: true },
        })
      : []
  const mutualSet = new Set(mutualFollows.map((f) => f.followingId))

  return {
    followers: followers.map((f) => ({
      ...f,
      profile: f.follower.profile,
      isMutual: mutualSet.has(f.followerId),
    })),
  }
}

// Get followers list
export const getFollowers = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      token: string | null
      status?: 'PENDING' | 'ACCEPTED'
      limit?: number
      offset?: number
    }) => {
      validatePagination(data.limit, data.offset)
      return data
    },
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)
    return getFollowersInternal(userId, data.status, data.limit, data.offset)
  })

// Get following list
export const getFollowing = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      token: string | null
      status?: 'PENDING' | 'ACCEPTED'
      limit?: number
      offset?: number
    }) => {
      validatePagination(data.limit, data.offset)
      return data
    },
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    // Fetch following with profiles in a single query (fixes N+1)
    const following = await prisma.follow.findMany({
      where: {
        followerId: userId,
        ...(data.status && { status: data.status }),
      },
      take: data.limit ?? 50,
      skip: data.offset ?? 0,
      orderBy: { createdAt: 'desc' },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            profile: true,
          },
        },
      },
    })

    const followingIds = following.map((f) => f.followingId)

    // Get mutual follows (users who also follow me back)
    const mutualFollows =
      followingIds.length > 0
        ? await prisma.follow.findMany({
            where: {
              followerId: { in: followingIds },
              followingId: userId,
              status: 'ACCEPTED',
            },
            select: { followerId: true },
          })
        : []
    const mutualSet = new Set(mutualFollows.map((f) => f.followerId))

    return {
      following: following.map((f) => ({
        ...f,
        profile: f.following.profile,
        isMutual: mutualSet.has(f.followingId),
      })),
    }
  })

// Get pending follow requests (for the user to approve)
export const getPendingFollowRequests = createServerFn({ method: 'GET' })
  .inputValidator((data: { token: string | null }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)
    return getFollowersInternal(userId, 'PENDING')
  })

// Get follow status between two users
export const getFollowStatus = createServerFn({ method: 'GET' })
  .inputValidator((data: { token: string | null; followingId: string }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: data.followingId,
        },
      },
    })
    return { status: follow?.status ?? null }
  })

// Get follow counts
export const getFollowCounts = createServerFn({ method: 'GET' })
  .inputValidator((data: { token: string | null }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    const [followersCount, followingCount, pendingCount] = await Promise.all([
      prisma.follow.count({
        where: { followingId: userId, status: 'ACCEPTED' },
      }),
      prisma.follow.count({
        where: { followerId: userId, status: 'ACCEPTED' },
      }),
      prisma.follow.count({
        where: { followingId: userId, status: 'PENDING' },
      }),
    ])
    return { followersCount, followingCount, pendingCount }
  })

// Get mutual followers (users who follow each other)
export const getMutualFollowers = createServerFn({ method: 'GET' })
  .inputValidator((data: { token: string | null }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    // Get all my followers
    const followers = await prisma.follow.findMany({
      where: { followingId: userId, status: 'ACCEPTED' },
      select: { followerId: true },
    })
    const followerIds = followers.map((f) => f.followerId)

    if (followerIds.length === 0) {
      return { mutuals: [] }
    }

    // Get users I also follow back (mutuals) with profiles in single query (fixes N+1)
    const mutual = await prisma.follow.findMany({
      where: {
        followerId: userId,
        followingId: { in: followerIds },
        status: 'ACCEPTED',
      },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            profile: true,
          },
        },
      },
    })

    return {
      mutuals: mutual.map((f) => ({
        id: f.id,
        userId: f.followingId,
        user: { id: f.following.id, name: f.following.name },
        profile: f.following.profile,
      })),
    }
  })
