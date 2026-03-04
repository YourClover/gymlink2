import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  Pencil,
  Trophy,
  Weight,
} from 'lucide-react'
import type { AchievementRarity, Exercise, WorkoutSet } from '@prisma/client'
import AppLayout from '@/components/AppLayout'
import EmptyState from '@/components/ui/EmptyState'
import { Skeleton, SkeletonStatsCard } from '@/components/ui/Skeleton'
import MoodRating from '@/components/workout/MoodRating'
import MuscleGroupBadge from '@/components/exercises/MuscleGroupBadge'
import { AchievementToast } from '@/components/achievements'
import {
  completeWorkoutSession,
  getWorkoutSession,
  updateWorkoutSession,
  updateWorkoutSet,
} from '@/lib/workouts.server'
import { markAchievementsNotified } from '@/lib/achievements.server'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { formatVolume } from '@/lib/formatting'
import SetLoggerModal from '@/components/workout/SetLoggerModal'

interface NewAchievement {
  id: string
  userAchievementId: string
  code: string
  name: string
  description: string
  rarity: AchievementRarity
  icon: string
}

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
  const { user, token } = useAuth()
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

  // Calculated duration for incomplete sessions (avoids hydration mismatch)
  const [calculatedDuration, setCalculatedDuration] = useState<number | null>(
    null,
  )

  // Duration editing
  const [editedHours, setEditedHours] = useState<number | string>(0)
  const [editedMinutes, setEditedMinutes] = useState<number | string>(0)

  // Achievement toasts
  const [pendingAchievements, setPendingAchievements] = useState<
    Array<NewAchievement>
  >([])
  const [currentAchievement, setCurrentAchievement] =
    useState<NewAchievement | null>(null)

  // Set editing
  const [editingSet, setEditingSet] = useState<
    (WorkoutSet & { exercise: Exercise }) | null
  >(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const { showToast } = useToast()

  // Show achievements one by one
  useEffect(() => {
    if (!currentAchievement && pendingAchievements.length > 0) {
      setCurrentAchievement(pendingAchievements[0])
      setPendingAchievements((prev) => prev.slice(1))
    }
  }, [currentAchievement, pendingAchievements])

  // Fetch session data
  useEffect(() => {
    const fetchSession = async () => {
      if (!user) return

      try {
        const result = await getWorkoutSession({
          data: { id: sessionId, token },
        })

        if (!result.session) {
          // Session not found
          navigate({ to: '/workout' })
          return
        }

        setSession(result.session)
        setNotes(result.session.notes || '')
        setMoodRating(result.session.moodRating || undefined)

        // Initialize duration inputs
        if (result.session.durationSeconds) {
          const dur = result.session.durationSeconds
          setEditedHours(Math.floor(dur / 3600))
          setEditedMinutes(Math.floor((dur % 3600) / 60))
        } else {
          const dur = Math.floor(
            (Date.now() - new Date(result.session.startedAt).getTime()) / 1000,
          )
          setCalculatedDuration(dur)
          setEditedHours(Math.floor(dur / 3600))
          setEditedMinutes(Math.floor((dur % 3600) / 60))
        }
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

  // Edited duration in seconds
  const editedDurationSeconds =
    (typeof editedHours === 'string'
      ? parseInt(editedHours) || 0
      : editedHours) *
      3600 +
    (typeof editedMinutes === 'string'
      ? parseInt(editedMinutes) || 0
      : editedMinutes) *
      60

  // Calculate stats
  const getStats = () => {
    if (!session)
      return { totalSets: 0, totalVolume: 0, duration: 0, exerciseCount: 0 }

    const workingSets = session.workoutSets.filter(
      (s) => !s.isWarmup && !s.isDropset,
    )
    const totalVolume = workingSets.reduce(
      (sum, set) => sum + (set.weight || 0) * (set.reps || 0),
      0,
    )

    const exerciseIds = new Set(session.workoutSets.map((s) => s.exerciseId))

    const duration = editedDurationSeconds

    return {
      totalSets: workingSets.length,
      totalVolume,
      duration,
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

  // Auto-save duration on blur (completed sessions only)
  const saveDuration = async () => {
    if (!isCompleted || !user || !session) return
    if (editedDurationSeconds === session.durationSeconds) return
    try {
      await updateWorkoutSession({
        data: {
          sessionId: session.id,
          token,
          durationSeconds: editedDurationSeconds,
        },
      })
      setSession((prev) =>
        prev ? { ...prev, durationSeconds: editedDurationSeconds } : null,
      )
      showToast('success', 'Duration updated')
    } catch (error) {
      console.error('Failed to update duration:', error)
      showToast('error', 'Failed to update duration')
    }
  }

  // Handle completing the workout
  const handleComplete = async () => {
    if (!user || !session) return

    setSaving(true)
    try {
      const result = await completeWorkoutSession({
        data: {
          sessionId: session.id,
          token,
          notes: notes || undefined,
          moodRating: moodRating,
          durationSeconds: editedDurationSeconds,
        },
      })

      // Show achievement toasts if any were earned
      if (result.newAchievements.length > 0) {
        setPendingAchievements(result.newAchievements)
        // Mark as notified so they won't re-trigger
        markAchievementsNotified({
          data: {
            achievementIds: result.newAchievements.map(
              (a) => a.userAchievementId,
            ),
          },
        }).catch(console.error)
        // Update session to show as completed
        setSession((prev) =>
          prev
            ? {
                ...prev,
                completedAt: new Date(),
                durationSeconds: editedDurationSeconds,
                notes: notes || null,
                moodRating: moodRating || null,
              }
            : null,
        )
      } else {
        navigate({ to: '/workout', search: { completed: Date.now() } })
      }
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

  // Handle updating a set
  const handleUpdateSet = async (setData: {
    reps?: number
    timeSeconds?: number
    weight?: number
    rpe?: number
    isWarmup: boolean
    isDropset: boolean
  }) => {
    if (!user || !editingSet) return

    setIsUpdating(true)
    try {
      const result = await updateWorkoutSet({
        data: {
          id: editingSet.id,
          token,
          reps: setData.reps,
          timeSeconds: setData.timeSeconds,
          weight: setData.weight,
          rpe: setData.rpe,
          isWarmup: setData.isWarmup,
          isDropset: setData.isDropset,
        },
      })

      // Update local session state
      setSession((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          workoutSets: prev.workoutSets.map((s) =>
            s.id === editingSet.id
              ? { ...s, ...result.workoutSet, exercise: s.exercise }
              : s,
          ),
        }
      })

      showToast('success', 'Set updated successfully')
      setEditingSet(null)
    } catch (error) {
      console.error('Failed to update set:', error)
      showToast('error', 'Failed to update set')
    } finally {
      setIsUpdating(false)
    }
  }

  const exerciseSummaries = getExerciseSummaries()
  const stats = getStats()
  const isCompleted = session?.completedAt != null

  if (loading) {
    return (
      <AppLayout showNav={false}>
        <div className="p-4 space-y-4">
          <div className="text-center py-6">
            <div className="h-6 w-40 bg-zinc-800 animate-pulse rounded mx-auto mb-2" />
            <div className="h-8 w-48 bg-zinc-800 animate-pulse rounded mx-auto" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SkeletonStatsCard />
            <SkeletonStatsCard />
            <SkeletonStatsCard />
            <SkeletonStatsCard />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="w-5 h-5" />
                </div>
              </div>
            ))}
          </div>
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
      {/* Achievement Toast */}
      {currentAchievement && (
        <AchievementToast
          name={currentAchievement.name}
          description={currentAchievement.description}
          icon={currentAchievement.icon}
          rarity={currentAchievement.rarity}
          onClose={() => setCurrentAchievement(null)}
          autoCloseMs={5000}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
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
          <div
            className="grid grid-cols-2 gap-3 animate-fade-in"
            style={{ animationFillMode: 'backwards' }}
          >
            {/* Duration */}
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-zinc-400">Duration</span>
              </div>
              <div className="flex items-baseline gap-0.5">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={23}
                  value={editedHours}
                  onChange={(e) => {
                    if (e.target.value === '') return setEditedHours('')
                    const v = parseInt(e.target.value, 10)
                    if (!isNaN(v)) setEditedHours(Math.max(0, Math.min(23, v)))
                  }}
                  onBlur={saveDuration}
                  className="w-8 bg-transparent text-2xl font-bold text-white text-right focus:outline-none focus:bg-zinc-700/50 rounded px-0.5 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="text-lg font-bold text-zinc-500">h</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={59}
                  value={editedMinutes}
                  onChange={(e) => {
                    if (e.target.value === '') return setEditedMinutes('')
                    const v = parseInt(e.target.value, 10)
                    if (!isNaN(v))
                      setEditedMinutes(Math.max(0, Math.min(59, v)))
                  }}
                  onBlur={saveDuration}
                  className="w-8 bg-transparent text-2xl font-bold text-white text-right focus:outline-none focus:bg-zinc-700/50 rounded px-0.5 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="text-lg font-bold text-zinc-500">m</span>
              </div>
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
            {exerciseSummaries.map((summary, index) => (
              <div
                key={summary.exercise.id}
                className="bg-zinc-800/50 rounded-xl overflow-hidden border border-zinc-700/50 animate-fade-in"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'backwards',
                }}
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
                    {summary.sets.map((set, setIndex) => (
                      <button
                        key={set.id}
                        onClick={() => {
                          const matchingSet = session.workoutSets.find(
                            (s) => s.id === set.id,
                          )
                          if (matchingSet) setEditingSet(matchingSet)
                        }}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                          set.isWarmup
                            ? 'bg-zinc-700/30 hover:bg-zinc-700/50'
                            : 'bg-zinc-700/50 hover:bg-zinc-700/70'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            set.isWarmup
                              ? 'bg-zinc-600 text-zinc-400'
                              : 'bg-blue-600/30 text-blue-400'
                          }`}
                        >
                          {setIndex + 1}
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
                        <Pencil className="w-3.5 h-3.5 text-zinc-500" />
                      </button>
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

      {/* Edit Set Modal */}
      {editingSet && (
        <SetLoggerModal
          isOpen={!!editingSet}
          onClose={() => setEditingSet(null)}
          onLog={handleUpdateSet}
          exercise={editingSet.exercise}
          setNumber={editingSet.setNumber}
          defaultValues={{
            weight: editingSet.weight ?? undefined,
            reps: editingSet.reps ?? undefined,
            timeSeconds: editingSet.timeSeconds ?? undefined,
            rpe: editingSet.rpe ?? undefined,
            isWarmup: editingSet.isWarmup,
            isDropset: editingSet.isDropset,
          }}
          isLoading={isUpdating}
          mode="edit"
        />
      )}

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
