import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db'
import { calculateStreak } from './date-utils.server'
import { PR_PRIORITY } from './pr-utils'
import type { RecordType } from '@prisma/client'

export interface CompareUserProfile {
  name: string
  username: string
  avatarUrl: string | null
}

export interface CompareUserStats {
  totalWorkouts: number
  totalPRs: number
  totalVolume: number
  totalAchievements: number
  currentStreak: number
}

export interface SharedPR {
  exerciseId: string
  exerciseName: string
  muscleGroup: string
  recordType: RecordType
  myValue: number
  myWeight: number | null
  myReps: number | null
  myTimeSeconds: number | null
  theirValue: number
  theirWeight: number | null
  theirReps: number | null
  theirTimeSeconds: number | null
  winner: 'me' | 'them' | 'tie'
}

export interface ComparisonData {
  me: { profile: CompareUserProfile; stats: CompareUserStats }
  them: { profile: CompareUserProfile; stats: CompareUserStats }
  sharedPRs: Array<SharedPR>
  summary: { wins: number; losses: number; ties: number }
}

async function getUserStats(userId: string): Promise<CompareUserStats> {
  const [totalWorkouts, totalPRs, totalAchievements, streak, volumeResult] =
    await Promise.all([
      prisma.workoutSession.count({
        where: { userId, completedAt: { not: null } },
      }),
      prisma.personalRecord.count({ where: { userId } }),
      prisma.userAchievement.count({ where: { userId } }),
      calculateStreak(userId),
      prisma.workoutSet.aggregate({
        where: {
          workoutSession: { userId, completedAt: { not: null } },
          isWarmup: false,
        },
        _sum: { weight: true },
      }),
    ])

  return {
    totalWorkouts,
    totalPRs,
    totalVolume: volumeResult._sum.weight ?? 0,
    totalAchievements,
    currentStreak: streak,
  }
}

async function getUserPRMap(userId: string) {
  const prs = await prisma.personalRecord.findMany({
    where: { userId },
    include: {
      exercise: {
        select: { id: true, name: true, muscleGroup: true, isTimed: true },
      },
      workoutSet: {
        select: { reps: true, timeSeconds: true, weight: true },
      },
    },
    orderBy: [{ exerciseId: 'asc' }, { value: 'desc' }],
  })

  // Group by exercise, pick best PR type per exercise (same logic as getUserExercisePRs)
  const byType = new Map<
    string,
    {
      exerciseId: string
      exerciseName: string
      muscleGroup: string
      recordType: RecordType
      value: number
      weight: number | null
      reps: number | null
      timeSeconds: number | null
    }
  >()

  for (const pr of prs) {
    const key = `${pr.exerciseId}-${pr.recordType}`
    if (!byType.has(key)) {
      byType.set(key, {
        exerciseId: pr.exerciseId,
        exerciseName: pr.exercise.name,
        muscleGroup: pr.exercise.muscleGroup,
        recordType: pr.recordType,
        value: pr.value,
        weight: pr.workoutSet.weight ?? null,
        reps: pr.workoutSet.reps ?? null,
        timeSeconds: pr.workoutSet.timeSeconds ?? null,
      })
    }
  }

  // For each exercise, select most relevant PR type
  const exerciseIds = [...new Set(prs.map((pr) => pr.exerciseId))]
  const result = new Map<
    string,
    typeof byType extends Map<string, infer V> ? V : never
  >()

  for (const exerciseId of exerciseIds) {
    const candidates = Array.from(byType.values()).filter(
      (pr) => pr.exerciseId === exerciseId,
    )
    candidates.sort(
      (a, b) => PR_PRIORITY[a.recordType] - PR_PRIORITY[b.recordType],
    )
    if (candidates.length > 0) {
      result.set(exerciseId, candidates[0])
    }
  }

  return result
}

export const getComparisonData = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string; targetUsername: string }) => data)
  .handler(async ({ data }): Promise<ComparisonData> => {
    // Look up target user profile
    const targetProfile = await prisma.userProfile.findFirst({
      where: {
        username: data.targetUsername.toLowerCase(),
        user: { deletedAt: null },
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    })

    if (!targetProfile) {
      throw new Error('User not found')
    }

    // Verify follow status is ACCEPTED
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: data.userId,
          followingId: targetProfile.userId,
        },
      },
    })

    if (follow?.status !== 'ACCEPTED') {
      throw new Error('You must be following this user to compare stats')
    }

    // Verify target has showStats enabled
    if (!targetProfile.showStats) {
      throw new Error('This user has their stats hidden')
    }

    // Get own profile
    const myProfile = await prisma.userProfile.findUnique({
      where: { userId: data.userId },
      include: {
        user: { select: { id: true, name: true } },
      },
    })

    if (!myProfile) {
      throw new Error('Profile not found')
    }

    // Fetch all data in parallel
    const [myStats, theirStats, myPRMap, theirPRMap] = await Promise.all([
      getUserStats(data.userId),
      getUserStats(targetProfile.userId),
      getUserPRMap(data.userId),
      getUserPRMap(targetProfile.userId),
    ])

    // Find shared exercises and compare PRs
    const sharedPRs: Array<SharedPR> = []
    let wins = 0
    let losses = 0
    let ties = 0

    for (const [exerciseId, myPR] of myPRMap) {
      const theirPR = theirPRMap.get(exerciseId)
      if (!theirPR) continue

      let winner: 'me' | 'them' | 'tie'
      if (myPR.value > theirPR.value) {
        winner = 'me'
        wins++
      } else if (theirPR.value > myPR.value) {
        winner = 'them'
        losses++
      } else {
        winner = 'tie'
        ties++
      }

      sharedPRs.push({
        exerciseId,
        exerciseName: myPR.exerciseName,
        muscleGroup: myPR.muscleGroup,
        recordType: myPR.recordType,
        myValue: myPR.value,
        myWeight: myPR.weight,
        myReps: myPR.reps,
        myTimeSeconds: myPR.timeSeconds,
        theirValue: theirPR.value,
        theirWeight: theirPR.weight,
        theirReps: theirPR.reps,
        theirTimeSeconds: theirPR.timeSeconds,
        winner,
      })
    }

    return {
      me: {
        profile: {
          name: myProfile.user.name,
          username: myProfile.username,
          avatarUrl: myProfile.avatarUrl,
        },
        stats: myStats,
      },
      them: {
        profile: {
          name: targetProfile.user.name,
          username: targetProfile.username,
          avatarUrl: targetProfile.avatarUrl,
        },
        stats: theirStats,
      },
      sharedPRs,
      summary: { wins, losses, ties },
    }
  })
