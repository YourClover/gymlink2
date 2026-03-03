import { getLevelColor } from '@/lib/xp-constants'

interface LevelBadgeProps {
  level: number
  name: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5 gap-1',
  md: 'text-sm px-2 py-0.5 gap-1.5',
  lg: 'text-base px-3 py-1 gap-2',
}

export default function LevelBadge({
  level,
  name,
  size = 'sm',
}: LevelBadgeProps) {
  const colorClass = getLevelColor(level)

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${colorClass} ${sizeClasses[size]}`}
    >
      <span className="font-bold">{level}</span>
      <span>{name}</span>
    </span>
  )
}
