import { Check } from 'lucide-react'
import MuscleGroupBadge from './MuscleGroupBadge'
import EquipmentBadge from './EquipmentBadge'
import type { Exercise } from '@prisma/client'

interface ExerciseCardProps {
  exercise: Exercise
  onPress?: () => void
  selected?: boolean
  showDescription?: boolean
}

export default function ExerciseCard({
  exercise,
  onPress,
  selected = false,
  showDescription = false,
}: ExerciseCardProps) {
  return (
    <button
      onClick={onPress}
      className={`w-full text-left p-4 rounded-xl transition-colors ${
        selected
          ? 'bg-blue-600/20 border-2 border-blue-500'
          : 'bg-zinc-800/50 border-2 border-transparent hover:bg-zinc-800'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-white truncate">{exercise.name}</h3>
            {exercise.isCustom && (
              <span className="text-xs text-zinc-500 bg-zinc-700 px-1.5 py-0.5 rounded">
                Custom
              </span>
            )}
          </div>
          {showDescription && exercise.description && (
            <p className="text-sm text-zinc-400 mb-2 line-clamp-2">
              {exercise.description}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <MuscleGroupBadge muscleGroup={exercise.muscleGroup} />
            <EquipmentBadge equipment={exercise.equipment} />
          </div>
        </div>
        {selected && (
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
    </button>
  )
}
