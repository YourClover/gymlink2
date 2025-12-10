import {
  createFileRoute,
  Link,
  useLocation,
  useNavigate,
} from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Dumbbell,
  Moon,
  Play,
  Plus,
  Settings,
  Zap,
} from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import EmptyState from '@/components/ui/EmptyState'
import ImportPlanModal from '@/components/sharing/ImportPlanModal'
import { useAuth } from '@/context/AuthContext'
import { getPlan, getPlans } from '@/lib/plans.server'
import {
  getActiveSession,
  getRecentWorkouts,
  startWorkoutSession,
} from '@/lib/workouts.server'
import {
  formatDuration,
  formatElapsedTime,
  formatRelativeDate,
} from '@/lib/formatting'

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

type Plan = {
  id: string
  name: string
  description: string | null
  _count: { planDays: number }
}

type PlanDay = {
  id: string
  name: string
  dayOrder: number
  restDay: boolean
  _count?: { planExercises: number }
}

type PlanWithDays = Plan & {
  planDays?: Array<PlanDay>
}

function WorkoutPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Session and recent workouts state
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [recentWorkouts, setRecentWorkouts] = useState<Array<RecentWorkout>>([])
  const [loading, setLoading] = useState(true)
  const [startingQuick, setStartingQuick] = useState(false)

  // Plans state
  const [plans, setPlans] = useState<Array<PlanWithDays>>([])
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null)
  const [loadingDays, setLoadingDays] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [startingWorkout, setStartingWorkout] = useState<string | null>(null)

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        const [sessionResult, recentResult, plansResult] = await Promise.all([
          getActiveSession({ data: { userId: user.id } }),
          getRecentWorkouts({ data: { userId: user.id, limit: 5 } }),
          getPlans({ data: { userId: user.id } }),
        ])

        setActiveSession(sessionResult.session)
        setRecentWorkouts(recentResult.workouts)
        setPlans(plansResult.plans)
      } catch (error) {
        console.error('Failed to fetch workout data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, location.search])

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

  // Load days when plan is expanded
  const handleExpandPlan = async (planId: string) => {
    if (expandedPlanId === planId) {
      setExpandedPlanId(null)
      return
    }

    setExpandedPlanId(planId)

    // Check if days already loaded
    const plan = plans.find((p) => p.id === planId)
    if (plan?.planDays) return

    setLoadingDays(true)
    try {
      if (!user) return
      const result = await getPlan({ data: { id: planId, userId: user.id } })
      if (result.plan) {
        setPlans((prev) =>
          prev.map((p) =>
            p.id === planId ? { ...p, planDays: result.plan!.planDays } : p,
          ),
        )
      }
    } catch (error) {
      console.error('Failed to fetch plan days:', error)
    } finally {
      setLoadingDays(false)
    }
  }

  // Start workout from selected day
  const handleStartWorkout = async (planDay: PlanDay) => {
    if (!user || planDay.restDay) return

    setStartingWorkout(planDay.id)
    try {
      await startWorkoutSession({
        data: {
          userId: user.id,
          planDayId: planDay.id,
        },
      })
      navigate({ to: '/workout/active' })
    } catch (error) {
      console.error('Failed to start workout:', error)
    } finally {
      setStartingWorkout(null)
    }
  }

  // Handle plan import success
  const handleImportSuccess = (planId: string) => {
    navigate({ to: '/plans/$planId', params: { planId } })
  }

  return (
    <AppLayout title="Training">
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
                      · Started {formatElapsedTime(activeSession.startedAt)} ago
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-blue-400" />
                </div>
              </button>
            )}

            {/* Quick Workout */}
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-green-600/20">
                  <Zap className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-white">Quick Workout</h3>
                  <p className="text-sm text-zinc-500">
                    Start empty and add exercises as you go
                  </p>
                </div>
                <button
                  onClick={handleStartQuick}
                  disabled={startingQuick}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {startingQuick ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Start
                </button>
              </div>
            </div>

            {/* Your Plans Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Your Plans</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                    aria-label="Import plan"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <Link
                    to="/plans/new"
                    className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    aria-label="Create new plan"
                  >
                    <Plus className="w-5 h-5" />
                  </Link>
                </div>
              </div>

              {plans.length === 0 ? (
                <EmptyState
                  icon={<Dumbbell className="w-8 h-8" />}
                  title="No workout plans"
                  description="Create a plan to organize your training with structured workout days."
                  action={{
                    label: 'Create Plan',
                    onClick: () => navigate({ to: '/plans/new' }),
                  }}
                  secondaryAction={{
                    label: 'Import Plan',
                    onClick: () => setShowImportModal(true),
                  }}
                />
              ) : (
                <div className="space-y-2">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className="bg-zinc-800/50 rounded-xl overflow-hidden border border-zinc-700/50"
                    >
                      {/* Plan header */}
                      <div className="flex items-center">
                        <button
                          onClick={() => handleExpandPlan(plan.id)}
                          className="flex-1 p-4 flex items-center gap-3 text-left"
                        >
                          {expandedPlanId === plan.id ? (
                            <ChevronDown className="w-5 h-5 text-zinc-500" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-zinc-500" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white truncate">
                              {plan.name}
                            </h3>
                            <p className="text-sm text-zinc-500">
                              {plan._count.planDays} day
                              {plan._count.planDays !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </button>
                        <Link
                          to="/plans/$planId"
                          params={{ planId: plan.id }}
                          className="p-4 text-zinc-500 hover:text-white transition-colors"
                          aria-label="Edit plan"
                        >
                          <Settings className="w-5 h-5" />
                        </Link>
                      </div>

                      {/* Plan days (expanded) */}
                      {expandedPlanId === plan.id && (
                        <div className="border-t border-zinc-700/50">
                          {loadingDays ? (
                            <div className="p-4 flex justify-center">
                              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                          ) : plan.planDays && plan.planDays.length > 0 ? (
                            <div className="divide-y divide-zinc-700/50">
                              {plan.planDays.map((day) => (
                                <button
                                  key={day.id}
                                  onClick={() => handleStartWorkout(day)}
                                  disabled={
                                    day.restDay || startingWorkout === day.id
                                  }
                                  className={`w-full p-4 flex items-center gap-3 text-left transition-colors ${
                                    day.restDay
                                      ? 'opacity-50 cursor-not-allowed'
                                      : 'hover:bg-zinc-700/30'
                                  }`}
                                >
                                  {/* Day number */}
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                      day.restDay
                                        ? 'bg-zinc-700 text-zinc-400'
                                        : 'bg-blue-600/20 text-blue-400'
                                    }`}
                                  >
                                    {day.dayOrder}
                                  </div>

                                  {/* Day info */}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-white truncate">
                                      {day.name}
                                    </h4>
                                    <p className="text-sm text-zinc-500">
                                      {day.restDay ? (
                                        <span className="flex items-center gap-1">
                                          <Moon className="w-3.5 h-3.5" />
                                          Rest Day
                                        </span>
                                      ) : (
                                        `${day._count?.planExercises ?? 0} exercises`
                                      )}
                                    </p>
                                  </div>

                                  {/* Start button */}
                                  {!day.restDay && (
                                    <div className="flex items-center gap-1 text-blue-400">
                                      {startingWorkout === day.id ? (
                                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <Play className="w-4 h-4" />
                                      )}
                                      <span className="text-sm font-medium">
                                        Start
                                      </span>
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="p-4 text-sm text-zinc-500 text-center">
                              No days in this plan
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Workouts */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white">
                Recent Workouts
              </h2>
              {recentWorkouts.length === 0 ? (
                <div className="p-6 rounded-xl bg-zinc-800/30 border border-zinc-700/30 text-center">
                  <p className="text-zinc-500 text-sm">
                    Your recent workouts will appear here
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

      {/* Import Plan Modal */}
      <ImportPlanModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={handleImportSuccess}
      />
    </AppLayout>
  )
}
