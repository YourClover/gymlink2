import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Calendar,
  Dumbbell,
  Flame,
  Lock,
  Medal,
  Trophy,
} from 'lucide-react'
import type { AchievementRarity } from '@prisma/client'
import { useAuth } from '@/context/AuthContext'
import { getProfileByUsername, getProfileStats } from '@/lib/profile.server'
import { getUserAchievements } from '@/lib/achievements.server'
import AppLayout from '@/components/AppLayout'
import { AchievementBadge } from '@/components/achievements'
import { FollowButton } from '@/components/social/FollowButton'
import {
  SkeletonProfileHeader,
  SkeletonStatsCard,
} from '@/components/ui/Skeleton'

export const Route = createFileRoute('/u/$username')({
  component: PublicProfilePage,
})

interface ProfileData {
  id: string
  userId: string
  username: string
  bio: string | null
  avatarUrl: string | null
  isPrivate: boolean
  showAchievements: boolean
  showStats: boolean
  profileCode: string
  followersCount: number
  followingCount: number
  user: {
    id: string
    name: string
    createdAt: Date | string
  }
}

interface StatsData {
  totalWorkouts: number
  totalSets: number
  totalPRs: number
  totalAchievements: number
  totalVolume: number
  lastWorkoutAt: string | null
}

interface AchievementData {
  id: string
  icon: string
  rarity: AchievementRarity
  name: string
}

function PublicProfilePage() {
  const { username } = Route.useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [canView, setCanView] = useState(false)
  const [followStatus, setFollowStatus] = useState<string | null>(null)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [achievements, setAchievements] = useState<Array<AchievementData>>([])
  const [isLoading, setIsLoading] = useState(true)

  const isOwnProfile = user?.id === profile?.userId

  const loadProfile = async () => {
    setIsLoading(true)
    try {
      const result = await getProfileByUsername({
        data: { username, viewerId: user?.id },
      })

      if (result.profile) {
        setProfile(result.profile as ProfileData)
        setCanView(result.canView)
        setFollowStatus(result.followStatus)

        // Load additional data if can view
        if (result.canView) {
          const [statsResult, achievementsResult] = await Promise.all([
            result.profile.showStats
              ? getProfileStats({ data: { userId: result.profile.userId } })
              : Promise.resolve(null),
            result.profile.showAchievements
              ? getUserAchievements({ data: { userId: result.profile.userId } })
              : Promise.resolve(null),
          ])

          if (statsResult) {
            setStats(statsResult.stats as StatsData)
          }

          if (achievementsResult) {
            const recent = achievementsResult.earned.slice(0, 6).map((ua) => ({
              id: ua.achievement.id,
              icon: ua.achievement.icon,
              rarity: ua.achievement.rarity,
              name: ua.achievement.name,
            }))
            setAchievements(recent)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [username, user?.id])

  const handleFollowChange = () => {
    // Reload profile to get updated follow status and counts
    loadProfile()
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M kg`
    }
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K kg`
    }
    return `${Math.round(volume)} kg`
  }

  if (isLoading) {
    return (
      <AppLayout showNav={false}>
        <div className="p-4">
          <div className="mb-6">
            <SkeletonProfileHeader />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonStatsCard key={i} />
            ))}
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!profile) {
    return (
      <AppLayout showNav={false}>
        <div className="p-4">
          <button
            onClick={() => navigate({ to: '/dashboard' })}
            className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg mb-4"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <div className="text-center py-12">
            <p className="text-zinc-400">User not found</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  const initials = profile.user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <AppLayout showNav={isOwnProfile}>
      <div className="p-4">
        {/* Header */}
        {!isOwnProfile && (
          <div className="flex items-center mb-4">
            <button
              onClick={() => window.history.back()}
              className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        )}

        {/* Profile Header */}
        <div
          className="flex items-start gap-4 mb-6 animate-fade-in"
          style={{ animationFillMode: 'backwards' }}
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={`${profile.user.name}'s profile picture`}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">
              {profile.user.name}
            </h1>
            <p className="text-zinc-400">@{profile.username}</p>
            <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
              <Calendar className="w-3 h-3" />
              Joined {formatDate(profile.user.createdAt)}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && <p className="text-zinc-300 mb-4">{profile.bio}</p>}

        {/* Followers/Following */}
        <div
          className="flex gap-6 mb-4 animate-fade-in"
          style={{ animationDelay: '50ms', animationFillMode: 'backwards' }}
        >
          <div className="text-center">
            <p className="text-xl font-bold text-white">
              {profile.followersCount}
            </p>
            <p className="text-sm text-zinc-500">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-white">
              {profile.followingCount}
            </p>
            <p className="text-sm text-zinc-500">Following</p>
          </div>
        </div>

        {/* Follow Button */}
        {!isOwnProfile && user && (
          <div className="mb-6">
            <FollowButton
              userId={profile.userId}
              currentStatus={followStatus}
              onStatusChange={handleFollowChange}
            />
          </div>
        )}

        {/* Private Profile Notice */}
        {!canView && (
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-6 text-center">
            <Lock className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
            <h3 className="text-white font-medium mb-1">Private Profile</h3>
            <p className="text-sm text-zinc-400">
              {followStatus === 'PENDING'
                ? 'Your follow request is pending'
                : 'Follow this user to see their activity'}
            </p>
          </div>
        )}

        {/* Stats */}
        {canView && stats && profile.showStats && (
          <div
            className="mb-6 animate-fade-in"
            style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
          >
            <h3 className="text-sm font-medium text-zinc-400 mb-2">Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Dumbbell className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-zinc-400">Workouts</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {stats.totalWorkouts}
                </p>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-zinc-400">PRs</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {stats.totalPRs}
                </p>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-zinc-400">Volume</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatVolume(stats.totalVolume)}
                </p>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Medal className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-zinc-400">Badges</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {stats.totalAchievements}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Achievements */}
        {canView && achievements.length > 0 && profile.showAchievements && (
          <div
            className="animate-fade-in"
            style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
          >
            <h3 className="text-sm font-medium text-zinc-400 mb-2">
              Recent Achievements
            </h3>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
              <div className="flex flex-wrap gap-3">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex flex-col items-center gap-1 hover:scale-110 transition-transform"
                  >
                    <AchievementBadge
                      icon={achievement.icon}
                      rarity={achievement.rarity}
                      earned={true}
                      size="md"
                    />
                    <span className="text-xs text-zinc-500 text-center truncate w-14">
                      {achievement.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
