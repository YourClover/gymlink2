import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Calendar, Clock, Dumbbell, TrendingUp } from 'lucide-react'
import type { Equipment, MuscleGroup, RecordType } from '@prisma/client'
import type { TimeRange } from '@/components/progression/TimeRangeSelector'
import type { ProgressionDataPoint } from '@/lib/progression.server'
import type { ProgressionMetric } from '@/lib/progression-utils'
import { Skeleton, SkeletonStatsCard } from '@/components/ui/Skeleton'
import { SkeletonChart } from '@/components/ui/SocialSkeletons'
import EmptyState from '@/components/ui/EmptyState'
import { useAuth } from '@/context/AuthContext'
import MuscleGroupBadge from '@/components/exercises/MuscleGroupBadge'
import ProgressionChart from '@/components/progression/ProgressionChart'
import TimeRangeSelector, {
  getStartDateForRange,
} from '@/components/progression/TimeRangeSelector'
import MetricSelector from '@/components/progression/MetricSelector'
import {
  getExerciseProgression,
  getExerciseRecentSessions,
  getExerciseSummary,
} from '@/lib/progression.server'
import {
  calculateImprovement,
  getAvailableMetrics,
} from '@/lib/progression-utils'

export const Route = createFileRoute('/progress/$exerciseId')({
  component: ProgressPage,
})

type ExerciseSummary = {
  exercise: {
    id: string
    name: string
    muscleGroup: MuscleGroup
    equipment: Equipment
    isTimed: boolean
  }
  totalSessions: number
  firstTrained: string | null
  lastTrained: string | null
  currentPR: {
    recordType: RecordType
    value: number
    weight: number | null
    reps: number | null
    timeSeconds: number | null
    achievedAt: string
  } | null
}

type RecentSession = {
  id: string
  completedAt: string
  setCount: number
  bestWeight: number
  bestReps: number
  totalVolume: number
  bestTime: number
}

