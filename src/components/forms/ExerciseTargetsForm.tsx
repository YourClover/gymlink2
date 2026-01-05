import { useState } from 'react'
import type { Exercise } from '@prisma/client'
import { parseDecimalInput } from '@/lib/formatting'

interface ExerciseTargets {
  targetSets: number
  targetReps?: number
  targetTimeSeconds?: number
  targetWeight?: number
  restSeconds: number
  notes?: string
}

interface ExerciseTargetsFormProps {
  exercise: Exercise
  initialData?: Partial<ExerciseTargets>
  onSubmit: (data: ExerciseTargets) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  submitLabel?: string
}

const REST_PRESETS = [30, 60, 90, 120, 180]

export default function ExerciseTargetsForm({
  exercise,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save',
}: ExerciseTargetsFormProps) {
  const [targetSets, setTargetSets] = useState(initialData?.targetSets ?? 3)
  const [targetReps, setTargetReps] = useState(initialData?.targetReps ?? 10)
  const [targetTimeSeconds, setTargetTimeSeconds] = useState(
    initialData?.targetTimeSeconds ?? 60,
  )
  const [targetWeight, setTargetWeight] = useState(
    initialData?.targetWeight ?? undefined,
  )
  const [restSeconds, setRestSeconds] = useState(initialData?.restSeconds ?? 60)
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (targetSets < 1) {
      setError('At least 1 set is required')
      return
    }

    try {
      await onSubmit({
        targetSets,
        targetReps: exercise.isTimed ? undefined : targetReps,
        targetTimeSeconds: exercise.isTimed ? targetTimeSeconds : undefined,
        targetWeight: targetWeight || undefined,
        restSeconds,
        notes: notes.trim() || undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Exercise info */}
      <div className="p-3 bg-zinc-800 rounded-xl">
        <h3 className="font-medium text-white">{exercise.name}</h3>
        <p className="text-sm text-zinc-400">
          {exercise.muscleGroup.replace('_', ' ')} • {exercise.equipment}
        </p>
      </div>

      {/* Sets */}
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          Sets *
        </label>
        <input
          type="number"
          value={targetSets}
          onChange={(e) => setTargetSets(parseInt(e.target.value) || 1)}
          min={1}
          max={20}
          inputMode="numeric"
          className="w-full px-4 py-3 bg-zinc-800 text-white rounded-xl border border-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Reps or Time based on exercise type */}
      {exercise.isTimed ? (
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Time (seconds)
          </label>
          <input
            type="number"
            value={targetTimeSeconds}
            onChange={(e) =>
              setTargetTimeSeconds(parseInt(e.target.value) || 30)
            }
            min={5}
            max={3600}
            inputMode="numeric"
            className="w-full px-4 py-3 bg-zinc-800 text-white rounded-xl border border-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="text-xs text-zinc-500 mt-1">
            {Math.floor(targetTimeSeconds / 60)}:
            {(targetTimeSeconds % 60).toString().padStart(2, '0')} per set
          </p>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Reps
          </label>
          <input
            type="number"
            value={targetReps}
            onChange={(e) => setTargetReps(parseInt(e.target.value) || 1)}
            min={1}
            max={100}
            inputMode="numeric"
            className="w-full px-4 py-3 bg-zinc-800 text-white rounded-xl border border-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Weight (optional) */}
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          Target Weight (kg)
        </label>
        <input
          type="number"
          value={targetWeight ?? ''}
          onChange={(e) =>
            setTargetWeight(
              e.target.value ? parseDecimalInput(e.target.value) : undefined,
            )
          }
          min={0}
          step={0.5}
          inputMode="decimal"
          placeholder="Optional"
          className="w-full px-4 py-3 bg-zinc-800 text-white placeholder-zinc-500 rounded-xl border border-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Rest time */}
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          Rest Between Sets
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {REST_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setRestSeconds(preset)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                restSeconds === preset
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {preset >= 60
                ? `${Math.floor(preset / 60)}:${(preset % 60).toString().padStart(2, '0')}`
                : `${preset}s`}
            </button>
          ))}
        </div>
        <input
          type="number"
          value={restSeconds}
          onChange={(e) => setRestSeconds(parseInt(e.target.value) || 30)}
          min={0}
          max={600}
          inputMode="numeric"
          className="w-full px-4 py-3 bg-zinc-800 text-white rounded-xl border border-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes..."
          rows={2}
          className="w-full px-4 py-3 bg-zinc-800 text-white placeholder-zinc-500 rounded-xl border border-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Actions */}
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
          disabled={isLoading}
          className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
