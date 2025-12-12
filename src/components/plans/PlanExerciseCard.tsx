import { ChevronDown, ChevronUp, Repeat, Timer, Trash2 } from 'lucide-react'
import type { Exercise } from '@prisma/client'
import MuscleGroupBadge from '@/components/exercises/MuscleGroupBadge'

interface PlanExerciseCardProps {
  planExercise: {
    id: string
    targetSets: number
    targetReps?: number | null
    targetTimeSeconds?: number | null
    targetWeight?: number | null
    restSeconds: number
    notes?: string | null
    exercise: Exercise
  }
  onPress?: () => void
  onRemove?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  showReorder?: boolean
  isFirst?: boolean
  isLast?: boolean
}

export default function PlanExerciseCard({
  planExercise,
  onPress,
  onRemove,
  onMoveUp,
  onMoveDown,
  showReorder = false,
  isFirst = false,
  isLast = false,
}: PlanExerciseCardProps) {
  const { exercise, targetSets, targetReps, targetTimeSeconds, targetWeight } =
    planExercise

  // Format target display
  const formatTarget = () => {
    if (targetTimeSeconds) {
      const minutes = Math.floor(targetTimeSeconds / 60)
      const seconds = targetTimeSeconds % 60
      if (minutes > 0) {
        return `${targetSets} × ${minutes}:${seconds.toString().padStart(2, '0')}`
      }
      return `${targetSets} × ${seconds}s`
    }
    if (targetReps) {
      return `${targetSets} × ${targetReps}`
    }
    return `${targetSets} sets`
  }

  return (
    <div className="flex items-center gap-2">
      {/* Reorder buttons */}
      {showReorder && (
        <div className="flex flex-col gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMoveUp?.()
            }}
            disabled={isFirst}
            className={`p-1 rounded ${
              isFirst
                ? 'text-zinc-700'
                : 'text-zinc-500 hover:text-white hover:bg-zinc-700'
            }`}
            aria-label="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMoveDown?.()
            }}
            disabled={isLast}
            className={`p-1 rounded ${
              isLast
                ? 'text-zinc-700'
                : 'text-zinc-500 hover:text-white hover:bg-zinc-700'
            }`}
            aria-label="Move down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

      <button
        onClick={onPress}
        className="flex-1 text-left p-4 bg-zinc-800/50 rounded-xl hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white mb-1">{exercise.name}</h3>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <MuscleGroupBadge muscleGroup={exercise.muscleGroup} />
              <span className="flex items-center gap-1 text-zinc-400">
                {exercise.isTimed ? (
                  <Timer className="w-4 h-4" />
                ) : (
                  <Repeat className="w-4 h-4" />
                )}
                {formatTarget()}
              </span>
              {targetWeight && (
                <span className="text-zinc-500">{targetWeight} kg</span>
              )}
            </div>
            {planExercise.notes && (
              <p className="text-sm text-zinc-500 mt-2 line-clamp-1">
                {planExercise.notes}
              </p>
            )}
          </div>
        </div>
      </button>

      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="p-3 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
          aria-label="Remove exercise"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}
