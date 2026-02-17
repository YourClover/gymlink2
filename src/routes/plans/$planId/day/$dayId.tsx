import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  Dumbbell,
  Moon,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import type { Exercise } from '@prisma/client'
import AppLayout from '@/components/AppLayout'
import { Skeleton } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import PlanExerciseCard from '@/components/plans/PlanExerciseCard'
import PlanDayForm from '@/components/forms/PlanDayForm'
import ExerciseTargetsForm from '@/components/forms/ExerciseTargetsForm'
import ExercisePicker from '@/components/exercises/ExercisePicker'
import {
  addPlanExercise,
  deletePlanDay,
  getPlanDay,
  removePlanExercise,
  reorderPlanExercises,
  updatePlanDay,
  updatePlanExercise,
} from '@/lib/plans.server'
import { useAuth } from '@/context/AuthContext'
import type { PlanRole } from '@/lib/plan-auth'

export const Route = createFileRoute('/plans/$planId/day/$dayId')({
  component: DayDetailPage,
})

type PlanExercise = {
  id: string
  exerciseOrder: number
  targetSets: number
  targetReps: number | null
  targetTimeSeconds: number | null
  targetWeight: number | null
  restSeconds: number
  notes: string | null
  exercise: Exercise
}

type PlanDay = {
  id: string
  name: string
  dayOrder: number
  restDay: boolean
  workoutPlan: { id: string; name: string }
  planExercises: Array<PlanExercise>
}

