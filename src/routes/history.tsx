import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, Calendar, Clock, Dumbbell, Weight } from 'lucide-react'
import type { MuscleGroup } from '@prisma/client'
import { useAuth } from '@/context/AuthContext'
import AppLayout from '@/components/AppLayout'
import MuscleGroupBadge from '@/components/exercises/MuscleGroupBadge'
import { getRecentWorkouts } from '@/lib/workouts.server'

export const Route = createFileRoute('/history')({
  component: HistoryPage,
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

function HistoryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [workouts, setWorkouts] = useState<WorkoutHistory[]>([])

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return

      try {
        const result = await getRecentWorkouts({
          data: { userId: user.id, limit: 50 },
        })
        setWorkouts(result.workouts as WorkoutHistory[])
      } catch (error) {
        console.error('Failed to fetch workout history:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [user])

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--'
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const formatDate = (date: Date | null) => {
    if (!date) return '--'
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const getUniqueMuscles = (
    sets: WorkoutHistory['workoutSets'],
  ): MuscleGroup[] => {
    const muscles = new Set<MuscleGroup>()
    for (const set of sets) {
      if (set.exercise.muscleGroup) {
        muscles.add(set.exercise.muscleGroup)
      }
    }
    return Array.from(muscles).slice(0, 3)
  }

  if (loading) {
    return (
      <AppLayout title="Workout History" showNav={false}>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 safe-area-pt">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate({ to: '/profile' })}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-white">Workout History</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-3 safe-area-pb pb-8">
        {workouts.length === 0 ? (
          <div className="p-8 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-center">
            <Calendar className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              No workout history
            </h2>
            <p className="text-zinc-400 max-w-sm mx-auto">
              Complete your first workout to see your training history
            </p>
          </div>
        ) : (
          workouts.map((workout) => (
            <button
              key={workout.id}
              onClick={() =>
                navigate({
                  to: '/workout/summary/$sessionId',
                  params: { sessionId: workout.id },
                })
              }
              className="w-full p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 transition-colors text-left"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-white">
                    {workout.planDay?.name ||
                      workout.workoutPlan?.name ||
                      'Quick Workout'}
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {formatDate(workout.completedAt)}
                  </p>
                </div>
                <div className="text-right text-sm text-zinc-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDuration(workout.durationSeconds)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {getUniqueMuscles(workout.workoutSets).map((muscle) => (
                    <MuscleGroupBadge key={muscle} muscleGroup={muscle} size="sm" />
                  ))}
                </div>
                <div className="flex items-center gap-1 text-sm text-zinc-500">
                  <Dumbbell className="w-4 h-4" />
                  {workout._count.workoutSets} sets
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
