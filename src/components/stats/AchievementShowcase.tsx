import { Link } from '@tanstack/react-router'
import { Award } from 'lucide-react'
import type { AchievementRarity } from '@prisma/client'
import AchievementBadge from '@/components/achievements/AchievementBadge'

type EarnedAchievement = {
  id: string
  earnedAt: Date
  achievement: {
    id: string
    name: string
    icon: string
    rarity: AchievementRarity
  }
}

type AchievementShowcaseProps = {
  earnedCount: number
  totalCount: number
  recentEarned: Array<EarnedAchievement>
  rarityBreakdown: Partial<
    Record<AchievementRarity, { earned: number; total: number }>
  >
}

const rarityConfig: Array<{
  key: AchievementRarity
  label: string
  color: string
  bg: string
}> = [
  { key: 'COMMON', label: 'Common', color: 'bg-zinc-500', bg: 'bg-zinc-500' },
  {
    key: 'UNCOMMON',
    label: 'Uncommon',
    color: 'bg-emerald-500',
    bg: 'bg-emerald-500',
  },
  { key: 'RARE', label: 'Rare', color: 'bg-blue-500', bg: 'bg-blue-500' },
  {
    key: 'EPIC',
    label: 'Epic',
    color: 'bg-purple-500',
    bg: 'bg-purple-500',
  },
  {
    key: 'LEGENDARY',
    label: 'Legendary',
    color: 'bg-amber-500',
    bg: 'bg-amber-500',
  },
]

export default function AchievementShowcase({
  earnedCount,
  totalCount,
  recentEarned,
  rarityBreakdown,
}: AchievementShowcaseProps) {
  if (earnedCount === 0) {
    return (
      <div className="p-6 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-center">
        <Award className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
        <p className="text-sm text-zinc-400 mb-2">No achievements earned yet</p>
        <Link
          to="/achievements"
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          See what you can unlock &rarr;
        </Link>
      </div>
    )
  }

  const percentage = Math.round((earnedCount / totalCount) * 100)
  const totalEarnedForBar = Object.values(rarityBreakdown).reduce(
    (sum, r) => sum + r.earned,
    0,
  )

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white">
            {earnedCount}/{totalCount} Earned
          </span>
          <span className="text-sm font-medium text-blue-400">
            {percentage}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-zinc-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Recent badges */}
      <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
        <p className="text-xs font-medium text-zinc-400 mb-3">
          Recently Earned
        </p>
        <div className="flex gap-4 overflow-x-auto pb-1 -mx-1 px-1">
          {recentEarned.map((ua) => (
            <div
              key={ua.id}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
              <AchievementBadge
                icon={ua.achievement.icon}
                rarity={ua.achievement.rarity}
                earned={true}
                size="sm"
                showLock={false}
              />
              <span className="text-[10px] text-zinc-400 text-center w-16 truncate">
                {ua.achievement.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Rarity breakdown */}
      <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
        <p className="text-xs font-medium text-zinc-400 mb-3">By Rarity</p>
        {/* Stacked bar */}
        <div className="h-3 rounded-full bg-zinc-700 overflow-hidden flex">
          {rarityConfig.map(({ key, bg }) => {
            const earned = rarityBreakdown[key]?.earned ?? 0
            if (earned === 0) return null
            const widthPct = (earned / totalEarnedForBar) * 100
            return (
              <div
                key={key}
                className={`h-full ${bg} first:rounded-l-full last:rounded-r-full`}
                style={{ width: `${widthPct}%` }}
              />
            )
          })}
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
          {rarityConfig.map(({ key, label, color }) => {
            const data = rarityBreakdown[key]
            if (!data || data.total === 0) return null
            return (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${color}`} />
                <span className="text-[11px] text-zinc-400">
                  {label} {data.earned}/{data.total}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
