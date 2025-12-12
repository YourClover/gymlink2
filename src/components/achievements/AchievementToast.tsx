import { useEffect } from 'react'
import { X } from 'lucide-react'
import AchievementBadge from './AchievementBadge'
import type { AchievementRarity } from '@prisma/client'

interface AchievementToastProps {
  name: string
  description: string
  icon: string
  rarity: AchievementRarity
  onClose: () => void
  autoCloseMs?: number
}

const rarityLabels: Record<AchievementRarity, string> = {
  COMMON: 'Common',
  UNCOMMON: 'Uncommon',
  RARE: 'Rare',
  EPIC: 'Epic',
  LEGENDARY: 'Legendary',
}

const rarityGradients: Record<AchievementRarity, string> = {
  COMMON: 'from-zinc-500/20 to-zinc-600/20 border-zinc-500/40',
  UNCOMMON: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/40',
  RARE: 'from-blue-500/20 to-blue-600/20 border-blue-500/40',
  EPIC: 'from-purple-500/20 to-purple-600/20 border-purple-500/40',
  LEGENDARY: 'from-amber-500/20 to-amber-600/20 border-amber-500/40',
}

const rarityTextColors: Record<AchievementRarity, string> = {
  COMMON: 'text-zinc-400',
  UNCOMMON: 'text-emerald-400',
  RARE: 'text-blue-400',
  EPIC: 'text-purple-400',
  LEGENDARY: 'text-amber-400',
}

export default function AchievementToast({
  name,
  description,
  icon,
  rarity,
  onClose,
  autoCloseMs = 5000,
}: AchievementToastProps) {
  // Auto-close after delay
  useEffect(() => {
    const timer = setTimeout(onClose, autoCloseMs)
    return () => clearTimeout(timer)
  }, [onClose, autoCloseMs])

  return (
    <div className="fixed top-4 left-4 right-4 z-[90] animate-in slide-in-from-top-4 duration-300 safe-area-mt">
      <div
        className={`max-w-md mx-auto bg-gradient-to-r ${rarityGradients[rarity]} border rounded-xl p-4 shadow-lg backdrop-blur-sm`}
      >
        <div className="flex items-start gap-3">
          {/* Achievement badge */}
          <AchievementBadge
            icon={icon}
            rarity={rarity}
            earned={true}
            size="md"
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${rarityTextColors[rarity]}`}>
                Achievement Unlocked!
              </span>
            </div>
            <p className="text-white font-medium truncate">{name}</p>
            <p className="text-sm text-zinc-400">{description}</p>
            <p className={`text-xs mt-1 ${rarityTextColors[rarity]}`}>
              {rarityLabels[rarity]}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700/50 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
