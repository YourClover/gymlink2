import { useEffect } from 'react'
import { Trophy, X } from 'lucide-react'

interface PRToastProps {
  exerciseName: string
  weight: number
  previousWeight?: number
  onClose: () => void
  autoCloseMs?: number
}

export default function PRToast({
  exerciseName,
  weight,
  previousWeight,
  onClose,
  autoCloseMs = 4000,
}: PRToastProps) {
  // Auto-close after delay
  useEffect(() => {
    const timer = setTimeout(onClose, autoCloseMs)
    return () => clearTimeout(timer)
  }, [onClose, autoCloseMs])

  const improvement = previousWeight ? weight - previousWeight : null

  return (
    <div className="fixed top-4 left-4 right-4 z-[90] animate-in slide-in-from-top-4 duration-300 safe-area-mt">
      <div className="max-w-md mx-auto bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/40 rounded-xl p-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-start gap-3">
          {/* Trophy icon */}
          <div className="p-2 rounded-full bg-yellow-500/30">
            <Trophy className="w-6 h-6 text-yellow-400" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-yellow-400">New PR!</span>
              {improvement && improvement > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-green-500/30 text-green-400 rounded-full">
                  +{improvement}kg
                </span>
              )}
            </div>
            <p className="text-white font-medium truncate">{exerciseName}</p>
            <p className="text-sm text-zinc-400">
              {weight}kg
              {previousWeight && (
                <span className="text-zinc-500">
                  {' '}
                  (previous: {previousWeight}kg)
                </span>
              )}
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
