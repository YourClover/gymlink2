import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  Crown,
  Dumbbell,
  Flame,
  Loader2,
  Medal,
  Trophy,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  getFriendsLeaderboard,
  getGlobalLeaderboard,
} from '@/lib/leaderboards.server'
import AppLayout from '@/components/AppLayout'

export const Route = createFileRoute('/leaderboards')({
  component: LeaderboardsPage,
})

type LeaderboardMetric = 'volume' | 'workouts' | 'streak' | 'prs'
type TimeRange = 'week' | 'month' | 'all'
type LeaderboardScope = 'friends' | 'global'

interface LeaderboardEntry {
  rank: number
  userId: string
  value: number
  user?: { id: string; name: string }
  profile?: { username: string; avatarUrl: string | null }
}

function LeaderboardsPage() {
  const { user } = useAuth()
  const [metric, setMetric] = useState<LeaderboardMetric>('volume')
  const [timeRange, setTimeRange] = useState<TimeRange>('week')
  const [scope, setScope] = useState<LeaderboardScope>('friends')
  const [leaderboard, setLeaderboard] = useState<Array<LeaderboardEntry>>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadLeaderboard = async () => {
    if (!user) return
    setIsLoading(true)

    try {
      const result =
        scope === 'friends'
          ? await getFriendsLeaderboard({
              data: { userId: user.id, metric, timeRange },
            })
          : await getGlobalLeaderboard({ data: { metric, timeRange } })

      setLeaderboard(result.leaderboard as Array<LeaderboardEntry>)
    } catch (error) {
      console.error('Failed to load leaderboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLeaderboard()
  }, [user, metric, timeRange, scope])

  const getMetricLabel = (m: LeaderboardMetric) => {
    switch (m) {
      case 'volume':
        return 'Volume'
      case 'workouts':
        return 'Workouts'
      case 'streak':
        return 'Streak'
      case 'prs':
        return 'PRs'
    }
  }

  const getMetricIcon = (m: LeaderboardMetric) => {
    switch (m) {
      case 'volume':
        return <Flame className="w-4 h-4" />
      case 'workouts':
        return <Dumbbell className="w-4 h-4" />
      case 'streak':
        return <Zap className="w-4 h-4" />
      case 'prs':
        return <Trophy className="w-4 h-4" />
    }
  }

  const formatValue = (value: number, m: LeaderboardMetric) => {
    switch (m) {
      case 'volume':
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M kg`
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K kg`
        return `${Math.round(value)} kg`
      case 'workouts':
        return `${value} workouts`
      case 'streak':
        return `${value} weeks`
      case 'prs':
        return `${value} PRs`
    }
  }

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Crown className="w-4 h-4 text-yellow-500" />
          </div>
        )
      case 2:
        return (
          <div className="w-8 h-8 rounded-full bg-zinc-400/20 flex items-center justify-center">
            <Medal className="w-4 h-4 text-zinc-400" />
          </div>
        )
      case 3:
        return (
          <div className="w-8 h-8 rounded-full bg-amber-600/20 flex items-center justify-center">
            <Medal className="w-4 h-4 text-amber-600" />
          </div>
        )
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 text-sm font-medium">
            {rank}
          </div>
        )
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <AppLayout title="Leaderboards">
      <div className="p-4">
        {/* Scope Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setScope('friends')}
            className={`flex-1 py-2 rounded-lg font-medium text-sm ${
              scope === 'friends'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            Friends
          </button>
          <button
            onClick={() => setScope('global')}
            className={`flex-1 py-2 rounded-lg font-medium text-sm ${
              scope === 'global'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            Global
          </button>
        </div>

        {/* Metric Selection */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {(['volume', 'workouts', 'streak', 'prs'] as Array<LeaderboardMetric>).map(
            (m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
                  metric === m
                    ? 'bg-zinc-700 text-white'
                    : 'bg-zinc-800/50 text-zinc-400'
                }`}
              >
                {getMetricIcon(m)}
                {getMetricLabel(m)}
              </button>
            ),
          )}
        </div>

        {/* Time Range Selection */}
        {metric !== 'streak' && (
          <div className="flex gap-2 mb-6">
            {(['week', 'month', 'all'] as Array<TimeRange>).map((t) => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  timeRange === t
                    ? 'bg-zinc-700 text-white'
                    : 'bg-zinc-800/50 text-zinc-500'
                }`}
              >
                {t === 'week'
                  ? 'This Week'
                  : t === 'month'
                    ? 'This Month'
                    : 'All Time'}
              </button>
            ))}
          </div>
        )}

        {/* Leaderboard */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        ) : leaderboard.length > 0 ? (
          <div className="space-y-2">
            {leaderboard.map((entry) => {
              const isCurrentUser = entry.userId === user?.id

              return (
                <Link
                  key={entry.userId}
                  to="/u/$username"
                  params={{ username: entry.profile?.username ?? '' }}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isCurrentUser
                      ? 'bg-blue-600/20 border border-blue-500/30'
                      : 'bg-zinc-800/50 hover:bg-zinc-700/50'
                  }`}
                >
                  {getRankBadge(entry.rank)}

                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    {entry.profile?.avatarUrl ? (
                      <img
                        src={entry.profile.avatarUrl}
                        alt={`${entry.user?.name ?? 'User'}'s profile picture`}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials(entry.user?.name ?? 'U')
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium truncate ${
                        isCurrentUser ? 'text-blue-400' : 'text-white'
                      }`}
                    >
                      {entry.user?.name}
                      {isCurrentUser && ' (You)'}
                    </p>
                    <p className="text-sm text-zinc-500">
                      @{entry.profile?.username}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-white">
                      {formatValue(entry.value, metric)}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500">
              {scope === 'friends'
                ? 'No data from your friends yet'
                : 'No leaderboard data yet'}
            </p>
            {scope === 'friends' && (
              <Link
                to="/users/search"
                className="inline-block mt-4 text-blue-500 hover:text-blue-400 text-sm"
              >
                Find people to follow
              </Link>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
