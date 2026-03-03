import { useEffect } from 'react'
import { Star } from 'lucide-react'
import Confetti from '@/components/ui/Confetti'
import { getLevelColor } from '@/lib/xp-constants'

interface LevelUpCelebrationProps {
  level: number
  levelName: string
  onDismiss: () => void
}

export default function LevelUpCelebration({
  level,
  levelName,
  onDismiss,
}: LevelUpCelebrationProps) {
  const colorClass = getLevelColor(level)

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onDismiss}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Confetti */}
      <Confetti active={true} onComplete={onDismiss} />

      {/* Card */}
      <div className="relative z-10 mx-4 p-6 rounded-2xl bg-zinc-800 border border-zinc-700 text-center max-w-sm w-full animate-fade-in">
        <div
          className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${colorClass}`}
        >
          <Star className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Level Up!</h2>
        <p className="text-zinc-400 mb-3">You reached</p>
        <div className={`text-3xl font-bold mb-1 ${colorClass.split(' ')[0]}`}>
          Level {level}
        </div>
        <div className="text-lg text-zinc-300 font-medium">{levelName}</div>
        <button
          onClick={onDismiss}
          className="mt-4 px-6 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors text-sm"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