function ProgressPage() {
  const { exerciseId } = Route.useParams()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<ExerciseSummary | null>(null)
  const [dataPoints, setDataPoints] = useState<Array<ProgressionDataPoint>>([])
  const [recentSessions, setRecentSessions] = useState<Array<RecentSession>>([])
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [metric, setMetric] = useState<ProgressionMetric>('max_weight')

  // Get available metrics based on exercise type and equipment
  const availableMetrics = useMemo(() => {
    if (!summary) return []
    return getAvailableMetrics(
      summary.exercise.isTimed,
      summary.exercise.equipment,
    )
  }, [summary])

  // Set default metric when exercise loads
  useEffect(() => {
    if (availableMetrics.length > 0) {
      const currentValid = availableMetrics.find((m) => m.value === metric)
      if (!currentValid) {
        setMetric(availableMetrics[0].value)
      }
    }
  }, [availableMetrics])

  // Fetch summary and recent sessions
  useEffect(() => {
    const fetchSummary = async () => {
      if (!user) return

      try {
        const [summaryRes, sessionsRes] = await Promise.all([
          getExerciseSummary({ data: { userId: user.id, exerciseId } }),
          getExerciseRecentSessions({
            data: { userId: user.id, exerciseId, limit: 5 },
          }),
        ])

        setSummary(summaryRes)
        setRecentSessions(sessionsRes.sessions)
      } catch (error) {
        console.error('Failed to fetch exercise summary:', error)
      }
    }

    fetchSummary()
  }, [user, exerciseId])

  // Fetch progression data when metric or time range changes
  useEffect(() => {
    const fetchProgression = async () => {
      if (!user) return

      setLoading(true)
      try {
        const startDate = getStartDateForRange(timeRange)
        const result = await getExerciseProgression({
          data: {
            userId: user.id,
            exerciseId,
            metric,
            startDate,
          },
        })
        setDataPoints(result.dataPoints)
      } catch (error) {
        console.error('Failed to fetch progression:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProgression()
  }, [user, exerciseId, metric, timeRange])

  // Calculate improvement percentage
  const improvement = useMemo(() => {
    if (dataPoints.length < 2) return null
    const firstValue = dataPoints[0].value
    const lastValue = dataPoints[dataPoints.length - 1].value
    return calculateImprovement(firstValue, lastValue)
  }, [dataPoints])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }
    return `${secs}s`
  }

  const formatPR = () => {
    if (!summary?.currentPR) return null
    const pr = summary.currentPR
    switch (pr.recordType) {
      case 'MAX_VOLUME':
        if (pr.weight && pr.reps) {
          return `${pr.weight}kg x ${pr.reps}`
        }
        if (pr.weight && pr.timeSeconds) {
          return `${pr.weight}kg x ${formatTime(pr.timeSeconds)}`
        }
        return `${pr.value}`
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

  if (!summary && loading) {
    return (
      <div className="min-h-screen bg-zinc-900">
        <header className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 safe-area-pt">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="p-2 -ml-2 w-9 h-9" />
            <div className="flex-1">
              <Skeleton className="h-5 w-40 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </header>
        <div className="px-4 py-4 space-y-5">
          <SkeletonChart />
          <div className="grid grid-cols-3 gap-3">
            <SkeletonStatsCard />
            <SkeletonStatsCard />
            <SkeletonStatsCard />
          </div>
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-3">
            <Skeleton className="h-4 w-24 mb-3" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1">
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-zinc-900">
        <header className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 safe-area-pt">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => window.history.back()}
              className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-white">Progress</h1>
          </div>
        </header>
        <EmptyState
          icon={<Dumbbell className="w-8 h-8" />}
          title="Exercise not found"
          description="This exercise could not be found or has no data yet."
          action={{
            label: 'Go Back',
            onClick: () => window.history.back(),
          }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 safe-area-pt">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-white truncate">
              {summary.exercise.name}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <MuscleGroupBadge
                muscleGroup={summary.exercise.muscleGroup}
                size="sm"
              />
              <span className="text-xs text-zinc-500 capitalize">
                {summary.exercise.equipment.toLowerCase()}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-5 safe-area-pb pb-8">
        {/* Current PR */}
        {summary.currentPR && (
          <div
            className="p-4 rounded-xl bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 animate-fade-in"
            style={{ animationFillMode: 'backwards' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Personal Record</p>
                <p className="text-lg font-bold text-white">{formatPR()}</p>
              </div>
              <div className="ml-auto text-xs text-zinc-500">
                {formatDate(summary.currentPR.achievedAt)}
              </div>
            </div>
          </div>
        )}

        {/* Time Range Selector */}
        <div className="flex items-center justify-between">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          {availableMetrics.length > 1 && (
            <MetricSelector
              options={availableMetrics}
              value={metric}
              onChange={setMetric}
            />
          )}
        </div>

        {/* Chart */}
        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          {loading ? (
            <div className="h-[250px] flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : dataPoints.length === 0 ? (
            <div className="h-[250px] flex flex-col items-center justify-center text-center">
              <Dumbbell className="w-12 h-12 text-zinc-600 mb-3" />
              <p className="text-zinc-400 mb-1">No data for this period</p>
              <p className="text-sm text-zinc-500">
                {timeRange !== 'all'
                  ? 'Try a different time range'
                  : 'Complete workouts to see your progress'}
              </p>
            </div>
          ) : (
            <ProgressionChart data={dataPoints} metric={metric} />
          )}
        </div>

        {/* Stats Summary */}
        <div
          className="grid grid-cols-3 gap-3 animate-fade-in"
          style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
        >
          <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-center">
            <p className="text-xl font-bold text-white">
              {summary.totalSessions}
            </p>
            <p className="text-xs text-zinc-400">Sessions</p>
          </div>
          <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-center">
            <p className="text-xl font-bold text-white">
              {improvement !== null ? (
                <span
                  className={
                    improvement >= 0 ? 'text-green-400' : 'text-red-400'
                  }
                >
                  {improvement >= 0 ? '+' : ''}
                  {improvement}%
                </span>
              ) : (
                '-'
              )}
            </p>
            <p className="text-xs text-zinc-400">Progress</p>
          </div>
          <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-center">
            <p className="text-xl font-bold text-white">{dataPoints.length}</p>
            <p className="text-xs text-zinc-400">Data Points</p>
          </div>
        </div>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <section
            className="animate-fade-in"
            style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
          >
            <h2 className="text-sm font-medium text-zinc-400 mb-3 px-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Recent Sessions
            </h2>
            <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 divide-y divide-zinc-700/50">
              {recentSessions.map((session) => (
                <div key={session.id} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">
                      {formatDate(session.completedAt)}
                    </p>
                    <p className="text-sm text-zinc-400">
                      {session.setCount} sets
                    </p>
                  </div>
                  <div className="text-right">
                    {summary.exercise.isTimed ? (
                      <p className="text-sm font-medium text-white flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(session.bestTime)}
                      </p>
                    ) : summary.exercise.equipment === 'BODYWEIGHT' &&
                      session.bestWeight === 0 ? (
                      <>
                        <p className="text-sm font-medium text-white">
                          {session.bestReps} reps
                        </p>
                        <p className="text-xs text-zinc-500">
                          {session.setCount} sets
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-white">
                          {session.bestWeight}kg x {session.bestReps}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Vol: {session.totalVolume.toLocaleString()}kg
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* First/Last Trained */}
        {summary.firstTrained && (
          <div className="flex justify-between text-sm text-zinc-500 px-1">
            <span>First trained: {formatDate(summary.firstTrained)}</span>
            {summary.lastTrained && (
              <span>Last: {formatDate(summary.lastTrained)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
