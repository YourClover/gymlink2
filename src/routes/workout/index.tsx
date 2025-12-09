import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  ChevronRight,
  ClipboardList,
  Clock,
  Dumbbell,
  Play,
  Zap,
} from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import { useAuth } from '@/context/AuthContext'
import {
  getActiveSession,
  getRecentWorkouts,
  startWorkoutSession,
} from '@/lib/workouts.server'

export const Route = createFileRoute('/workout/')({
  component: WorkoutPage,
})

type ActiveSession = {
  id: string
  startedAt: Date
  workoutPlan?: { name: string } | null
  planDay?: { name: string } | null
}

type RecentWorkout = {
  id: string
  completedAt: Date | null
  durationSeconds: number | null
  workoutPlan?: { name: string } | null
  planDay?: { name: string } | null
  _count: { workoutSets: number }
}

function WorkoutPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [recentWorkouts, setRecentWorkouts] = useState<Array<RecentWorkout>>([])
  const [loading, setLoading] = useState(true)
  const [startingQuick, setStartingQuick] = useState(false)

  // Fetch active session and recent workouts
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        const [sessionResult, recentResult] = await Promise.all([
          getActiveSession({ data: { userId: user.id } }),
          getRecentWorkouts({ data: { userId: user.id, limit: 5 } }),
        ])

        setActiveSession(sessionResult.session)
        setRecentWorkouts(recentResult.workouts)
      } catch (error) {
        console.error('Failed to fetch workout data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  // Start quick workout
  const handleStartQuick = async () => {
    if (!user) return

    setStartingQuick(true)
    try {
      await startWorkoutSession({ data: { userId: user.id } })
      navigate({ to: '/workout/active' })
    } catch (error) {
      console.error('Failed to start workout:', error)
    } finally {
      setStartingQuick(false)
    }
  }

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  // Format elapsed time for active session
  const getElapsedTime = (startedAt: Date) => {
    const start = new Date(startedAt)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 60) {
      return `${diffMins} min ago`
    }
    const hours = Math.floor(diffMins / 60)
    return `${hours}h ${diffMins % 60}m ago`
  }

  // Format date for recent workouts
  const formatDate = (date: Date) => {
    const d = new Date(date)
    const now = new Date()
    const diffDays = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
    )

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <AppLayout title="Workout">
      <div className="px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Active Session Banner */}
            {activeSession && (
              <button
                onClick={() => navigate({ to: '/workout/active' })}
                className="w-full p-4 rounded-xl bg-gradient-to-r from-blue-600/30 to-blue-500/20 border border-blue-500/30"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-full bg-blue-500/20">
                    <Dumbbell className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">
                        Workout in Progress
                      </span>
                      <span className="px-2 py-0.5 text-xs bg-blue-500/30 text-blue-300 rounded-full">
                        Active
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400">
                      {activeSession.planDay?.name ||
                        activeSession.workoutPlan?.name ||
                        'Quick workout'}{' '}
                      · Started {getElapsedTime(activeSession.startedAt)}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-blue-400" />
                </div>
              </button>
            )}

            {/* Start Options */}
            <div className="space-y-4">
              {/* From Plan */}
              <div className="p-5 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-blue-600/20">
                    <ClipboardList className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">From Plan</h3>
                    <p className="text-sm text-zinc-400 mb-3">
                      Start a workout from your active plan
                    </p>
                    <button
                      onClick={() => navigate({ to: '/workout/select-day' })}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium transition-colors"
                    >
                      Select Plan Day
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Workout */}
              <div className="p-5 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-green-600/20">
                    <Zap className="w-6 h-6 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">
                      Quick Workout
                    </h3>
                    <p className="text-sm text-zinc-400 mb-3">
                      Start an empty workout and add exercises as you go
                    </p>
                    <button
                      onClick={handleStartQuick}
                      disabled={startingQuick}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                    >
                      {startingQuick ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      Start Empty
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Workouts */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white">
                Recent Workouts
              </h2>
              {recentWorkouts.length === 0 ? (
                <div className="p-6 rounded-xl bg-zinc-800/30 border border-zinc-700/30 text-center">
                  <p className="text-zinc-500 text-sm">
                    Your recent workouts will appear here for quick access
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentWorkouts.map((workout) => (
                    <button
                      key={workout.id}
                      onClick={() =>
                        navigate({
                          to: '/workout/summary/$sessionId',
                          params: { sessionId: workout.id },
                        })
                      }
                      className="w-full p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800/70 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-zinc-700/50">
                          <Dumbbell className="w-5 h-5 text-zinc-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white truncate">
                            {workout.planDay?.name ||
                              workout.workoutPlan?.name ||
                              'Quick Workout'}
                          </h4>
                          <div className="flex items-center gap-3 text-sm text-zinc-500">
                            <span>
                              {workout.completedAt &&
                                formatDate(workout.completedAt)}
                            </span>
                            {workout.durationSeconds && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {formatDuration(workout.durationSeconds)}
                              </span>
                            )}
                            <span>{workout._count.workoutSets} sets</span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-zinc-600" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
