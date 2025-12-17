import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Repeat, Timer } from 'lucide-react'
import WorkoutSetRow from './WorkoutSetRow'
import type { Exercise, PlanExercise, WorkoutSet } from '@prisma/client'
import MuscleGroupBadge from '@/components/exercises/MuscleGroupBadge'

interface ExerciseWorkoutCardProps {
  exercise: Exercise
  sets: Array<WorkoutSet>
  planExercise?: PlanExercise | null
  onLogSet: () => void
  onDeleteSet: (setId: string) => void
  isExpanded?: boolean
  onToggleExpand?: () => void
}

export default function ExerciseWorkoutCard({
  exercise,
  sets,
  planExercise,
  onLogSet,
  onDeleteSet,
  isExpanded = false,
  onToggleExpand,
}: ExerciseWorkoutCardProps) {
  const [expanded, setExpanded] = useState(isExpanded)

  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand()
    } else {
      setExpanded(!expanded)
    }
  }

  const isExpandedState = onToggleExpand ? isExpanded : expanded

  // Calculate progress
  const targetSets = planExercise?.targetSets ?? 0
  const completedSets = sets.filter((s) => !s.isWarmup && !s.isDropset).length
  const hasTarget = targetSets > 0

  // Format target display
  const formatTarget = () => {
    if (!planExercise) return null

    const { targetReps, targetTimeSeconds, targetWeight } = planExercise

    let display = `${planExercise.targetSets}`

    if (targetTimeSeconds) {
      const mins = Math.floor(targetTimeSeconds / 60)
      const secs = targetTimeSeconds % 60
      display += ` × ${mins}:${secs.toString().padStart(2, '0')}`
    } else if (targetReps) {
      display += ` × ${targetReps}`
    }

    if (targetWeight) {
      display += ` @ ${targetWeight}kg`
    }

    return display
  }

  const targetDisplay = formatTarget()

  return (
    <div className="bg-zinc-800/50 rounded-xl overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={handleToggle}
        className="w-full p-4 text-left flex items-center gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-white truncate">{exercise.name}</h3>
            <MuscleGroupBadge muscleGroup={exercise.muscleGroup} />
          </div>

          <div className="flex items-center gap-3 text-sm">
            {/* Target from plan */}
            {targetDisplay && (
              <span className="flex items-center gap-1 text-zinc-500">
                {exercise.isTimed ? (
                  <Timer className="w-3.5 h-3.5" />
                ) : (
                  <Repeat className="w-3.5 h-3.5" />
                )}
                Target: {targetDisplay}
              </span>
            )}

            {/* Progress */}
            <span
              className={`font-medium ${
                hasTarget && completedSets >= targetSets
                  ? 'text-green-400'
                  : 'text-zinc-400'
              }`}
            >
              {completedSets}
              {hasTarget && ` / ${targetSets}`} sets
            </span>
          </div>
        </div>

        {/* Expand/collapse indicator */}
        <div className="text-zinc-500">
          {isExpandedState ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpandedState && (
        <div className="px-4 pb-4 space-y-3">
          {/* Logged sets */}
          {sets.length > 0 && (
            <div className="space-y-2">
              {sets.map((set, index) => (
                <WorkoutSetRow
                  key={set.id}
                  setNumber={index + 1}
                  reps={set.reps}
                  timeSeconds={set.timeSeconds}
                  weight={set.weight}
                  rpe={set.rpe}
                  isWarmup={set.isWarmup}
                  isDropset={set.isDropset}
                  onDelete={() => onDeleteSet(set.id)}
                />
              ))}
            </div>
          )}

          {/* Log set button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onLogSet()
            }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600/20 text-blue-400 font-medium rounded-xl hover:bg-blue-600/30 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Log Set
          </button>
        </div>
      )}
    </div>
  )
}
