import {
  ArrowUp,
  Award,
  CalendarCheck,
  ChevronUp,
  Circle,
  Crown,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  Lock,
  Medal,
  Repeat,
  Rocket,
  Shield,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Weight,
  Zap,
} from 'lucide-react'
import type { AchievementRarity } from '@prisma/client'

interface AchievementBadgeProps {
  icon: string
  rarity: AchievementRarity
  earned: boolean
  size?: 'sm' | 'md' | 'lg'
  showLock?: boolean
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  dumbbell: Dumbbell,
  flame: Flame,
  target: Target,
  medal: Medal,
  crown: Crown,
  star: Star,
  'calendar-check': CalendarCheck,
  fire: Flame,
  zap: Zap,
  trophy: Trophy,
  award: Award,
  'trending-up': TrendingUp,
  rocket: Rocket,
  weight: Weight,
  repeat: Repeat,
  shield: Shield,
  heart: Heart,
  'arrow-up': ArrowUp,
  footprints: Footprints,
  'chevrons-up': ChevronUp,
  circle: Circle,
}

const rarityColors: Record<
  AchievementRarity,
  { bg: string; border: string; icon: string }
> = {
  COMMON: {
    bg: 'bg-zinc-600/30',
    border: 'border-zinc-500/50',
    icon: 'text-zinc-400',
  },
  UNCOMMON: {
    bg: 'bg-emerald-600/30',
    border: 'border-emerald-500/50',
    icon: 'text-emerald-400',
  },
  RARE: {
    bg: 'bg-blue-600/30',
    border: 'border-blue-500/50',
    icon: 'text-blue-400',
  },
  EPIC: {
    bg: 'bg-purple-600/30',
    border: 'border-purple-500/50',
    icon: 'text-purple-400',
  },
  LEGENDARY: {
    bg: 'bg-amber-600/30',
    border: 'border-amber-500/50',
    icon: 'text-amber-400',
  },
}

const sizeClasses = {
  sm: {
    container: 'w-10 h-10',
    icon: 'w-5 h-5',
    lock: 'w-3 h-3',
  },
  md: {
    container: 'w-14 h-14',
    icon: 'w-7 h-7',
    lock: 'w-4 h-4',
  },
  lg: {
    container: 'w-20 h-20',
    icon: 'w-10 h-10',
    lock: 'w-5 h-5',
  },
}

export default function AchievementBadge({
  icon,
  rarity,
  earned,
  size = 'md',
  showLock = true,
}: AchievementBadgeProps) {
  const IconComponent = iconMap[icon] || Trophy
  const colors = rarityColors[rarity]
  const sizes = sizeClasses[size]

  if (!earned) {
    return (
      <div
        className={`${sizes.container} rounded-full flex items-center justify-center bg-zinc-800/50 border border-zinc-700/50 relative`}
      >
        <IconComponent className={`${sizes.icon} text-zinc-600`} />
        {showLock && (
          <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-zinc-800 border border-zinc-700">
            <Lock className={sizes.lock + ' text-zinc-500'} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`${sizes.container} rounded-full flex items-center justify-center ${colors.bg} border ${colors.border}`}
    >
      <IconComponent className={`${sizes.icon} ${colors.icon}`} />
    </div>
  )
}
