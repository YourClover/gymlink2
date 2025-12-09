import { Trash2, Flame, TrendingDown, Trophy } from 'lucide-react'

interface WorkoutSetRowProps {
  setNumber: number
  reps?: number | null
  timeSeconds?: number | null
  weight?: number | null
  rpe?: number | null
  isWarmup?: boolean
  isDropset?: boolean
  isPR?: boolean
  onDelete?: () => void
}

export default function WorkoutSetRow({
  setNumber,
  reps,
  timeSeconds,
  weight,
  rpe,
  isWarmup = false,
  isDropset = false,
  isPR = false,
  onDelete,
}: WorkoutSetRowProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-3 py-2 px-3 bg-zinc-800/50 rounded-lg">
      {/* Set number */}
      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-medium text-white">
        {setNumber}
      </div>

      {/* Set details */}
      <div className="flex-1 flex items-center gap-3">
        {/* Weight */}
        {weight != null && weight > 0 && (
          <span className="text-white font-medium">{weight} kg</span>
        )}

        {/* Reps or Time */}
        {reps != null && (
          <span className="text-zinc-400">
            {reps} reps
          </span>
        )}
        {timeSeconds != null && (
          <span className="text-zinc-400">
            {formatTime(timeSeconds)}
          </span>
        )}

        {/* RPE */}
        {rpe != null && (
          <span className="text-xs px-2 py-0.5 bg-zinc-700 rounded-full text-zinc-300">
            RPE {rpe}
          </span>
        )}

        {/* Badges */}
        {isWarmup && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-orange-600/20 rounded-full text-orange-400">
            <Flame className="w-3 h-3" />
            Warmup
          </span>
        )}
        {isDropset && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-purple-600/20 rounded-full text-purple-400">
            <TrendingDown className="w-3 h-3" />
            Drop
          </span>
        )}
        {isPR && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-yellow-500/20 rounded-full text-yellow-400 font-medium">
            <Trophy className="w-3 h-3" />
            PR
          </span>
        )}
      </div>

      {/* Delete button */}
      {onDelete && (
        <button
          onClick={onDelete}
          className="p-2 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-red-400/10 transition-colors"
          aria-label="Delete set"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
