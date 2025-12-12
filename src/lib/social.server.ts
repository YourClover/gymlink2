import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db'

// Send a follow request
export const sendFollowRequest = createServerFn({ method: 'POST' })
  .inputValidator((data: { followerId: string; followingId: string }) => {
    if (data.followerId === data.followingId) {
      throw new Error('Cannot follow yourself')
    }
    return data
  })
  .handler(async ({ data }) => {
    // Check if follow already exists
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: data.followerId,
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
        followerId: data.followerId,
        followingId: data.followingId,
        status,
        respondedAt: status === 'ACCEPTED' ? new Date() : null,
      },
    })

    // Create notification if pending
    if (status === 'PENDING') {
      const follower = await prisma.user.findUnique({
        where: { id: data.followerId },
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
    (data: { followId: string; userId: string; accept: boolean }) => data,
  )
  .handler(async ({ data }) => {
    const follow = await prisma.follow.findFirst({
      where: {
        id: data.followId,
        followingId: data.userId, // Must be the person being followed
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
  .inputValidator((data: { userId: string; followerId: string }) => data)
  .handler(async ({ data }) => {
    await prisma.follow.deleteMany({
      where: {
        followerId: data.followerId,
        followingId: data.userId,
      },
    })
    return { success: true }
  })

// Unfollow someone (as the follower)
export const unfollow = createServerFn({ method: 'POST' })
  .inputValidator((data: { followerId: string; followingId: string }) => data)
  .handler(async ({ data }) => {
    await prisma.follow.deleteMany({
      where: {
        followerId: data.followerId,
        followingId: data.followingId,
      },
    })
    return { success: true }
  })

// Get followers list
export const getFollowers = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      userId: string
      status?: 'PENDING' | 'ACCEPTED'
      limit?: number
      offset?: number
    }) => data,
  )
  .handler(async ({ data }) => {
    const followers = await prisma.follow.findMany({
      where: {
        followingId: data.userId,
        ...(data.status && { status: data.status }),
      },
      take: data.limit ?? 50,
      skip: data.offset ?? 0,
      orderBy: { createdAt: 'desc' },
      include: {
        follower: {
          select: { id: true, name: true },
        },
      },
    })

    // Get profiles for followers
    const profileIds = followers.map((f) => f.followerId)
    const profiles = await prisma.userProfile.findMany({
      where: { userId: { in: profileIds } },
    })
    const profileMap = new Map(profiles.map((p) => [p.userId, p]))

    // Get mutual follows (users I also follow back)
    const mutualFollows = await prisma.follow.findMany({
      where: {
        followerId: data.userId,
        followingId: { in: profileIds },
        status: 'ACCEPTED',
      },
    })
    const mutualSet = new Set(mutualFollows.map((f) => f.followingId))

    return {
      followers: followers.map((f) => ({
        ...f,
        profile: profileMap.get(f.followerId),
        isMutual: mutualSet.has(f.followerId),
      })),
    }
  })

// Get following list
export const getFollowing = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      userId: string
      status?: 'PENDING' | 'ACCEPTED'
      limit?: number
      offset?: number
    }) => data,
  )
  .handler(async ({ data }) => {
    const following = await prisma.follow.findMany({
      where: {
        followerId: data.userId,
        ...(data.status && { status: data.status }),
      },
      take: data.limit ?? 50,
      skip: data.offset ?? 0,
      orderBy: { createdAt: 'desc' },
      include: {
        following: {
          select: { id: true, name: true },
        },
      },
    })

    const profileIds = following.map((f) => f.followingId)
    const profiles = await prisma.userProfile.findMany({
      where: { userId: { in: profileIds } },
    })
    const profileMap = new Map(profiles.map((p) => [p.userId, p]))

    // Get mutual follows (users who also follow me back)
    const mutualFollows = await prisma.follow.findMany({
      where: {
        followerId: { in: profileIds },
        followingId: data.userId,
        status: 'ACCEPTED',
      },
    })
    const mutualSet = new Set(mutualFollows.map((f) => f.followerId))

    return {
      following: following.map((f) => ({
        ...f,
        profile: profileMap.get(f.followingId),
        isMutual: mutualSet.has(f.followingId),
      })),
    }
  })

// Get pending follow requests (for the user to approve)
export const getPendingFollowRequests = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    return getFollowers({ data: { userId: data.userId, status: 'PENDING' } })
  })

// Get follow status between two users
export const getFollowStatus = createServerFn({ method: 'GET' })
  .inputValidator((data: { followerId: string; followingId: string }) => data)
  .handler(async ({ data }) => {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: data.followerId,
          followingId: data.followingId,
        },
      },
    })
    return { status: follow?.status ?? null }
  })

// Get follow counts
export const getFollowCounts = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const [followersCount, followingCount, pendingCount] = await Promise.all([
      prisma.follow.count({
        where: { followingId: data.userId, status: 'ACCEPTED' },
      }),
      prisma.follow.count({
        where: { followerId: data.userId, status: 'ACCEPTED' },
      }),
      prisma.follow.count({
        where: { followingId: data.userId, status: 'PENDING' },
      }),
    ])
    return { followersCount, followingCount, pendingCount }
  })

// Get mutual followers (users who follow each other)
export const getMutualFollowers = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    // Get all my followers
    const followers = await prisma.follow.findMany({
      where: { followingId: data.userId, status: 'ACCEPTED' },
      select: { followerId: true },
    })
    const followerIds = followers.map((f) => f.followerId)

    // Get users I also follow back (mutuals)
    const mutual = await prisma.follow.findMany({
      where: {
        followerId: data.userId,
        followingId: { in: followerIds },
        status: 'ACCEPTED',
      },
      include: {
        following: { select: { id: true, name: true } },
      },
    })

    const profileIds = mutual.map((f) => f.followingId)
    const profiles = await prisma.userProfile.findMany({
      where: { userId: { in: profileIds } },
    })
    const profileMap = new Map(profiles.map((p) => [p.userId, p]))

    return {
      mutuals: mutual.map((f) => ({
        id: f.id,
        userId: f.followingId,
        user: f.following,
        profile: profileMap.get(f.followingId),
      })),
    }
  })
