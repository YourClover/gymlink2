import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  BarChart3,
  Clock,
  Dumbbell,
  Flame,
  LineChart,
  TrendingUp,
  Trophy,
  Weight,
} from 'lucide-react'
import type { MuscleGroup, RecordType } from '@prisma/client'
import { useAuth } from '@/context/AuthContext'
import AppLayout from '@/components/AppLayout'
import MuscleGroupBadge from '@/components/exercises/MuscleGroupBadge'
import TimeRangeSelector, {
  getStartDateForRange,
  type TimeRange,
} from '@/components/progression/TimeRangeSelector'
import VolumeChart from '@/components/stats/VolumeChart'
import MuscleDonutChart from '@/components/stats/MuscleDonutChart'
import DurationStats from '@/components/stats/DurationStats'
import {
  getDurationStats,
  getExerciseStats,
  getOverviewStats,
  getRecentPRs,
  getVolumeHistory,
} from '@/lib/stats.server'
import { formatDuration, formatVolume } from '@/lib/formatting'

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
  isTimed: boolean
  recordType: RecordType
  value: number
  weight: number | null
  reps: number | null
  timeSeconds: number | null
  achievedAt: Date
}

type DurationData = {
  avgDurationSeconds: number
  maxDurationSeconds: number
  totalDurationSeconds: number
  sessionCount: number
  trend: Array<{ duration: number; date: string }>
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatPRDisplay(pr: PRData): string {
  switch (pr.recordType) {
    case 'MAX_VOLUME':
      if (pr.weight && pr.reps) {
        return `${pr.weight}kg × ${pr.reps} reps`
      }
      if (pr.weight && pr.timeSeconds) {
        return `${pr.weight}kg × ${formatTime(pr.timeSeconds)}`
      }
      return `Score: ${pr.value}`
    case 'MAX_TIME':
      return formatTime(pr.value)
    case 'MAX_REPS':
      return `${pr.value} reps`
    case 'MAX_WEIGHT':
      return `${pr.value}kg`
    default:
      return `${pr.value}`
  }
}

const rangeLabels: Record<TimeRange, string> = {
  '1w': 'Past Week',
  '1m': 'Past Month',
  '3m': 'Past 3 Months',
  '6m': 'Past 6 Months',
  all: 'All Time',
}

function StatsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [overview, setOverview] = useState<OverviewStats | null>(null)
  const [volumeHistory, setVolumeHistory] = useState<Array<WeekData>>([])
  const [topExercises, setTopExercises] = useState<Array<TopExercise>>([])
  const [muscleGroups, setMuscleGroups] = useState<Array<MuscleGroupData>>([])
  const [recentPRs, setRecentPRs] = useState<Array<PRData>>([])
  const [durationData, setDurationData] = useState<DurationData | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return

      setLoading(true)
      const startDate = getStartDateForRange(timeRange)

      try {
        const [overviewRes, volumeRes, exerciseRes, prsRes, durationRes] =
          await Promise.all([
            getOverviewStats({ data: { userId: user.id, startDate } }),
            getVolumeHistory({ data: { userId: user.id, startDate } }),
            getExerciseStats({ data: { userId: user.id, startDate } }),
            getRecentPRs({ data: { userId: user.id, limit: 5, startDate } }),
            getDurationStats({ data: { userId: user.id, startDate } }),
          ])

        setOverview(overviewRes.stats)
        setVolumeHistory(volumeRes.weeks)
        setTopExercises(exerciseRes.topExercises)
        setMuscleGroups(exerciseRes.muscleGroups)
        setRecentPRs(prsRes.prs)
        setDurationData(durationRes)
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user, timeRange])

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <AppLayout title="Stats">
        <div className="px-4 py-6 space-y-6">
          <div className="flex justify-center">
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Stats">
      <div className="px-4 py-6 space-y-6">
        {/* Time Range Selector */}
        <div className="flex justify-center">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </div>

        {/* Overview Stats */}
        <section>
          <h2 className="text-sm font-medium text-zinc-400 mb-3 px-1">
            {rangeLabels[timeRange]}
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

        {/* Workout Duration */}
        {durationData && durationData.sessionCount > 0 && (
          <section>
            <h2 className="text-sm font-medium text-zinc-400 mb-3 px-1 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Workout Duration
            </h2>
            <DurationStats data={durationData} />
          </section>
        )}

        {/* Volume Trend */}
        <section>
          <h2 className="text-sm font-medium text-zinc-400 mb-3 px-1 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Volume Trend
          </h2>
          <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <VolumeChart data={volumeHistory} />
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
                <div
                  key={ex.exerciseId}
                  className="p-3 flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-300">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{ex.name}</p>
                    {ex.muscleGroup && (
                      <MuscleGroupBadge
                        muscleGroup={ex.muscleGroup}
                        size="sm"
                      />
                    )}
                  </div>
                  <div className="text-sm text-zinc-400 mr-2">
                    {ex.setCount} sets
                  </div>
                  <button
                    onClick={() =>
                      navigate({
                        to: '/progress/$exerciseId',
                        params: { exerciseId: ex.exerciseId },
                      })
                    }
                    className="p-2 text-zinc-400 hover:text-blue-400 rounded-lg hover:bg-zinc-700/50 transition-colors focus:outline-none active:scale-95"
                    title="View progress"
                  >
                    <LineChart className="w-4 h-4" />
                  </button>
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
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <MuscleDonutChart data={muscleGroups} />
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
                      {formatPRDisplay(pr)}
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
