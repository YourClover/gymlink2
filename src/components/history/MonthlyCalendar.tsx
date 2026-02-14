import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import type { MuscleGroup } from '@prisma/client'

type WorkoutDaySummary = {
  id: string
  completedAt: Date | null
  durationSeconds: number | null
  workoutPlan: { name: string } | null
  planDay: { name: string } | null
  _count: { workoutSets: number }
  workoutSets: Array<{
    exercise: { name: string; muscleGroup: MuscleGroup }
  }>
}

type Props = {
  year: number
  month: number // 1-indexed
  dayMap: Partial<Record<number, Array<WorkoutDaySummary>>>
  selectedDay: number | null
  loading: boolean
  onSelectDay: (day: number | null) => void
  onNavigateMonth: (year: number, month: number) => void
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
  // 0=Sun in JS, we want Mon=0
  const day = new Date(year, month - 1, 1).getDay()
  return day === 0 ? 6 : day - 1
}

export default function MonthlyCalendar({
  year,
  month,
  dayMap,
  selectedDay,
  loading,
  onSelectDay,
  onNavigateMonth,
}: Props) {
  const today = new Date()
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1
  const todayDate = today.getDate()

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)

  const prevMonth = () => {
    if (month === 1) {
      onNavigateMonth(year - 1, 12)
    } else {
      onNavigateMonth(year, month - 1)
    }
  }

  const nextMonth = () => {
    if (month === 12) {
      onNavigateMonth(year + 1, 1)
    } else {
      onNavigateMonth(year, month + 1)
    }
  }

  const isFutureDay = (day: number) => {
    const date = new Date(year, month - 1, day)
    return date > today
  }

  const cells: Array<{ day: number | null }> = []
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null })
  }
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d })
  }

  return (
    <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4">
      {/* Month/Year header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-700/50 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-white">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          {loading && (
            <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
          )}
        </div>
        <button
          onClick={nextMonth}
          className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-700/50 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-xs text-zinc-500 font-medium py-1"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (cell.day === null) {
            return <div key={`empty-${i}`} className="min-h-[44px]" />
          }

          const day = cell.day
          const dayWorkouts = dayMap[day]
          const workoutCount = dayWorkouts ? dayWorkouts.length : 0
          const isToday = isCurrentMonth && day === todayDate
          const isSelected = day === selectedDay
          const isFuture = isFutureDay(day)

          return (
            <button
              key={day}
              onClick={() => {
                if (!isFuture) {
                  onSelectDay(isSelected ? null : day)
                }
              }}
              disabled={isFuture}
              className={`min-h-[44px] rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                isSelected
                  ? 'bg-blue-500/20 border border-blue-500/50'
                  : isToday
                    ? 'bg-zinc-700/50 border border-zinc-600'
                    : 'hover:bg-zinc-700/30 border border-transparent'
              } ${isFuture ? 'opacity-30 cursor-default' : ''}`}
            >
              <span
                className={`text-sm ${
                  isSelected
                    ? 'text-blue-400 font-semibold'
                    : isToday
                      ? 'text-white font-semibold'
                      : 'text-zinc-300'
                }`}
              >
                {day}
              </span>
              {workoutCount > 0 && (
                <div className="flex gap-0.5">
                  {Array.from({ length: Math.min(workoutCount, 3) }).map(
                    (_, j) => (
                      <div
                        key={j}
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-blue-400' : 'bg-green-400'
                        }`}
                      />
                    ),
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
