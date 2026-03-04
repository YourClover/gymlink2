import { Sparkles } from 'lucide-react'
import {
  getLevelBarColor,
  getLevelColor,
  getXpProgress,
} from '@/lib/xp-constants'

interface XpDashboardCardProps {
  totalXp: number
  level: number
  levelName: string
  weeklyXp: number
}

export default function XpDashboardCard({
  totalXp,
  level,
  levelName,
  weeklyXp,
}: XpDashboardCardProps) {
  const progress = getXpProgress(totalXp)
  const color = getLevelColor(level)
  const barColor = getLevelBarColor(level)

  return (
    <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
      <div className="flex items-center gap-2 text-zinc-400 mb-2">
        <Sparkles className="w-5 h-5" />
        <span className="text-sm">Level</span>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className={`text-2xl font-bold ${color.text}`}>{level}</span>
        <span className="text-sm text-zinc-400">{levelName}</span>
      </div>
      {/* Mini progress bar */}
      <div className="w-full h-1.5 bg-zinc-700 rounded-full overflow-hidden mb-1.5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <div className="text-xs text-zinc-500">
        +{weeklyXp.toLocaleString()} XP this week
      </div>
    </div>
  )
}
