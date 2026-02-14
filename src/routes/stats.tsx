import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  Activity,
  BarChart3,
  Calendar,
  Clock,
  Dumbbell,
  Flame,
  LineChart,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Weight,
} from 'lucide-react'
import type { MuscleGroup, RecordType } from '@prisma/client'
import type { TimeRange } from '@/components/progression/TimeRangeSelector'
import { useAuth } from '@/context/AuthContext'
import AppLayout from '@/components/AppLayout'
import MuscleGroupBadge from '@/components/exercises/MuscleGroupBadge'
import TimeRangeSelector, {
  getStartDateForRange,
} from '@/components/progression/TimeRangeSelector'
import StatCard from '@/components/stats/StatCard'
import StatsSkeleton from '@/components/stats/StatsSkeleton'
import StatsSection from '@/components/stats/StatsSection'
import VolumeChart from '@/components/stats/VolumeChart'
import MuscleDonutChart from '@/components/stats/MuscleDonutChart'
import MuscleRadarChart from '@/components/stats/MuscleRadarChart'
import DurationStats from '@/components/stats/DurationStats'
import MoodStats from '@/components/stats/MoodStats'
import WeeklyHeatmap from '@/components/stats/WeeklyHeatmap'
import RpeChart from '@/components/stats/RpeChart'
import PrTimeline from '@/components/stats/PrTimeline'
import {
  getDurationStats,
  getExerciseStats,
  getMoodStats,
  getOverviewStats,
  getPrTimeline,
  getRpeStats,
  getVolumeHistory,
  getWorkoutConsistency,
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

type PreviousStats = {
  totalWorkouts: number
  totalTimeSeconds: number
  totalVolume: number
  totalPRs: number
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

type DurationData = {
  avgDurationSeconds: number
  maxDurationSeconds: number
  totalDurationSeconds: number
  sessionCount: number
  trend: Array<{ duration: number; date: string }>
}

type MoodData = {
  avgMood: number
  moodCount: number
  trend: Array<{ mood: number; date: string }>
}

type RpeData = {
  avgRpe: number
  totalRatedSets: number
  distribution: Record<number, number>
  trend: Array<{ avgRpe: number; date: string }>
}

type PrTimelineEntry = {
  id: string
  exerciseName: string
  muscleGroup: MuscleGroup | null
  recordType: RecordType
  value: number
  previousRecord: number | null
  improvement: number | null
  achievedAt: Date
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
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
  const [previousStats, setPreviousStats] = useState<PreviousStats | undefined>(
    undefined,
  )
  const [volumeHistory, setVolumeHistory] = useState<Array<WeekData>>([])
  const [topExercises, setTopExercises] = useState<Array<TopExercise>>([])
  const [muscleGroups, setMuscleGroups] = useState<Array<MuscleGroupData>>([])
  const [durationData, setDurationData] = useState<DurationData | null>(null)
  const [moodData, setMoodData] = useState<MoodData | null>(null)
  const [consistency, setConsistency] = useState<Record<string, number>>({})
  const [rpeData, setRpeData] = useState<RpeData | null>(null)
  const [prTimeline, setPrTimeline] = useState<Array<PrTimelineEntry>>([])

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return

      setLoading(true)
      const startDate = getStartDateForRange(timeRange)

      try {
        const [
          overviewRes,
          volumeRes,
          exerciseRes,
          durationRes,
          moodRes,
          consistencyRes,
          rpeRes,
          prTimelineRes,
        ] = await Promise.all([
          getOverviewStats({ data: { userId: user.id, startDate } }),
          getVolumeHistory({ data: { userId: user.id, startDate } }),
          getExerciseStats({ data: { userId: user.id, startDate } }),
          getDurationStats({ data: { userId: user.id, startDate } }),
          getMoodStats({ data: { userId: user.id, startDate } }),
          getWorkoutConsistency({ data: { userId: user.id } }),
          getRpeStats({ data: { userId: user.id, startDate } }),
          getPrTimeline({ data: { userId: user.id, limit: 5, startDate } }),
        ])

        setOverview(overviewRes.stats)
        setPreviousStats(overviewRes.previousStats)
        setVolumeHistory(volumeRes.weeks)
        setTopExercises(exerciseRes.topExercises)
        setMuscleGroups(exerciseRes.muscleGroups)
        setDurationData(durationRes)
        setMoodData(moodRes)
        setConsistency(consistencyRes.dayMap)
        setRpeData(rpeRes)
        setPrTimeline(prTimelineRes.timeline)
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user, timeRange])

  const hasPreviousStats = previousStats !== undefined && timeRange !== 'all'

  if (loading) {
    return (
      <AppLayout title="Stats">
        <div className="px-4 py-6 space-y-6">
          <div className="flex justify-center">
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          </div>
          <StatsSkeleton />
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

        {/* 1. Overview Hero Cards */}
        <section className="animate-fade-in" style={{ animationDelay: '0ms' }}>
          <h2 className="text-sm font-medium text-zinc-400 mb-3 px-1">
            {rangeLabels[timeRange]}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Dumbbell className="w-5 h-5" />}
              label="Workouts"
              value={overview?.totalWorkouts.toString() ?? '0'}
              color="blue"
              change={
                hasPreviousStats
                  ? {
                      value: percentChange(
                        overview?.totalWorkouts ?? 0,
                        previousStats.totalWorkouts,
                      ),
                      label: 'vs prev',
                    }
                  : undefined
              }
            />
            <StatCard
              icon={<Weight className="w-5 h-5" />}
              label="Volume"
              value={formatVolume(overview?.totalVolume ?? 0)}
              color="green"
              change={
                hasPreviousStats
                  ? {
                      value: percentChange(
                        overview?.totalVolume ?? 0,
                        previousStats.totalVolume,
                      ),
                      label: 'vs prev',
                    }
                  : undefined
              }
            />
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              label="Time"
              value={formatDuration(overview?.totalTimeSeconds ?? 0)}
              color="purple"
              change={
                hasPreviousStats
                  ? {
                      value: percentChange(
                        overview?.totalTimeSeconds ?? 0,
                        previousStats.totalTimeSeconds,
                      ),
                      label: 'vs prev',
                    }
                  : undefined
              }
            />
            <StatCard
              icon={<Trophy className="w-5 h-5" />}
              label="PRs"
              value={overview?.totalPRs.toString() ?? '0'}
              color="yellow"
              change={
                hasPreviousStats
                  ? {
                      value: percentChange(
                        overview?.totalPRs ?? 0,
                        previousStats.totalPRs,
                      ),
                      label: 'vs prev',
                    }
                  : undefined
              }
            />
          </div>
        </section>

        {/* 2. Streak Banner */}
        {overview && overview.currentStreak > 0 && (
          <div
            className="p-4 rounded-xl bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/30 animate-fade-in"
            style={{ animationDelay: '50ms' }}
          >
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

        {/* 3. Weekly Activity Heatmap */}
        {Object.keys(consistency).length > 0 && (
          <StatsSection
            icon={<Calendar className="w-4 h-4" />}
            title="Workout Consistency"
            subtitle="Last 16 weeks"
            style={{ animationDelay: '100ms' }}
          >
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <WeeklyHeatmap dayMap={consistency} />
            </div>
          </StatsSection>
        )}

        {/* 4. Volume Trend */}
        <StatsSection
          icon={<BarChart3 className="w-4 h-4" />}
          title="Volume Trend"
          style={{ animationDelay: '150ms' }}
        >
          <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <VolumeChart data={volumeHistory} />
          </div>
        </StatsSection>

        {/* 5. Workout Duration */}
        {durationData && durationData.sessionCount > 0 && (
          <StatsSection
            icon={<Clock className="w-4 h-4" />}
            title="Workout Duration"
            style={{ animationDelay: '200ms' }}
          >
            <DurationStats data={durationData} />
          </StatsSection>
        )}

        {/* 6. Mood */}
        {moodData && moodData.moodCount > 0 && (
          <StatsSection
            icon={<Star className="w-4 h-4" />}
            title="Mood"
            style={{ animationDelay: '250ms' }}
          >
            <MoodStats data={moodData} />
          </StatsSection>
        )}

        {/* 7. RPE Insights */}
        {rpeData && (
          <StatsSection
            icon={<Activity className="w-4 h-4" />}
            title="RPE Insights"
            subtitle={`${rpeData.totalRatedSets} rated sets`}
            style={{ animationDelay: '300ms' }}
          >
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <RpeChart data={rpeData} />
            </div>
          </StatsSection>
        )}

        {/* 8. Muscle Balance Radar + Donut */}
        {muscleGroups.length > 0 && (
          <StatsSection
            icon={<Target className="w-4 h-4" />}
            title="Muscle Balance"
            style={{ animationDelay: '350ms' }}
          >
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <MuscleRadarChart data={muscleGroups} />
            </div>
            <div className="mt-3 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <p className="text-xs font-medium text-zinc-400 mb-2">
                Set Distribution
              </p>
              <MuscleDonutChart data={muscleGroups} />
            </div>
          </StatsSection>
        )}

        {/* 9. Top Exercises */}
        {topExercises.length > 0 && (
          <StatsSection
            icon={<TrendingUp className="w-4 h-4" />}
            title="Most Trained"
            style={{ animationDelay: '400ms' }}
          >
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
          </StatsSection>
        )}

        {/* 10. Recent PRs */}
        {prTimeline.length > 0 && (
          <StatsSection
            icon={<Trophy className="w-4 h-4" />}
            title="Recent PRs"
            headerAction={
              <Link
                to="/prs"
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                View all &rarr;
              </Link>
            }
            style={{ animationDelay: '450ms' }}
          >
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <PrTimeline timeline={prTimeline} />
            </div>
          </StatsSection>
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
