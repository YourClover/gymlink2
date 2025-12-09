import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  BarChart3,
  Calendar,
  Clock,
  Dumbbell,
  Flame,
  Trophy,
  TrendingUp,
  Weight,
} from 'lucide-react'
import type { MuscleGroup } from '@prisma/client'
import { useAuth } from '@/context/AuthContext'
import AppLayout from '@/components/AppLayout'
import MuscleGroupBadge from '@/components/exercises/MuscleGroupBadge'
import {
  getOverviewStats,
  getVolumeHistory,
  getExerciseStats,
  getRecentPRs,
} from '@/lib/stats.server'

export const Route = createFileRoute('/stats')({
  component: StatsPage,
})

type OverviewStats = {
  totalWorkouts: number
  totalTimeSeconds: number
  totalVolume: number
  totalPRs: number
  currentStreak: number
}

type WeekData = {
  weekStart: string
  volume: number
  workouts: number
}

type TopExercise = {
  exerciseId: string
  name: string
  muscleGroup: MuscleGroup | null
  setCount: number
}

type MuscleGroupData = {
  muscle: string
  count: number
  percentage: number
}

type PRData = {
  id: string
  exerciseName: string
  muscleGroup: MuscleGroup | null
  recordType: string
  weight: number
  reps: number | null
  timeSeconds: number | null
  achievedAt: Date
}

function StatsPage() {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<OverviewStats | null>(null)
  const [volumeHistory, setVolumeHistory] = useState<WeekData[]>([])
  const [topExercises, setTopExercises] = useState<TopExercise[]>([])
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroupData[]>([])
  const [recentPRs, setRecentPRs] = useState<PRData[]>([])

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return

      try {
        const [overviewRes, volumeRes, exerciseRes, prsRes] = await Promise.all(
          [
            getOverviewStats({ data: { userId: user.id } }),
            getVolumeHistory({ data: { userId: user.id, weeks: 8 } }),
            getExerciseStats({ data: { userId: user.id } }),
            getRecentPRs({ data: { userId: user.id, limit: 5 } }),
          ],
        )

        setOverview(overviewRes.stats)
        setVolumeHistory(volumeRes.weeks)
        setTopExercises(exerciseRes.topExercises)
        setMuscleGroups(exerciseRes.muscleGroups)
        setRecentPRs(prsRes.prs)
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user])

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    if (hours < 1) {
      const mins = Math.floor(seconds / 60)
      return `${mins}m`
    }
    return `${hours}h`
  }

  const formatVolume = (kg: number) => {
    if (kg >= 1000000) {
      return `${(kg / 1000000).toFixed(1)}M kg`
    }
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(1)}t`
    }
    return `${Math.round(kg)} kg`
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const formatWeekLabel = (weekStart: string) => {
    const date = new Date(weekStart)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <AppLayout title="Stats">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Stats">
      <div className="px-4 py-6 space-y-6">
        {/* Overview Stats */}
        <section>
          <h2 className="text-sm font-medium text-zinc-400 mb-3 px-1">
            All Time
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Dumbbell className="w-5 h-5" />}
              label="Workouts"
              value={overview?.totalWorkouts.toString() ?? '0'}
              color="blue"
            />
            <StatCard
              icon={<Weight className="w-5 h-5" />}
              label="Volume"
              value={formatVolume(overview?.totalVolume ?? 0)}
              color="green"
            />
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              label="Time"
              value={formatDuration(overview?.totalTimeSeconds ?? 0)}
              color="purple"
            />
            <StatCard
              icon={<Trophy className="w-5 h-5" />}
              label="PRs"
              value={overview?.totalPRs.toString() ?? '0'}
              color="yellow"
            />
          </div>

          {/* Streak highlight */}
          {overview && overview.currentStreak > 0 && (
            <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">
                    {overview.currentStreak} Week Streak
                  </p>
                  <p className="text-sm text-zinc-400">Keep it going!</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Workout Frequency */}
        <section>
          <h2 className="text-sm font-medium text-zinc-400 mb-3 px-1 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Workout Frequency
          </h2>
          <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <div className="flex gap-2">
              {volumeHistory.map((week, i) => {
                const isCurrentWeek = i === volumeHistory.length - 1
                return (
                  <div
                    key={week.weekStart}
                    className="flex-1 flex flex-col items-center gap-2"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                        week.workouts > 0
                          ? isCurrentWeek
                            ? 'bg-blue-500 text-white'
                            : 'bg-zinc-600 text-white'
                          : 'bg-zinc-800 text-zinc-600'
                      }`}
                    >
                      {week.workouts}
                    </div>
                    <span className="text-xs text-zinc-500">
                      {formatWeekLabel(week.weekStart).split(' ')[0]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Top Exercises */}
        {topExercises.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-zinc-400 mb-3 px-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Most Trained
            </h2>
            <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 divide-y divide-zinc-700/50">
              {topExercises.map((ex, i) => (
                <div key={ex.exerciseId} className="p-3 flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-300">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{ex.name}</p>
                    {ex.muscleGroup && (
                      <MuscleGroupBadge muscleGroup={ex.muscleGroup} size="sm" />
                    )}
                  </div>
                  <div className="text-sm text-zinc-400">{ex.setCount} sets</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Muscle Group Distribution */}
        {muscleGroups.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-zinc-400 mb-3 px-1">
              Muscle Distribution
            </h2>
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 space-y-3">
              {muscleGroups.slice(0, 6).map((mg) => (
                <div key={mg.muscle} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-300 capitalize">
                      {mg.muscle.toLowerCase().replace('_', ' ')}
                    </span>
                    <span className="text-zinc-500">{mg.percentage}%</span>
                  </div>
                  <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${mg.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent PRs */}
        {recentPRs.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-zinc-400 mb-3 px-1 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Recent PRs
            </h2>
            <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 divide-y divide-zinc-700/50">
              {recentPRs.map((pr) => (
                <div key={pr.id} className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">
                      {pr.exerciseName}
                    </p>
                    <p className="text-sm text-zinc-400">
                      {pr.timeSeconds
                        ? `${pr.weight}kg x ${pr.timeSeconds}s`
                        : `${pr.weight}kg x ${pr.reps} reps`}
                    </p>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {formatDate(pr.achievedAt)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state if no data */}
        {overview?.totalWorkouts === 0 && (
          <div className="p-8 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-center">
            <BarChart3 className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              No stats yet
            </h2>
            <p className="text-zinc-400 max-w-sm mx-auto">
              Complete your first workout to start tracking your progress
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

// Stat card component
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: 'blue' | 'green' | 'purple' | 'yellow'
}) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
  }

  return (
    <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
      <div
        className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}
      >
        {icon}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-zinc-400">{label}</p>
    </div>
  )
}
