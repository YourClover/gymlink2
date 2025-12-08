import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/AppLayout'
import EmptyState from '@/components/ui/EmptyState'
import { getPlans, getPlan } from '@/lib/plans.server'
import { startWorkoutSession } from '@/lib/workouts.server'
import { useAuth } from '@/context/AuthContext'
import {
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Dumbbell,
  Moon,
  Play,
} from 'lucide-react'

export const Route = createFileRoute('/workout/select-day')({
  component: SelectDayPage,
})

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
  planDays?: PlanDay[]
}

function SelectDayPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [plans, setPlans] = useState<PlanWithDays[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null)
  const [loadingDays, setLoadingDays] = useState(false)
  const [startingWorkout, setStartingWorkout] = useState(false)

  // Fetch plans
  useEffect(() => {
    const fetchPlans = async () => {
      if (!user) return

      try {
        const result = await getPlans({ data: { userId: user.id } })
        setPlans(result.plans)
      } catch (error) {
        console.error('Failed to fetch plans:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [user])

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
            p.id === planId
              ? { ...p, planDays: result.plan!.planDays }
              : p,
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

    setStartingWorkout(true)
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
      setStartingWorkout(false)
    }
  }

  return (
    <AppLayout showNav={false}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 safe-area-pt">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={() => navigate({ to: '/workout' })}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-lg font-semibold text-white text-center pr-9">
            Select Workout
          </h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Dumbbell className="w-8 h-8" />}
              title="No workout plans"
              description="Create a workout plan first to start a structured workout."
              action={{
                label: 'Create Plan',
                onClick: () => navigate({ to: '/plans/new' }),
              }}
            />
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <p className="text-sm text-zinc-500 mb-2">
              Select a day to start your workout
            </p>

            {plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-zinc-800/50 rounded-xl overflow-hidden"
              >
                {/* Plan header */}
                <button
                  onClick={() => handleExpandPlan(plan.id)}
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-zinc-500">
                      {plan._count.planDays} day
                      {plan._count.planDays !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {expandedPlanId === plan.id ? (
                    <ChevronDown className="w-5 h-5 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-zinc-500" />
                  )}
                </button>

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
                            disabled={day.restDay || startingWorkout}
                            className={`w-full p-4 flex items-center gap-3 text-left transition-colors ${
                              day.restDay
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:bg-zinc-700/30'
                            }`}
                          >
                            {/* Day number */}
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
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
                                <Play className="w-4 h-4" />
                                <span className="text-sm font-medium">Start</span>
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
    </AppLayout>
  )
}