function DayDetailPage() {
  const { planId, dayId } = Route.useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const router = useRouter()

  const [planDay, setPlanDay] = useState<PlanDay | null>(null)
  const [access, setAccess] = useState<{
    isOwner: boolean
    role: PlanRole | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editingExercise, setEditingExercise] = useState<PlanExercise | null>(
    null,
  )
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null,
  )
  const [exerciseToRemove, setExerciseToRemove] = useState<PlanExercise | null>(
    null,
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canEdit = access?.role === 'OWNER' || access?.role === 'EDITOR'

  const fetchPlanDay = useCallback(async () => {
    if (!user) return

    try {
      const result = await getPlanDay({ data: { id: dayId, userId: user.id } })
      setPlanDay(result.planDay)
      setAccess(result.access)
    } catch (error) {
      console.error('Failed to fetch plan day:', error)
    } finally {
      setLoading(false)
    }
  }, [dayId, user])

  useEffect(() => {
    fetchPlanDay()
  }, [fetchPlanDay])

  const handleEditDay = async (data: { name: string; restDay: boolean }) => {
    if (!user) return

    setIsSubmitting(true)
    try {
      await updatePlanDay({
        data: {
          id: dayId,
          name: data.name,
          restDay: data.restDay,
          userId: user.id,
        },
      })
      await fetchPlanDay()
      setShowEditModal(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteDay = async () => {
    if (!user) return

    setIsSubmitting(true)
    try {
      await deletePlanDay({ data: { id: dayId, userId: user.id } })
      navigate({ to: '/plans/$planId', params: { planId } })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExerciseSelect = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setShowExercisePicker(false)
  }

  const handleAddExercise = async (targets: {
    targetSets: number
    targetReps?: number
    targetTimeSeconds?: number
    targetWeight?: number
    restSeconds: number
    notes?: string
  }) => {
    if (!user || !planDay || !selectedExercise) return

    setIsSubmitting(true)
    try {
      await addPlanExercise({
        data: {
          planDayId: dayId,
          exerciseId: selectedExercise.id,
          exerciseOrder: planDay.planExercises.length + 1,
          targetSets: targets.targetSets,
          targetReps: targets.targetReps,
          targetTimeSeconds: targets.targetTimeSeconds,
          targetWeight: targets.targetWeight,
          restSeconds: targets.restSeconds,
          notes: targets.notes,
          userId: user.id,
        },
      })
      await fetchPlanDay()
      setSelectedExercise(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateExercise = async (targets: {
    targetSets: number
    targetReps?: number
    targetTimeSeconds?: number
    targetWeight?: number
    restSeconds: number
    notes?: string
  }) => {
    if (!user || !editingExercise) return

    setIsSubmitting(true)
    try {
      await updatePlanExercise({
        data: {
          id: editingExercise.id,
          targetSets: targets.targetSets,
          targetReps: targets.targetReps,
          targetTimeSeconds: targets.targetTimeSeconds,
          targetWeight: targets.targetWeight,
          restSeconds: targets.restSeconds,
          notes: targets.notes,
          userId: user.id,
        },
      })
      await fetchPlanDay()
      setEditingExercise(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveExercise = async () => {
    if (!user || !exerciseToRemove) return

    setIsSubmitting(true)
    try {
      await removePlanExercise({
        data: {
          id: exerciseToRemove.id,
          userId: user.id,
        },
      })
      await fetchPlanDay()
      setExerciseToRemove(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMoveExercise = async (
    index: number,
    direction: 'up' | 'down',
  ) => {
    if (!user || !planDay) return

    const exercises = [...planDay.planExercises]
    const newIndex = direction === 'up' ? index - 1 : index + 1

    // Swap exercises
    const temp = exercises[index]
    exercises[index] = exercises[newIndex]
    exercises[newIndex] = temp

    // Optimistically update UI
    const originalExercises = planDay.planExercises
    setPlanDay({ ...planDay, planExercises: exercises })

    try {
      await reorderPlanExercises({
        data: {
          planDayId: dayId,
          exerciseIds: exercises.map((e) => e.id),
          userId: user.id,
        },
      })
    } catch (error) {
      // Rollback on error
      setPlanDay({ ...planDay, planExercises: originalExercises })
      console.error('Failed to reorder exercises:', error)
    }
  }

  if (loading) {
    return (
      <AppLayout showNav={false}>
        <div className="p-4 space-y-4">
          <div className="text-center">
            <Skeleton className="h-3 w-24 mx-auto mb-1" />
            <Skeleton className="h-6 w-40 mx-auto" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!planDay) {
    return (
      <AppLayout showNav={false}>
        <div className="p-4">
          <EmptyState
            icon={<Dumbbell className="w-8 h-8" />}
            title="Day not found"
            description="This day doesn't exist or you don't have access to it."
            action={{
              label: 'Go to Plan',
              onClick: () =>
                navigate({ to: '/plans/$planId', params: { planId } }),
            }}
          />
        </div>
      </AppLayout>
    )
  }

  const existingExerciseIds = planDay.planExercises.map((pe) => pe.exercise.id)

  return (
    <AppLayout showNav={false}>
      {/* Custom Header */}
      <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 safe-area-pt">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.history.back()}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 text-center px-4">
            <p className="text-xs text-zinc-500">{planDay.workoutPlan.name}</p>
            <h1 className="text-lg font-semibold text-white truncate">
              Day {planDay.dayOrder}: {planDay.name}
            </h1>
          </div>

          {canEdit ? (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 -mr-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
                aria-label="Menu"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {/* Dropdown menu */}
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-800 rounded-xl shadow-lg border border-zinc-700 overflow-hidden z-20">
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        setShowEditModal(true)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-zinc-700 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit Day
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        setShowDeleteConfirm(true)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-zinc-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Day
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="w-9" />
          )}
        </div>
      </header>

      {/* Rest day indicator */}
      {planDay.restDay && (
        <div className="px-4 py-6 text-center border-b border-zinc-800">
          <Moon className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-white mb-1">Rest Day</h2>
          <p className="text-zinc-400">Take it easy and recover.</p>
        </div>
      )}

      {/* Exercises list */}
      {!planDay.restDay && (
        <div className="flex-1">
          {planDay.planExercises.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<Dumbbell className="w-8 h-8" />}
                title="No exercises yet"
                description={
                  canEdit
                    ? 'Add exercises to this day to build your workout.'
                    : 'No exercises have been added to this day yet.'
                }
                action={
                  canEdit
                    ? {
                        label: 'Add Exercise',
                        onClick: () => setShowExercisePicker(true),
                      }
                    : undefined
                }
              />
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <p className="text-sm text-zinc-500 mb-2">
                {planDay.planExercises.length} exercise
                {planDay.planExercises.length !== 1 ? 's' : ''}
              </p>
              {planDay.planExercises.map((planExercise, index) => (
                <div
                  key={planExercise.id}
                  className="animate-fade-in"
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animationFillMode: 'backwards',
                  }}
                >
                  <PlanExerciseCard
                    planExercise={planExercise}
                    onPress={
                      canEdit
                        ? () => setEditingExercise(planExercise)
                        : undefined
                    }
                    onRemove={
                      canEdit
                        ? () => setExerciseToRemove(planExercise)
                        : undefined
                    }
                    showReorder={canEdit && planDay.planExercises.length > 1}
                    isFirst={index === 0}
                    isLast={index === planDay.planExercises.length - 1}
                    onMoveUp={
                      canEdit
                        ? () => handleMoveExercise(index, 'up')
                        : undefined
                    }
                    onMoveDown={
                      canEdit
                        ? () => handleMoveExercise(index, 'down')
                        : undefined
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Exercise Button - only for editors/owners */}
      {canEdit && !planDay.restDay && (
        <div className="p-4 border-t border-zinc-800 safe-area-pb">
          <button
            onClick={() => setShowExercisePicker(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Exercise
          </button>
        </div>
      )}

      {/* Edit Day Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Day"
      >
        <PlanDayForm
          initialData={{ name: planDay.name, restDay: planDay.restDay }}
          onSubmit={handleEditDay}
          onCancel={() => setShowEditModal(false)}
          isLoading={isSubmitting}
          submitLabel="Save Changes"
        />
      </Modal>

      {/* Exercise Picker */}
      <ExercisePicker
        isOpen={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onSelect={handleExerciseSelect}
        excludeIds={existingExerciseIds}
      />

      {/* Add Exercise Targets Modal */}
      <Modal
        isOpen={!!selectedExercise}
        onClose={() => setSelectedExercise(null)}
        title="Set Targets"
      >
        {selectedExercise && (
          <ExerciseTargetsForm
            exercise={selectedExercise}
            onSubmit={handleAddExercise}
            onCancel={() => setSelectedExercise(null)}
            isLoading={isSubmitting}
            submitLabel="Add Exercise"
          />
        )}
      </Modal>

      {/* Edit Exercise Targets Modal */}
      <Modal
        isOpen={!!editingExercise}
        onClose={() => setEditingExercise(null)}
        title="Edit Targets"
      >
        {editingExercise && (
          <ExerciseTargetsForm
            exercise={editingExercise.exercise}
            initialData={{
              targetSets: editingExercise.targetSets,
              targetReps: editingExercise.targetReps ?? undefined,
              targetTimeSeconds: editingExercise.targetTimeSeconds ?? undefined,
              targetWeight: editingExercise.targetWeight ?? undefined,
              restSeconds: editingExercise.restSeconds,
              notes: editingExercise.notes ?? undefined,
            }}
            onSubmit={handleUpdateExercise}
            onCancel={() => setEditingExercise(null)}
            isLoading={isSubmitting}
            submitLabel="Save Changes"
          />
        )}
      </Modal>

      {/* Delete Day Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Day"
        message={`Are you sure you want to delete "${planDay.name}"? This will also delete all exercises in this day. This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDeleteDay}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="danger"
      />

      {/* Remove Exercise Confirmation */}
      <ConfirmDialog
        isOpen={!!exerciseToRemove}
        title="Remove Exercise"
        message={`Are you sure you want to remove "${exerciseToRemove?.exercise.name}" from this day?`}
        confirmText="Remove"
        onConfirm={handleRemoveExercise}
        onCancel={() => setExerciseToRemove(null)}
        variant="danger"
      />
    </AppLayout>
  )
}
