import { useState } from 'react'
import { MuscleGroup, Equipment, ExerciseType } from '@prisma/client'

export interface ExerciseFormData {
  name: string
  description?: string
  muscleGroup: MuscleGroup
  equipment: Equipment
  exerciseType: ExerciseType
  isTimed: boolean
  instructions?: string
}

interface ExerciseFormProps {
  onSubmit: (data: ExerciseFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

const muscleGroups: { value: MuscleGroup; label: string }[] = [
  { value: 'CHEST', label: 'Chest' },
  { value: 'BACK', label: 'Back' },
  { value: 'LEGS', label: 'Legs' },
  { value: 'SHOULDERS', label: 'Shoulders' },
  { value: 'ARMS', label: 'Arms' },
  { value: 'CORE', label: 'Core' },
  { value: 'CARDIO', label: 'Cardio' },
  { value: 'FULL_BODY', label: 'Full Body' },
]

const equipmentOptions: { value: Equipment; label: string }[] = [
  { value: 'BARBELL', label: 'Barbell' },
  { value: 'DUMBBELL', label: 'Dumbbell' },
  { value: 'MACHINE', label: 'Machine' },
  { value: 'BODYWEIGHT', label: 'Bodyweight' },
  { value: 'CABLE', label: 'Cable' },
  { value: 'KETTLEBELL', label: 'Kettlebell' },
  { value: 'BANDS', label: 'Bands' },
  { value: 'NONE', label: 'None' },
]

const exerciseTypes: { value: ExerciseType; label: string }[] = [
  { value: 'STRENGTH', label: 'Strength' },
  { value: 'CARDIO', label: 'Cardio' },
  { value: 'FLEXIBILITY', label: 'Flexibility' },
  { value: 'PLYOMETRIC', label: 'Plyometric' },
]

export default function ExerciseForm({
  onSubmit,
  onCancel,
  isLoading = false,
}: ExerciseFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('CHEST')
  const [equipment, setEquipment] = useState<Equipment>('BARBELL')
  const [exerciseType, setExerciseType] = useState<ExerciseType>('STRENGTH')
  const [isTimed, setIsTimed] = useState(false)
  const [instructions, setInstructions] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Exercise name is required')
      return
    }

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        muscleGroup,
        equipment,
        exerciseType,
        isTimed,
        instructions: instructions.trim() || undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const selectClassName =
    'w-full px-4 py-3 bg-zinc-800 text-white rounded-xl border border-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="exercise-name"
          className="block text-sm font-medium text-zinc-400 mb-2"
        >
          Exercise Name *
        </label>
        <input
          id="exercise-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Incline Dumbbell Press"
          className="w-full px-4 py-3 bg-zinc-800 text-white placeholder-zinc-500 rounded-xl border border-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="muscle-group"
            className="block text-sm font-medium text-zinc-400 mb-2"
          >
            Muscle Group *
          </label>
          <select
            id="muscle-group"
            value={muscleGroup}
            onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup)}
            className={selectClassName}
          >
            {muscleGroups.map((mg) => (
              <option key={mg.value} value={mg.value}>
                {mg.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="equipment"
            className="block text-sm font-medium text-zinc-400 mb-2"
          >
            Equipment *
          </label>
          <select
            id="equipment"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value as Equipment)}
            className={selectClassName}
          >
            {equipmentOptions.map((eq) => (
              <option key={eq.value} value={eq.value}>
                {eq.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="exercise-type"
            className="block text-sm font-medium text-zinc-400 mb-2"
          >
            Exercise Type
          </label>
          <select
            id="exercise-type"
            value={exerciseType}
            onChange={(e) => setExerciseType(e.target.value as ExerciseType)}
            className={selectClassName}
          >
            {exerciseTypes.map((et) => (
              <option key={et.value} value={et.value}>
                {et.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end pb-1">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isTimed}
              onChange={(e) => setIsTimed(e.target.checked)}
              className="w-5 h-5 rounded bg-zinc-800 border-zinc-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-sm text-zinc-300">Timed exercise</span>
          </label>
        </div>
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-zinc-400 mb-2"
        >
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the exercise"
          rows={2}
          className="w-full px-4 py-3 bg-zinc-800 text-white placeholder-zinc-500 rounded-xl border border-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </div>

      <div>
        <label
          htmlFor="instructions"
          className="block text-sm font-medium text-zinc-400 mb-2"
        >
          Instructions
        </label>
        <textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Step-by-step instructions for performing the exercise"
          rows={3}
          className="w-full px-4 py-3 bg-zinc-800 text-white placeholder-zinc-500 rounded-xl border border-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-zinc-800 text-white font-medium rounded-xl hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Creating...' : 'Create Exercise'}
        </button>
      </div>
    </form>
  )
}
