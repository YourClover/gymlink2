import AchievementBadge from './AchievementBadge'
import type { AchievementCategory, AchievementRarity } from '@prisma/client'

interface AchievementCardProps {
  name: string
  description: string
  icon: string
  rarity: AchievementRarity
  category: AchievementCategory
  earned: boolean
  earnedAt?: Date | null
  onClick?: () => void
}

const rarityLabels: Record<AchievementRarity, string> = {
  COMMON: 'Common',
  UNCOMMON: 'Uncommon',
  RARE: 'Rare',
  EPIC: 'Epic',
  LEGENDARY: 'Legendary',
}

const rarityBadgeColors: Record<AchievementRarity, string> = {
  COMMON: 'bg-zinc-600/50 text-zinc-300',
  UNCOMMON: 'bg-emerald-600/50 text-emerald-300',
  RARE: 'bg-blue-600/50 text-blue-300',
  EPIC: 'bg-purple-600/50 text-purple-300',
  LEGENDARY: 'bg-amber-600/50 text-amber-300',
}

const rarityBorderColors: Record<AchievementRarity, string> = {
  COMMON: 'border-zinc-700/50',
  UNCOMMON: 'border-emerald-700/50',
  RARE: 'border-blue-700/50',
  EPIC: 'border-purple-700/50',
  LEGENDARY: 'border-amber-700/50',
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export default function AchievementCard({
  name,
  description,
  icon,
  rarity,
  earned,
  earnedAt,
  onClick,
}: AchievementCardProps) {
  const borderColor = earned ? rarityBorderColors[rarity] : 'border-zinc-700/50'

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-xl bg-zinc-800/50 border ${borderColor} transition-colors hover:bg-zinc-700/50 text-left ${!earned ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-4">
        <AchievementBadge
          icon={icon}
          rarity={rarity}
          earned={earned}
          size="lg"
          showLock={!earned}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3
              className={`font-semibold ${earned ? 'text-white' : 'text-zinc-400'}`}
            >
              {name}
            </h3>
            <span
              className={`px-2 py-0.5 text-xs rounded-full ${rarityBadgeColors[rarity]}`}
            >
              {rarityLabels[rarity]}
            </span>
          </div>
          <p className="text-sm text-zinc-400 mb-2">{description}</p>
          {earned && earnedAt ? (
            <p className="text-xs text-zinc-500">
              Earned {formatDate(earnedAt)}
            </p>
          ) : (
            <p className="text-xs text-zinc-500">Locked</p>
          )}
        </div>
      </div>
    </button>
  )
}
