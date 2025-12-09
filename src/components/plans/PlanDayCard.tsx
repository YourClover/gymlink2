import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Dumbbell,
  Moon,
} from 'lucide-react'

interface PlanDayCardProps {
  day: {
    id: string
    name: string
    dayOrder: number
    restDay: boolean
    _count?: { planExercises: number }
  }
  onPress?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  showReorder?: boolean
  isFirst?: boolean
  isLast?: boolean
}

export default function PlanDayCard({
  day,
  onPress,
  onMoveUp,
  onMoveDown,
  showReorder = false,
  isFirst = false,
  isLast = false,
}: PlanDayCardProps) {
  const exerciseCount = day._count?.planExercises ?? 0

  return (
    <div className="flex items-center gap-2">
      {/* Reorder buttons */}
      {showReorder && (
        <div className="flex flex-col gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMoveUp?.()
            }}
            disabled={isFirst}
            className={`p-1 rounded ${
              isFirst
                ? 'text-zinc-700'
                : 'text-zinc-500 hover:text-white hover:bg-zinc-700'
            }`}
            aria-label="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMoveDown?.()
            }}
            disabled={isLast}
            className={`p-1 rounded ${
              isLast
                ? 'text-zinc-700'
                : 'text-zinc-500 hover:text-white hover:bg-zinc-700'
            }`}
            aria-label="Move down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Day card */}
      <button
        onClick={onPress}
        className="flex-1 text-left p-4 bg-zinc-800/50 rounded-xl hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Day number */}
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
              day.restDay
                ? 'bg-zinc-700 text-zinc-400'
                : 'bg-blue-600/20 text-blue-400'
            }`}
          >
            {day.dayOrder}
          </div>

          {/* Day info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white truncate">{day.name}</h3>
            <div className="flex items-center gap-1 text-sm text-zinc-500">
              {day.restDay ? (
                <>
                  <Moon className="w-4 h-4" />
                  <span>Rest Day</span>
                </>
              ) : (
                <>
                  <Dumbbell className="w-4 h-4" />
                  <span>
                    {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-zinc-500 flex-shrink-0" />
        </div>
      </button>
    </div>
  )
}
