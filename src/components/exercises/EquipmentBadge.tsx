import type { Equipment } from '@prisma/client'

interface EquipmentBadgeProps {
  equipment: Equipment
  size?: 'sm' | 'md'
}

const equipmentConfig: Record<Equipment, { label: string }> = {
  BARBELL: { label: 'Barbell' },
  DUMBBELL: { label: 'Dumbbell' },
  MACHINE: { label: 'Machine' },
  BODYWEIGHT: { label: 'Bodyweight' },
  CABLE: { label: 'Cable' },
  KETTLEBELL: { label: 'Kettlebell' },
  BANDS: { label: 'Bands' },
  NONE: { label: 'None' },
}

export default function EquipmentBadge({
  equipment,
  size = 'sm',
}: EquipmentBadgeProps) {
  const config = equipmentConfig[equipment]
  const sizeClasses =
    size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium text-zinc-400 bg-zinc-800 ${sizeClasses}`}
    >
      {config.label}
    </span>
  )
}

export { equipmentConfig }
