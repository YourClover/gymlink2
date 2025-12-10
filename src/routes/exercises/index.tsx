import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Dumbbell, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Equipment, Exercise, MuscleGroup } from '@prisma/client'
import type { ExerciseFormData } from '@/components/forms/ExerciseForm'
import AppLayout from '@/components/AppLayout'
import SearchInput from '@/components/ui/SearchInput'
import EmptyState from '@/components/ui/EmptyState'
import ExerciseCard from '@/components/exercises/ExerciseCard'
import ExerciseFilters from '@/components/exercises/ExerciseFilters'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ExerciseForm from '@/components/forms/ExerciseForm'
import {
  createExercise,
  deleteExercise,
  getExercises,
  updateExercise,
} from '@/lib/exercises.server'
import { useAuth } from '@/context/AuthContext'

export const Route = createFileRoute('/exercises/')({
  component: ExercisesPage,
})

function ExercisesPage() {
  const { user } = useAuth()
  const [exercises, setExercises] = useState<Array<Exercise>>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | undefined>()
  const [equipment, setEquipment] = useState<Equipment | undefined>()
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null,
  )
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [exerciseToEdit, setExerciseToEdit] = useState<Exercise | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Fetch exercises
  useEffect(() => {
    const fetchExercises = async () => {
      setLoading(true)
      try {
        const result = await getExercises({
          data: {
            muscleGroup,
            equipment,
            search: search || undefined,
            userId: user?.id,
          },
        })
        setExercises(result.exercises)
      } catch (error) {
        console.error('Failed to fetch exercises:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchExercises()
  }, [muscleGroup, equipment, search, user?.id])

  const refreshExercises = async () => {
    try {
      const result = await getExercises({
        data: {
          muscleGroup,
          equipment,
          search: search || undefined,
          userId: user?.id,
        },
      })
      setExercises(result.exercises)
    } catch (error) {
      console.error('Failed to fetch exercises:', error)
    }
  }

  const handleCreateExercise = async (data: ExerciseFormData) => {
    if (!user?.id) return

    setIsCreating(true)
    try {
      await createExercise({
        data: {
          ...data,
          userId: user.id,
        },
      })
      await refreshExercises()
      setShowCreateModal(false)
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditExercise = async (data: ExerciseFormData) => {
    if (!user?.id || !exerciseToEdit) return

    setIsUpdating(true)
    try {
      await updateExercise({
        data: {
          id: exerciseToEdit.id,
          ...data,
          userId: user.id,
        },
      })
      await refreshExercises()
      setShowEditModal(false)
      setExerciseToEdit(null)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteExercise = async () => {
    if (!user?.id || !exerciseToEdit) return

    setIsUpdating(true)
    try {
      await deleteExercise({
        data: {
          id: exerciseToEdit.id,
          userId: user.id,
        },
      })
      await refreshExercises()
      setShowDeleteConfirm(false)
      setExerciseToEdit(null)
      setSelectedExercise(null)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <AppLayout title="Exercises">
      <div className="flex flex-col h-full">
        {/* Search and Filters */}
        <div className="flex-shrink-0 px-4 py-4 space-y-4 border-b border-zinc-800">
          <div className="flex gap-2">
            <div className="flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search exercises..."
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              aria-label="Create exercise"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <ExerciseFilters
            muscleGroup={muscleGroup}
            equipment={equipment}
            onMuscleGroupChange={setMuscleGroup}
            onEquipmentChange={setEquipment}
          />
        </div>

        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : exercises.length === 0 ? (
            <EmptyState
              icon={<Dumbbell className="w-8 h-8" />}
              title="No exercises found"
              description="Try adjusting your search or filters to find exercises."
            />
          ) : (
            <div className="p-4 space-y-2">
              <p className="text-sm text-zinc-500 mb-3">
                {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
              </p>
              {exercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onPress={() => setSelectedExercise(exercise)}
                  showDescription
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Exercise Detail Modal */}
      <Modal
        isOpen={!!selectedExercise}
        onClose={() => setSelectedExercise(null)}
        title={selectedExercise?.name}
      >
        {selectedExercise && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-zinc-800 rounded-full text-sm text-zinc-300">
                {selectedExercise.muscleGroup.replace('_', ' ')}
              </span>
              <span className="px-3 py-1 bg-zinc-800 rounded-full text-sm text-zinc-300">
                {selectedExercise.equipment}
              </span>
              <span className="px-3 py-1 bg-zinc-800 rounded-full text-sm text-zinc-300">
                {selectedExercise.exerciseType}
              </span>
              {selectedExercise.isTimed && (
                <span className="px-3 py-1 bg-blue-600/20 rounded-full text-sm text-blue-400">
                  Timed
                </span>
              )}
            </div>

            {selectedExercise.description && (
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-1">
                  Description
                </h4>
                <p className="text-white">{selectedExercise.description}</p>
              </div>
            )}

            {selectedExercise.instructions && (
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-1">
                  Instructions
                </h4>
                <p className="text-white">{selectedExercise.instructions}</p>
              </div>
            )}

            {selectedExercise.isCustom &&
              selectedExercise.userId === user?.id && (
                <div className="flex gap-3 pt-4 border-t border-zinc-800">
                  <button
                    onClick={() => {
                      setExerciseToEdit(selectedExercise)
                      setSelectedExercise(null)
                      setShowEditModal(true)
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 text-white font-medium rounded-xl hover:bg-zinc-700 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setExerciseToEdit(selectedExercise)
                      setSelectedExercise(null)
                      setShowDeleteConfirm(true)
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600/20 text-red-400 font-medium rounded-xl hover:bg-red-600/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
          </div>
        )}
      </Modal>

      {/* Create Exercise Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Custom Exercise"
      >
        <ExerciseForm
          onSubmit={handleCreateExercise}
          onCancel={() => setShowCreateModal(false)}
          isLoading={isCreating}
        />
      </Modal>

      {/* Edit Exercise Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setExerciseToEdit(null)
        }}
        title="Edit Exercise"
      >
        {exerciseToEdit && (
          <ExerciseForm
            initialData={{
              name: exerciseToEdit.name,
              description: exerciseToEdit.description ?? undefined,
              muscleGroup: exerciseToEdit.muscleGroup,
              equipment: exerciseToEdit.equipment,
              exerciseType: exerciseToEdit.exerciseType,
              isTimed: exerciseToEdit.isTimed,
              instructions: exerciseToEdit.instructions ?? undefined,
            }}
            onSubmit={handleEditExercise}
            onCancel={() => {
              setShowEditModal(false)
              setExerciseToEdit(null)
            }}
            isLoading={isUpdating}
          />
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Exercise"
        message={`Are you sure you want to delete "${exerciseToEdit?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDeleteExercise}
        onCancel={() => {
          setShowDeleteConfirm(false)
          setExerciseToEdit(null)
        }}
        variant="danger"
      />
    </AppLayout>
  )
}
