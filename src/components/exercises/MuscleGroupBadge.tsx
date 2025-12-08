import { MuscleGroup } from '@prisma/client'

interface MuscleGroupBadgeProps {
  muscleGroup: MuscleGroup
  size?: 'sm' | 'md'
}

const muscleGroupConfig: Record<
  MuscleGroup,
  { label: string; color: string; bgColor: string }
> = {
  CHEST: { label: 'Chest', color: 'text-red-400', bgColor: 'bg-red-400/10' },
  BACK: { label: 'Back', color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
  LEGS: { label: 'Legs', color: 'text-green-400', bgColor: 'bg-green-400/10' },
  SHOULDERS: {
    label: 'Shoulders',
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
  },
  ARMS: { label: 'Arms', color: 'text-purple-400', bgColor: 'bg-purple-400/10' },
  CORE: { label: 'Core', color: 'text-yellow-400', bgColor: 'bg-yellow-400/10' },
  CARDIO: { label: 'Cardio', color: 'text-pink-400', bgColor: 'bg-pink-400/10' },
  FULL_BODY: {
    label: 'Full Body',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
  },
}

export default function MuscleGroupBadge({
  muscleGroup,
  size = 'sm',
}: MuscleGroupBadgeProps) {
  const config = muscleGroupConfig[muscleGroup]
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${config.color} ${config.bgColor} ${sizeClasses}`}
    >
      {config.label}
    </span>
  )
}

export { muscleGroupConfig }
