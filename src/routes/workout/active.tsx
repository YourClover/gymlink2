import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { Dumbbell, Plus } from 'lucide-react'
import type { Exercise, PlanExercise, WorkoutSet } from '@prisma/client'
import AppLayout from '@/components/AppLayout'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Confetti from '@/components/ui/Confetti'
import PRToast from '@/components/ui/PRToast'
import WorkoutHeader from '@/components/workout/WorkoutHeader'
import ExerciseWorkoutCard from '@/components/workout/ExerciseWorkoutCard'
import SetLoggerModal from '@/components/workout/SetLoggerModal'
import RestTimer from '@/components/workout/RestTimer'
import ExercisePicker from '@/components/exercises/ExercisePicker'
import {
  deleteWorkoutSet,
  discardWorkoutSession,
  getActiveSession,
  logWorkoutSet,
} from '@/lib/workouts.server'
import { useAuth } from '@/context/AuthContext'

export const Route = createFileRoute('/workout/active')({
  component: ActiveWorkoutPage,
})

type WorkoutExercise = {
  exercise: Exercise
  planExercise?: PlanExercise | null
  sets: Array<WorkoutSet>
}

type SessionData = {
  id: string
  startedAt: Date
  workoutPlan?: { id: string; name: string } | null
  planDay?: {
    id: string
    name: string
    dayOrder: number
    planExercises: Array<{ exercise: Exercise } & PlanExercise>
  } | null
  workoutSets: Array<WorkoutSet & { exercise: Exercise }>
}

function ActiveWorkoutPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exercises, setExercises] = useState<Array<WorkoutExercise>>([])

  // Modal states
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [showIncompleteConfirm, setShowIncompleteConfirm] = useState(false)
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [loggingExercise, setLoggingExercise] =
    useState<WorkoutExercise | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Expanded exercise tracking
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(
    null,
  )

  // Rest timer state
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [restDuration, setRestDuration] = useState(60)
  const [nextSetInfo, setNextSetInfo] = useState<{
    exerciseName: string
    setNumber: number
  } | null>(null)

  // PR celebration state
  const [showConfetti, setShowConfetti] = useState(false)
  const [prToast, setPRToast] = useState<{
    exerciseName: string
    weight: number
    previousWeight?: number
  } | null>(null)

  // Fetch active session
  const fetchSession = useCallback(async () => {
    if (!user) return

    try {
      const result = await getActiveSession({ data: { userId: user.id } })

      if (!result.session) {
        // No active session, redirect to workout home
        navigate({ to: '/workout' })
        return
      }

      setSession(result.session)

      // Build exercises list from plan day and logged sets
      const exerciseMap = new Map<string, WorkoutExercise>()

      // Add exercises from plan day
      if (result.session.planDay?.planExercises) {
        for (const pe of result.session.planDay.planExercises) {
          exerciseMap.set(pe.exerciseId, {
            exercise: pe.exercise,
            planExercise: pe,
            sets: [],
          })
        }
      }

      // Add sets to their exercises (and create entries for extra exercises)
      for (const set of result.session.workoutSets) {
        const existing = exerciseMap.get(set.exerciseId)
        if (existing) {
          existing.sets.push(set)
        } else {
          // Extra exercise not in plan
          const entry = exerciseMap.get(set.exerciseId)
          if (entry) {
            entry.sets.push(set)
          } else {
            exerciseMap.set(set.exerciseId, {
              exercise: set.exercise,
              planExercise: null,
              sets: [set],
            })
          }
        }
      }

      setExercises(Array.from(exerciseMap.values()))

      // Auto-expand first exercise with incomplete sets
      if (!expandedExerciseId) {
        for (const [exerciseId, ex] of exerciseMap) {
          const targetSets = ex.planExercise?.targetSets ?? 0
          const completedSets = ex.sets.filter((s) => !s.isWarmup).length
          if (targetSets === 0 || completedSets < targetSets) {
            setExpandedExerciseId(exerciseId)
            break
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch session:', error)
    } finally {
      setLoading(false)
    }
  }, [user, navigate, expandedExerciseId])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  // Handle set logging
  const handleLogSet = async (setData: {
    reps?: number
    timeSeconds?: number
    weight?: number
    rpe?: number
    isWarmup: boolean
    isDropset: boolean
  }) => {
    if (!user || !session || !loggingExercise) return

    setIsSubmitting(true)
    try {
      const setNumber = loggingExercise.sets.length + 1

      const result = await logWorkoutSet({
        data: {
          workoutSessionId: session.id,
          exerciseId: loggingExercise.exercise.id,
          setNumber,
          reps: setData.reps,
          timeSeconds: setData.timeSeconds,
          weight: setData.weight,
          rpe: setData.rpe,
          isWarmup: setData.isWarmup,
          isDropset: setData.isDropset,
          userId: user.id,
        },
      })

      // Check for new PR and celebrate
      if (result.isNewPR && setData.weight) {
        setShowConfetti(true)
        setPRToast({
          exerciseName: loggingExercise.exercise.name,
          weight: setData.weight,
          previousWeight: result.previousRecord,
        })
      }

      // Close modal and refresh
      setLoggingExercise(null)
      await fetchSession()

      // Start rest timer
      const restSeconds = loggingExercise.planExercise?.restSeconds ?? 60
      setRestDuration(restSeconds)
      setNextSetInfo({
        exerciseName: loggingExercise.exercise.name,
        setNumber: setNumber + 1,
      })
      setShowRestTimer(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle set deletion
  const handleDeleteSet = async (setId: string) => {
    if (!user) return

    try {
      await deleteWorkoutSet({ data: { id: setId, userId: user.id } })
      await fetchSession()
    } catch (error) {
      console.error('Failed to delete set:', error)
    }
  }

  // Handle adding extra exercise
  const handleAddExercise = (exercise: Exercise) => {
    // Add exercise to list without plan targets
    setExercises((prev) => {
      const existing = prev.find((e) => e.exercise.id === exercise.id)
      if (existing) return prev

      return [
        ...prev,
        {
          exercise,
          planExercise: null,
          sets: [],
        },
      ]
    })
    setExpandedExerciseId(exercise.id)
  }

  // Handle workout discard
  const handleDiscard = async () => {
    if (!user || !session) return

    try {
      await discardWorkoutSession({
        data: { sessionId: session.id, userId: user.id },
      })
      navigate({ to: '/workout' })
    } catch (error) {
      console.error('Failed to discard workout:', error)
    }
  }

  // Check if all planned sets are complete
  const hasIncompleteSets = () => {
    for (const ex of exercises) {
      const targetSets = ex.planExercise?.targetSets ?? 0
      const completedSets = ex.sets.filter((s) => !s.isWarmup).length
      if (targetSets > 0 && completedSets < targetSets) {
        return true
      }
    }
    return false
  }

  // Handle finish workout
  const handleFinish = () => {
    if (session) {
      if (hasIncompleteSets()) {
        setShowIncompleteConfirm(true)
      } else {
        navigate({
          to: '/workout/summary/$sessionId',
          params: { sessionId: session.id },
        })
      }
    }
  }

  // Confirm finish with incomplete sets
  const handleConfirmFinish = () => {
    if (session) {
      setShowIncompleteConfirm(false)
      navigate({
        to: '/workout/summary/$sessionId',
        params: { sessionId: session.id },
      })
    }
  }

  // Handle back button
  const handleBack = () => {
    setShowDiscardConfirm(true)
  }

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
          title="No active workout"
          description="Start a workout to begin tracking your sets."
          action={{
            label: 'Start Workout',
            onClick: () => navigate({ to: '/workout' }),
          }}
        />
      </AppLayout>
    )
  }

  const existingExerciseIds = exercises.map((e) => e.exercise.id)

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col">
      <WorkoutHeader
        startedAt={session.startedAt}
        onBack={handleBack}
        onFinish={handleFinish}
        planName={session.workoutPlan?.name}
        dayName={session.planDay?.name}
      />

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto">
        {exercises.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Dumbbell className="w-8 h-8" />}
              title="No exercises yet"
              description="Add exercises to start logging your sets."
              action={{
                label: 'Add Exercise',
                onClick: () => setShowExercisePicker(true),
              }}
            />
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {exercises.map((ex) => (
              <ExerciseWorkoutCard
                key={ex.exercise.id}
                exercise={ex.exercise}
                sets={ex.sets}
                planExercise={ex.planExercise}
                isExpanded={expandedExerciseId === ex.exercise.id}
                onToggleExpand={() =>
                  setExpandedExerciseId(
                    expandedExerciseId === ex.exercise.id
                      ? null
                      : ex.exercise.id,
                  )
                }
                onLogSet={() => setLoggingExercise(ex)}
                onDeleteSet={handleDeleteSet}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Exercise FAB */}
      <button
        onClick={() => setShowExercisePicker(true)}
        className="fixed bottom-6 right-4 w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 active:bg-blue-800 transition-colors safe-area-mb"
        aria-label="Add exercise"
      >
        <Plus className="w-6 h-6 text-white" />
      </button>

      {/* Set Logger Modal */}
      {loggingExercise && (
        <SetLoggerModal
          isOpen={!!loggingExercise}
          onClose={() => setLoggingExercise(null)}
          onLog={handleLogSet}
          exercise={loggingExercise.exercise}
          setNumber={loggingExercise.sets.length + 1}
          defaultValues={{
            reps:
              loggingExercise.planExercise?.targetReps ??
              loggingExercise.sets[loggingExercise.sets.length - 1]?.reps ??
              10,
            timeSeconds:
              loggingExercise.planExercise?.targetTimeSeconds ??
              loggingExercise.sets[loggingExercise.sets.length - 1]
                ?.timeSeconds ??
              60,
            weight:
              loggingExercise.planExercise?.targetWeight ??
              loggingExercise.sets[loggingExercise.sets.length - 1]?.weight ??
              undefined,
          }}
          isLoading={isSubmitting}
        />
      )}

      {/* Exercise Picker */}
      <ExercisePicker
        isOpen={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onSelect={handleAddExercise}
        excludeIds={existingExerciseIds}
      />

      {/* Rest Timer */}
      <RestTimer
        isOpen={showRestTimer}
        onClose={() => setShowRestTimer(false)}
        durationSeconds={restDuration}
        nextSetInfo={nextSetInfo ?? undefined}
      />

      {/* Discard Confirmation */}
      <ConfirmDialog
        isOpen={showDiscardConfirm}
        title="Discard Workout?"
        message="Are you sure you want to discard this workout? All logged sets will be lost."
        confirmText="Discard"
        cancelText="Keep Going"
        onConfirm={handleDiscard}
        onCancel={() => setShowDiscardConfirm(false)}
        variant="danger"
      />

      {/* Incomplete Sets Confirmation */}
      <ConfirmDialog
        isOpen={showIncompleteConfirm}
        title="Finish Early?"
        message="You still have incomplete sets in your workout. Are you sure you want to finish?"
        confirmText="Finish Anyway"
        cancelText="Keep Going"
        onConfirm={handleConfirmFinish}
        onCancel={() => setShowIncompleteConfirm(false)}
      />

      {/* PR Celebration */}
      <Confetti
        active={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />

      {prToast && (
        <PRToast
          exerciseName={prToast.exerciseName}
          weight={prToast.weight}
          previousWeight={prToast.previousWeight}
          onClose={() => setPRToast(null)}
        />
      )}
    </div>
  )
}
