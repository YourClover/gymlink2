import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  Trophy,
  Weight,
} from 'lucide-react'
import type { Exercise, WorkoutSet } from '@prisma/client'
import AppLayout from '@/components/AppLayout'
import EmptyState from '@/components/ui/EmptyState'
import MoodRating from '@/components/workout/MoodRating'
import MuscleGroupBadge from '@/components/exercises/MuscleGroupBadge'
import {
  completeWorkoutSession,
  getWorkoutSession,
} from '@/lib/workouts.server'
import { useAuth } from '@/context/AuthContext'

export const Route = createFileRoute('/workout/summary/$sessionId')({
  component: WorkoutSummaryPage,
})

type SessionDetails = {
  id: string
  startedAt: Date
  completedAt: Date | null
  durationSeconds: number | null
  notes: string | null
  moodRating: number | null
  workoutPlan?: { id: string; name: string } | null
  planDay?: { id: string; name: string; dayOrder: number } | null
  workoutSets: Array<WorkoutSet & { exercise: Exercise }>
}

type ExerciseSummary = {
  exercise: Exercise
  sets: Array<WorkoutSet>
  totalVolume: number
}

function WorkoutSummaryPage() {
  const { sessionId } = Route.useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [session, setSession] = useState<SessionDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Editable fields (for incomplete sessions)
  const [notes, setNotes] = useState('')
  const [moodRating, setMoodRating] = useState<number | undefined>()

  // Expanded exercise tracking
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(
    null,
  )

  // Fetch session data
  useEffect(() => {
    const fetchSession = async () => {
      if (!user) return

      try {
        const result = await getWorkoutSession({
          data: { id: sessionId, userId: user.id },
        })

        if (!result.session) {
          // Session not found
          navigate({ to: '/workout' })
          return
        }

        setSession(result.session)
        setNotes(result.session.notes || '')
        setMoodRating(result.session.moodRating || undefined)
      } catch (error) {
        console.error('Failed to fetch session:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [user, sessionId, navigate])

  // Group sets by exercise
  const getExerciseSummaries = (): Array<ExerciseSummary> => {
    if (!session) return []

    const exerciseMap = new Map<string, ExerciseSummary>()

    for (const set of session.workoutSets) {
      const existing = exerciseMap.get(set.exerciseId)
      if (existing) {
        existing.sets.push(set)
        if (set.weight && set.reps) {
          existing.totalVolume += set.weight * set.reps
        }
      } else {
        exerciseMap.set(set.exerciseId, {
          exercise: set.exercise,
          sets: [set],
          totalVolume: set.weight && set.reps ? set.weight * set.reps : 0,
        })
      }
    }

    return Array.from(exerciseMap.values())
  }

  // Calculate stats
  const getStats = () => {
    if (!session)
      return { totalSets: 0, totalVolume: 0, duration: 0, exerciseCount: 0 }

    const workingSets = session.workoutSets.filter((s) => !s.isWarmup)
    const totalVolume = workingSets.reduce(
      (sum, set) => sum + (set.weight || 0) * (set.reps || 0),
      0,
    )

    const exerciseIds = new Set(session.workoutSets.map((s) => s.exerciseId))

    return {
      totalSets: workingSets.length,
      totalVolume,
      duration: session.durationSeconds || 0,
      exerciseCount: exerciseIds.size,
    }
  }

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Format volume
  const formatVolume = (kg: number) => {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(1)}t`
    }
    return `${kg.toLocaleString()}kg`
  }

  // Handle completing the workout
  const handleComplete = async () => {
    if (!user || !session) return

    setSaving(true)
    try {
      await completeWorkoutSession({
        data: {
          sessionId: session.id,
          userId: user.id,
          notes: notes || undefined,
          moodRating: moodRating,
        },
      })
      navigate({ to: '/workout', search: { completed: Date.now() } })
    } catch (error) {
      console.error('Failed to complete workout:', error)
    } finally {
      setSaving(false)
    }
  }

  // Handle done for already completed workouts
  const handleDone = () => {
    navigate({ to: '/workout' })
  }

  const exerciseSummaries = getExerciseSummaries()
  const stats = getStats()
  const isCompleted = session?.completedAt != null

  if (loading) {
    return (
      <AppLayout showNav={false}>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    )
  }

  if (!session) {
    return (
      <AppLayout showNav={false}>
        <EmptyState
          icon={<Dumbbell className="w-8 h-8" />}
          title="Session not found"
          description="This workout session could not be found."
          action={{
            label: 'Back to Workouts',
            onClick: () => navigate({ to: '/workout' }),
          }}
        />
      </AppLayout>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col safe-area-pt safe-area-pb">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800">
        <div className="flex items-center justify-center px-4 py-4">
          <h1 className="text-lg font-semibold text-white">Workout Summary</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Title section */}
        <div className="px-4 py-6 text-center border-b border-zinc-800">
          <div className="inline-flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            <span className="text-green-400 font-medium">
              {isCompleted ? 'Workout Complete' : 'Great Work!'}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white">
            {session.planDay?.name ||
              session.workoutPlan?.name ||
              'Quick Workout'}
          </h2>
          {session.planDay && (
            <p className="text-zinc-500 mt-1">
              Day {session.planDay.dayOrder} of {session.workoutPlan?.name}
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Duration */}
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-zinc-400">Duration</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatDuration(stats.duration)}
              </p>
            </div>

            {/* Total Sets */}
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-zinc-400">Working Sets</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.totalSets}</p>
            </div>

            {/* Total Volume */}
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <div className="flex items-center gap-2 mb-1">
                <Weight className="w-4 h-4 text-green-400" />
                <span className="text-sm text-zinc-400">Volume</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatVolume(stats.totalVolume)}
              </p>
            </div>

            {/* Exercises */}
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <div className="flex items-center gap-2 mb-1">
                <Dumbbell className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-zinc-400">Exercises</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {stats.exerciseCount}
              </p>
            </div>
          </div>
        </div>

        {/* Exercise Breakdown */}
        <div className="px-4 pb-4">
          <h3 className="text-lg font-semibold text-white mb-3">Exercises</h3>
          <div className="space-y-2">
            {exerciseSummaries.map((summary) => (
              <div
                key={summary.exercise.id}
                className="bg-zinc-800/50 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedExerciseId(
                      expandedExerciseId === summary.exercise.id
                        ? null
                        : summary.exercise.id,
                    )
                  }
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-white truncate">
                        {summary.exercise.name}
                      </h4>
                      <MuscleGroupBadge
                        muscleGroup={summary.exercise.muscleGroup}
                      />
                    </div>
                    <p className="text-sm text-zinc-500">
                      {summary.sets.filter((s) => !s.isWarmup).length} sets
                      {summary.totalVolume > 0 &&
                        ` · ${formatVolume(summary.totalVolume)}`}
                    </p>
                  </div>
                  {expandedExerciseId === summary.exercise.id ? (
                    <ChevronUp className="w-5 h-5 text-zinc-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-zinc-500" />
                  )}
                </button>

                {expandedExerciseId === summary.exercise.id && (
                  <div className="px-4 pb-4 space-y-2">
                    {summary.sets.map((set, index) => (
                      <div
                        key={set.id}
                        className={`flex items-center gap-3 p-2 rounded-lg ${
                          set.isWarmup ? 'bg-zinc-700/30' : 'bg-zinc-700/50'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            set.isWarmup
                              ? 'bg-zinc-600 text-zinc-400'
                              : 'bg-blue-600/30 text-blue-400'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          {set.weight != null && set.reps != null ? (
                            <span className="text-white">
                              {set.weight}kg × {set.reps}
                            </span>
                          ) : set.timeSeconds != null ? (
                            <span className="text-white">
                              {Math.floor(set.timeSeconds / 60)}:
                              {(set.timeSeconds % 60)
                                .toString()
                                .padStart(2, '0')}
                            </span>
                          ) : set.reps != null ? (
                            <span className="text-white">{set.reps} reps</span>
                          ) : (
                            <span className="text-zinc-500">No data</span>
                          )}
                        </div>
                        {set.isWarmup && (
                          <span className="px-2 py-0.5 text-xs bg-zinc-600 text-zinc-300 rounded">
                            Warmup
                          </span>
                        )}
                        {set.isDropset && (
                          <span className="px-2 py-0.5 text-xs bg-orange-600/30 text-orange-400 rounded">
                            Drop
                          </span>
                        )}
                        {set.rpe && (
                          <span className="px-2 py-0.5 text-xs bg-purple-600/30 text-purple-400 rounded">
                            RPE {set.rpe}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notes & Mood (only for incomplete sessions) */}
        {!isCompleted && (
          <div className="px-4 pb-4 space-y-4">
            {/* Mood Rating */}
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <h3 className="text-sm font-medium text-zinc-400 mb-3 text-center">
                How did you feel?
              </h3>
              <MoodRating value={moodRating} onChange={setMoodRating} />
            </div>

            {/* Notes */}
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How was your workout? Any notes for next time?"
                className="w-full px-3 py-2 bg-zinc-700/50 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Display notes & mood for completed sessions */}
        {isCompleted && (session.notes || session.moodRating) && (
          <div className="px-4 pb-4 space-y-4">
            {session.moodRating && (
              <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                <h3 className="text-sm font-medium text-zinc-400 mb-3 text-center">
                  Mood Rating
                </h3>
                <MoodRating value={session.moodRating} onChange={() => {}} />
              </div>
            )}
            {session.notes && (
              <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                <h3 className="text-sm font-medium text-zinc-400 mb-2">
                  Notes
                </h3>
                <p className="text-white">{session.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="p-4 border-t border-zinc-800 safe-area-mb">
        {isCompleted ? (
          <button
            onClick={handleDone}
            className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        ) : (
          <button
            onClick={handleComplete}
            disabled={saving}
            className="w-full py-4 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Complete Workout
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
