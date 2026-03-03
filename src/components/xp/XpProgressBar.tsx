import { getLevelColor, getXpProgress } from '@/lib/xp-constants'

interface XpProgressBarProps {
  totalXp: number
  showLabel?: boolean
}

export default function XpProgressBar({
  totalXp,
  showLabel = true,
}: XpProgressBarProps) {
  const progress = getXpProgress(totalXp)
  const colorClass = getLevelColor(progress.currentLevel.level)
  const barColor = getBarColor(progress.currentLevel.level)

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-sm font-medium ${colorClass.split(' ')[0]}`}>
            Level {progress.currentLevel.level}: {progress.currentLevel.name}
          </span>
          {progress.nextLevel && (
            <span className="text-xs text-zinc-500">
              {progress.xpIntoLevel.toLocaleString()} /{' '}
              {progress.xpNeededForNext.toLocaleString()} XP
            </span>
          )}
        </div>
      )}
      <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  )
}

function getBarColor(level: number): string {
  if (level <= 3) return 'bg-zinc-400'
  if (level <= 5) return 'bg-emerald-500'
  if (level <= 7) return 'bg-blue-500'
  if (level <= 9) return 'bg-purple-500'
  return 'bg-amber-500'
}
