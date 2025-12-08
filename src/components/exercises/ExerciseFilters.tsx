import { MuscleGroup, Equipment } from '@prisma/client'
import { muscleGroupConfig } from './MuscleGroupBadge'
import { equipmentConfig } from './EquipmentBadge'

interface ExerciseFiltersProps {
  muscleGroup?: MuscleGroup
  equipment?: Equipment
  onMuscleGroupChange: (value?: MuscleGroup) => void
  onEquipmentChange: (value?: Equipment) => void
}

export default function ExerciseFilters({
  muscleGroup,
  equipment,
  onMuscleGroupChange,
  onEquipmentChange,
}: ExerciseFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Muscle Group Filter */}
      <div>
        <p className="text-xs text-zinc-500 mb-2 px-1">Muscle Group</p>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          <FilterChip
            label="All"
            isSelected={!muscleGroup}
            onClick={() => onMuscleGroupChange(undefined)}
          />
          {Object.entries(muscleGroupConfig).map(([key, config]) => (
            <FilterChip
              key={key}
              label={config.label}
              isSelected={muscleGroup === key}
              onClick={() =>
                onMuscleGroupChange(
                  muscleGroup === key ? undefined : (key as MuscleGroup),
                )
              }
              color={muscleGroup === key ? config.color : undefined}
            />
          ))}
        </div>
      </div>

      {/* Equipment Filter */}
      <div>
        <p className="text-xs text-zinc-500 mb-2 px-1">Equipment</p>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          <FilterChip
            label="All"
            isSelected={!equipment}
            onClick={() => onEquipmentChange(undefined)}
          />
          {Object.entries(equipmentConfig).map(([key, config]) => (
            <FilterChip
              key={key}
              label={config.label}
              isSelected={equipment === key}
              onClick={() =>
                onEquipmentChange(
                  equipment === key ? undefined : (key as Equipment),
                )
              }
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface FilterChipProps {
  label: string
  isSelected: boolean
  onClick: () => void
  color?: string
}

function FilterChip({ label, isSelected, onClick, color }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        isSelected
          ? `bg-blue-600 text-white ${color || ''}`
          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
      }`}
    >
      {label}
    </button>
  )
}
