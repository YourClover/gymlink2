import {
  Dumbbell,
  Flame,
  ListChecks,
  Sparkles,
  Star,
  Target,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react'
import type { XpSource } from '@prisma/client'

interface XpBreakdownCardProps {
  breakdown: Array<{ source: XpSource | string; amount: number }>
  totalXp: number
}

const sourceConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  WORKOUT_COMPLETE: {
    label: 'Workout Complete',
    icon: <Dumbbell className="w-4 h-4" />,
  },
  SET_LOGGED: {
    label: 'Sets Logged',
    icon: <ListChecks className="w-4 h-4" />,
  },
  PR_ACHIEVED: {
    label: 'Personal Record',
    icon: <Trophy className="w-4 h-4" />,
  },
  RPE_LOGGED: {
    label: 'RPE Tracked',
    icon: <Target className="w-4 h-4" />,
  },
  STREAK_BONUS: {
    label: 'Streak Bonus',
    icon: <Flame className="w-4 h-4" />,
  },
  CHALLENGE_COMPLETE: {
    label: 'Challenge Complete',
    icon: <Star className="w-4 h-4" />,
  },
  ACHIEVEMENT_EARNED: {
    label: 'Achievement Earned',
    icon: <Sparkles className="w-4 h-4" />,
  },
  FIRST_WORKOUT_OF_WEEK: {
    label: 'First of the Week',
    icon: <Zap className="w-4 h-4" />,
  },
  NEW_EXERCISE: {
    label: 'New Exercise',
    icon: <Timer className="w-4 h-4" />,
  },
}

export default function XpBreakdownCard({
  breakdown,
  totalXp,
}: XpBreakdownCardProps) {
  if (breakdown.length === 0) return null

  return (
    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
      <h3 className="text-sm font-medium text-zinc-400 mb-3">XP Earned</h3>
      <div className="space-y-2">
        {breakdown.map((item, index) => {
          const config = sourceConfig[item.source] ?? {
            label: item.source,
            icon: <Zap className="w-4 h-4" />,
          }
          return (
            <div
              key={`${item.source}-${index}`}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="text-zinc-500">{config.icon}</span>
                <span className="text-sm">{config.label}</span>
              </div>
              <span className="text-sm font-medium text-green-400">
                +{item.amount} XP
              </span>
            </div>
          )
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-zinc-700/50 flex items-center justify-between">
        <span className="text-sm font-medium text-white">Total</span>
        <span className="text-lg font-bold text-green-400">+{totalXp} XP</span>
      </div>
    </div>
  )
}
