import {
  createFileRoute,
  useLocation,
  useNavigate,
} from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  Calendar,
  ChevronRight,
  Clock,
  Dumbbell,
  Play,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import type { MuscleGroup } from '@prisma/client'
import { useAuth } from '@/context/AuthContext'
import AppLayout from '@/components/AppLayout'
import MuscleGroupBadge from '@/components/exercises/MuscleGroupBadge'
import {
  getActiveSession,
  getRecentWorkouts,
  startWorkoutSession,
} from '@/lib/workouts.server'
import {
  getDashboardStats,
  getNextWorkoutSuggestion,
} from '@/lib/dashboard.server'
import {
  formatDuration,
  formatElapsedTime,
  formatRelativeDate,
  formatVolume,
} from '@/lib/formatting'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

type Stats = {
  workoutsThisWeek: number
  totalVolumeThisWeek: number
  currentStreak: number
  prsThisWeek: number
}

type ActiveSession = {
  id: string
  startedAt: Date
  workoutPlan?: { name: string } | null
  planDay?: { name: string } | null
}

type WorkoutSuggestion = {
  planId: string
  planName: string
  dayId: string
  dayName: string
  dayOrder: number
  exerciseCount: number
  exercises: Array<{ id: string; name: string; muscleGroup: MuscleGroup }>
}

type RecentWorkout = {
  id: string
  completedAt: Date | null
  durationSeconds: number | null
  workoutPlan?: { name: string } | null
  planDay?: { name: string } | null
  _count: { workoutSets: number }
}

function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [suggestion, setSuggestion] = useState<WorkoutSuggestion | null>(null)
  const [recentWorkouts, setRecentWorkouts] = useState<Array<RecentWorkout>>([])
  const [startingWorkout, setStartingWorkout] = useState(false)
  const [greeting, setGreeting] = useState('Welcome')

  // Fetch all dashboard data
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        const [statsResult, sessionResult, suggestionResult, recentResult] =
          await Promise.all([
            getDashboardStats({ data: { userId: user.id } }),
            getActiveSession({ data: { userId: user.id } }),
            getNextWorkoutSuggestion({ data: { userId: user.id } }),
            getRecentWorkouts({ data: { userId: user.id, limit: 3 } }),
          ])

        setStats(statsResult.stats)
        setActiveSession(sessionResult.session)
        setSuggestion(suggestionResult.suggestion)
        setRecentWorkouts(recentResult.workouts)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, location.search])

  // Set time-based greeting after hydration
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  // Get motivational subtext based on stats
  const getSubtext = () => {
    if (!stats) return 'Ready to crush your workout?'
    if (stats.currentStreak >= 4)
      return `${stats.currentStreak} week streak! Keep it going!`
    if (stats.workoutsThisWeek >= 3) return "You're on fire this week!"
    if (stats.workoutsThisWeek > 0) return 'Great progress this week!'
    return 'Ready to crush your workout?'
  }

  // Start suggested workout
  const handleStartSuggestion = async () => {
    if (!user || !suggestion) return

    setStartingWorkout(true)
    try {
      await startWorkoutSession({
        data: {
          userId: user.id,
          planDayId: suggestion.dayId,
        },
      })
      navigate({ to: '/workout/active' })
    } catch (error) {
      console.error('Failed to start workout:', error)
    } finally {
      setStartingWorkout(false)
    }
  }

  return (
    <AppLayout>
      <div className="px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Welcome Section */}
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-white">
                {greeting}, {user?.name.split(' ')[0] ?? 'there'}!
              </h1>
              <p className="text-zinc-400">{getSubtext()}</p>
            </div>

            {/* Active Workout Banner */}
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
                        {formatElapsedTime(activeSession.startedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400">
                      {activeSession.planDay?.name ||
                        activeSession.workoutPlan?.name ||
                        'Quick workout'}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-blue-400" />
                </div>
              </button>
            )}

            {/* Today's Workout Suggestion */}
            {suggestion && !activeSession && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-800/50 border border-zinc-700/50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm text-zinc-500">Today's Workout</p>
                    <h3 className="text-lg font-semibold text-white">
                      {suggestion.dayName}
                    </h3>
                    <p className="text-sm text-zinc-400">
                      {suggestion.planName} · {suggestion.exerciseCount}{' '}
                      exercises
                    </p>
                  </div>
                  <button
                    onClick={handleStartSuggestion}
                    disabled={startingWorkout}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
                  >
                    {startingWorkout ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    Start
                  </button>
                </div>

                {/* Exercise preview */}
                {suggestion.exercises.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-zinc-700/50">
                    {suggestion.exercises.map((ex) => (
                      <div
                        key={ex.id}
                        className="flex items-center gap-1.5 px-2 py-1 bg-zinc-700/50 rounded-lg"
                      >
                        <span className="text-sm text-zinc-300">{ex.name}</span>
                        <MuscleGroupBadge muscleGroup={ex.muscleGroup} />
                      </div>
                    ))}
                    {suggestion.exerciseCount > 3 && (
                      <span className="px-2 py-1 text-sm text-zinc-500">
                        +{suggestion.exerciseCount - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate({ to: '/workout' })}
                className="p-4 rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors text-left"
              >
                <Dumbbell className="w-8 h-8 text-white mb-2" />
                <h3 className="font-semibold text-white">Start Workout</h3>
                <p className="text-sm text-blue-200">Begin a new session</p>
              </button>

              <button
                onClick={() => navigate({ to: '/plans' })}
                className="p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700 text-left"
              >
                <Calendar className="w-8 h-8 text-zinc-300 mb-2" />
                <h3 className="font-semibold text-white">View Plans</h3>
                <p className="text-sm text-zinc-400">Manage workouts</p>
              </button>
            </div>

            {/* Stats Overview */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white">This Week</h2>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={<Dumbbell className="w-5 h-5" />}
                  label="Workouts"
                  value={stats?.workoutsThisWeek.toString() ?? '0'}
                  subtext="sessions"
                />
                <StatCard
                  icon={<TrendingUp className="w-5 h-5" />}
                  label="Volume"
                  value={formatVolume(stats?.totalVolumeThisWeek ?? 0)}
                  subtext="kg lifted"
                />
                <StatCard
                  icon={<Calendar className="w-5 h-5" />}
                  label="Streak"
                  value={stats?.currentStreak.toString() ?? '0'}
                  subtext={stats?.currentStreak === 1 ? 'week' : 'weeks'}
                />
                <StatCard
                  icon={<Trophy className="w-5 h-5" />}
                  label="PRs"
                  value={stats?.prsThisWeek.toString() ?? '0'}
                  subtext="this week"
                />
              </div>
            </div>

            {/* Recent Workouts */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white">
                Recent Workouts
              </h2>
              {recentWorkouts.length === 0 ? (
                <div className="p-6 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-center">
                  <Dumbbell className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400">No workouts yet</p>
                  <p className="text-sm text-zinc-500 mt-1">
                    Start your first workout to track your progress
                  </p>
                  <button
                    onClick={() => navigate({ to: '/workout' })}
                    className="inline-block mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                  >
                    Start Workout
                  </button>
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
                                formatRelativeDate(workout.completedAt)}
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

function StatCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode
  label: string
  value: string
  subtext: string
}) {
  return (
    <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
      <div className="flex items-center gap-2 text-zinc-400 mb-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-zinc-500">{subtext}</div>
    </div>
  )
}
