import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Calendar, Filter, X } from 'lucide-react'
import type { MuscleGroup } from '@prisma/client'
import { useAuth } from '@/context/AuthContext'
import {
  getFilteredWorkouts,
  getMonthlyWorkoutDays,
  getRecentWorkouts,
} from '@/lib/workouts.server'
import { getPlans } from '@/lib/plans.server'
import { SkeletonWorkoutItem } from '@/components/ui/Skeleton'
import ExpandableWorkoutCard from '@/components/history/ExpandableWorkoutCard'
import MonthlyCalendar from '@/components/history/MonthlyCalendar'
import CalendarDayWorkouts from '@/components/history/CalendarDayWorkouts'
import ViewToggle from '@/components/history/ViewToggle'
import HistoryFilters from '@/components/history/HistoryFilters'

type HistorySearch = {
  view?: 'list' | 'calendar'
  muscles?: string
  planId?: string
  search?: string
  month?: number
  year?: number
}

export const Route = createFileRoute('/history')({
  component: HistoryPage,
  validateSearch: (search: Record<string, unknown>): HistorySearch => ({
    view: search.view === 'calendar' ? 'calendar' : undefined,
    muscles: typeof search.muscles === 'string' ? search.muscles : undefined,
    planId: typeof search.planId === 'string' ? search.planId : undefined,
    search: typeof search.search === 'string' ? search.search : undefined,
    month:
      typeof search.month === 'number'
        ? search.month
        : typeof search.month === 'string'
          ? parseInt(search.month, 10) || undefined
          : undefined,
    year:
      typeof search.year === 'number'
        ? search.year
        : typeof search.year === 'string'
          ? parseInt(search.year, 10) || undefined
          : undefined,
  }),
})

type WorkoutHistory = {
  id: string
  completedAt: Date | null
  durationSeconds: number | null
  workoutPlan?: { name: string } | null
  planDay?: { name: string } | null
  _count: { workoutSets: number }
  workoutSets: Array<{
    exercise: {
      name: string
      muscleGroup: MuscleGroup
    }
  }>
}

type WorkoutDaySummary = {
  id: string
  completedAt: Date | null
  durationSeconds: number | null
  workoutPlan: { name: string } | null
  planDay: { name: string } | null
  _count: { workoutSets: number }
  workoutSets: Array<{
    exercise: { name: string; muscleGroup: MuscleGroup }
  }>
}

type PlanOption = {
  id: string
  name: string
}

function HistoryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const searchParams = Route.useSearch()

  const view = searchParams.view ?? 'list'
  const selectedMuscles = searchParams.muscles
    ? (searchParams.muscles.split(',') as Array<MuscleGroup>)
    : []
  const selectedPlanId = searchParams.planId ?? ''
  const searchQuery = searchParams.search ?? ''

  const hasActiveFilters =
    selectedMuscles.length > 0 || selectedPlanId !== '' || searchQuery !== ''

  const [loading, setLoading] = useState(true)
  const [workouts, setWorkouts] = useState<Array<WorkoutHistory>>([])
  const [totalFiltered, setTotalFiltered] = useState(0)

  // Calendar state
  const now = new Date()
  const calendarMonth = searchParams.month ?? now.getMonth() + 1
  const calendarYear = searchParams.year ?? now.getFullYear()
  const [calendarData, setCalendarData] = useState<
    Record<number, Array<WorkoutDaySummary>>
  >({})
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [monthCache, setMonthCache] = useState<
    Map<string, Record<number, Array<WorkoutDaySummary>>>
  >(new Map())

  // Plans for filter dropdown
  const [plans, setPlans] = useState<Array<PlanOption>>([])

  // Fetch plans once
  useEffect(() => {
    if (!user) return
    getPlans({ data: { userId: user.id } }).then((result) => {
      setPlans(
        result.plans.map((p: { id: string; name: string }) => ({
          id: p.id,
          name: p.name,
        })),
      )
    })
  }, [user])

  // Fetch list data (filtered or unfiltered)
  useEffect(() => {
    if (!user || view !== 'list') return
    setLoading(true)

    if (hasActiveFilters) {
      getFilteredWorkouts({
        data: {
          userId: user.id,
          limit: 50,
          muscleGroups:
            selectedMuscles.length > 0 ? selectedMuscles : undefined,
          planId: selectedPlanId || undefined,
          exerciseSearch: searchQuery || undefined,
        },
      })
        .then((result) => {
          setWorkouts(result.workouts as Array<WorkoutHistory>)
          setTotalFiltered(result.total)
        })
        .catch((err) =>
          console.error('Failed to fetch filtered workouts:', err),
        )
        .finally(() => setLoading(false))
    } else {
      getRecentWorkouts({ data: { userId: user.id, limit: 50 } })
        .then((result) => {
          setWorkouts(result.workouts as Array<WorkoutHistory>)
          setTotalFiltered(result.workouts.length)
        })
        .catch((err) => console.error('Failed to fetch workout history:', err))
        .finally(() => setLoading(false))
    }
  }, [user, view, selectedMuscles.join(','), selectedPlanId, searchQuery])

  // Fetch calendar data
  const fetchCalendarMonth = useCallback(
    async (year: number, month: number) => {
      if (!user) return
      const cacheKey = `${year}-${month}`
      const cached = monthCache.get(cacheKey)
      if (cached) {
        setCalendarData(cached)
        return
      }

      setCalendarLoading(true)
      try {
        const result = await getMonthlyWorkoutDays({
          data: { userId: user.id, year, month },
        })
        const dayMap = result.dayMap as Record<number, Array<WorkoutDaySummary>>
        setCalendarData(dayMap)
        setMonthCache((prev) => new Map(prev).set(cacheKey, dayMap))
      } catch (err) {
        console.error('Failed to fetch calendar data:', err)
      } finally {
        setCalendarLoading(false)
      }
    },
    [user, monthCache],
  )

  useEffect(() => {
    if (view === 'calendar') {
      fetchCalendarMonth(calendarYear, calendarMonth)
    }
  }, [view, calendarYear, calendarMonth, fetchCalendarMonth])

  // Also stop loading on calendar view initial load
  useEffect(() => {
    if (view === 'calendar') {
      setLoading(false)
    }
  }, [view])

  const setView = (v: 'list' | 'calendar') => {
    navigate({
      to: '/history',
      search: {
        ...searchParams,
        view: v === 'list' ? undefined : v,
      },
      replace: true,
    })
  }

  const updateFilters = (updates: Partial<HistorySearch>) => {
    navigate({
      to: '/history',
      search: { ...searchParams, ...updates },
      replace: true,
    })
  }

  const clearFilters = () => {
    navigate({
      to: '/history',
      search: {
        view: searchParams.view,
        month: searchParams.month,
        year: searchParams.year,
      },
      replace: true,
    })
  }

  const navigateMonth = (year: number, month: number) => {
    setSelectedDay(null)
    navigate({
      to: '/history',
      search: { ...searchParams, year, month },
      replace: true,
    })
  }

  if (loading && view === 'list') {
    return (
      <div className="min-h-screen bg-zinc-900">
        <header className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 safe-area-pt">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => window.history.back()}
              className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-white">
              Workout History
            </h1>
          </div>
        </header>
        <div className="px-4 py-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonWorkoutItem key={i} />
          ))}
        </div>
      </div>
    )
  }

  const selectedDayWorkouts = selectedDay
    ? (calendarData[selectedDay] ?? [])
    : []

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 safe-area-pt">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-white">Workout History</h1>
          <div className="ml-auto">
            <ViewToggle value={view} onChange={setView} />
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-3 safe-area-pb pb-8">
        {/* Filters (list view) */}
        {view === 'list' && (
          <HistoryFilters
            selectedMuscles={selectedMuscles}
            selectedPlanId={selectedPlanId}
            searchQuery={searchQuery}
            plans={plans}
            onMuscleToggle={(muscle) => {
              const current = selectedMuscles
              const next = current.includes(muscle)
                ? current.filter((m) => m !== muscle)
                : [...current, muscle]
              updateFilters({
                muscles: next.length > 0 ? next.join(',') : undefined,
              })
            }}
            onPlanChange={(planId) =>
              updateFilters({ planId: planId || undefined })
            }
            onSearchChange={(search) =>
              updateFilters({ search: search || undefined })
            }
            onClearAll={clearFilters}
          />
        )}

        {/* Active filter summary */}
        {view === 'list' && hasActiveFilters && (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Filter className="w-3.5 h-3.5" />
            <span>
              {totalFiltered} workout{totalFiltered !== 1 ? 's' : ''} found
            </span>
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <>
            {workouts.length === 0 ? (
              <div className="p-8 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-center">
                <Calendar className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">
                  {hasActiveFilters
                    ? 'No matching workouts'
                    : 'No workout history'}
                </h2>
                <p className="text-zinc-400 max-w-sm mx-auto">
                  {hasActiveFilters
                    ? 'Try adjusting your filters'
                    : 'Complete your first workout to see your training history'}
                </p>
              </div>
            ) : (
              workouts.map((workout) => (
                <ExpandableWorkoutCard
                  key={workout.id}
                  workout={workout}
                  userId={user!.id}
                />
              ))
            )}
          </>
        )}

        {/* Calendar View */}
        {view === 'calendar' && (
          <>
            <MonthlyCalendar
              year={calendarYear}
              month={calendarMonth}
              dayMap={calendarData}
              selectedDay={selectedDay}
              loading={calendarLoading}
              onSelectDay={setSelectedDay}
              onNavigateMonth={navigateMonth}
            />
            {selectedDay && (
              <CalendarDayWorkouts
                year={calendarYear}
                month={calendarMonth}
                day={selectedDay}
                workouts={selectedDayWorkouts}
                userId={user!.id}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
