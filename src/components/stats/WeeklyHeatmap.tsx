import { useMemo, useRef, useState } from 'react'

type Props = {
  dayMap: Record<string, number>
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return d
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const dayLabels = ['M', '', 'W', '', 'F', '', 'S']
const intensityClasses = [
  'bg-zinc-800',
  'bg-blue-900',
  'bg-blue-700',
  'bg-blue-500',
]

export default function WeeklyHeatmap({ dayMap }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{
    date: string
    count: number
    x: number
    y: number
  } | null>(null)

  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date()
    const currentMonday = getMonday(today)

    // Build 16 weeks of data
    const weeksData: Array<Array<{ date: string; count: number }>> = []
    const months: Array<{ label: string; col: number }> = []
    let lastMonth = -1

    for (let w = 15; w >= 0; w--) {
      const weekStart = new Date(currentMonday)
      weekStart.setDate(weekStart.getDate() - w * 7)

      const days: Array<{ date: string; count: number }> = []
      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart)
        day.setDate(day.getDate() + d)
        const dateStr = formatDateStr(day)
        days.push({ date: dateStr, count: dayMap[dateStr] ?? 0 })

        // Track month boundaries on the first day row
        if (d === 0) {
          const month = day.getMonth()
          if (month !== lastMonth) {
            months.push({
              label: day.toLocaleDateString('en-US', { month: 'short' }),
              col: 15 - w,
            })
            lastMonth = month
          }
        }
      }
      weeksData.push(days)
    }

    return { weeks: weeksData, monthLabels: months }
  }, [dayMap])

  return (
    <div className="relative" ref={containerRef}>
      {/* Month labels */}
      <div
        className="grid gap-[3px] ml-6 mb-1"
        style={{ gridTemplateColumns: `repeat(16, minmax(0, 1fr))` }}
      >
        {Array.from({ length: 16 }, (_, i) => {
          const month = monthLabels.find((m) => m.col === i)
          return (
            <div key={i} className="text-[11px] text-zinc-500 whitespace-nowrap">
              {month?.label ?? ''}
            </div>
          )
        })}
      </div>

      <div className="flex gap-0">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] mr-1 shrink-0">
          {dayLabels.map((label, i) => (
            <div
              key={i}
              className="w-5 h-[16px] text-[10px] text-zinc-500 flex items-center justify-end pr-0.5"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div
          className="grid gap-[3px] flex-1"
          style={{ gridTemplateColumns: `repeat(16, minmax(0, 1fr))` }}
        >
          {/* Transpose: iterate by day-of-week first, then week */}
          {Array.from({ length: 7 }, (_, dayIdx) =>
            weeks.map((week, weekIdx) => {
              const cell = week[dayIdx]
              const intensity = Math.min(cell.count, 3)
              const dateObj = new Date(cell.date + 'T00:00:00')
              const isToday = formatDateStr(new Date()) === cell.date
              const isFuture = dateObj > new Date()

              return (
                <div
                  key={`${weekIdx}-${dayIdx}`}
                  className={`h-[16px] rounded-sm transition-colors ${
                    isFuture ? 'bg-zinc-800/30' : intensityClasses[intensity]
                  } ${isToday ? 'ring-1 ring-blue-400' : ''}`}
                  onMouseEnter={(e) => {
                    if (!isFuture) {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const container =
                        containerRef.current?.getBoundingClientRect()
                      let x = rect.left + rect.width / 2
                      if (container) {
                        const tooltipHalf = 60
                        x = Math.max(
                          container.left + tooltipHalf,
                          Math.min(x, container.right - tooltipHalf),
                        )
                      }
                      setTooltip({
                        date: cell.date,
                        count: cell.count,
                        x,
                        y: rect.top,
                      })
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              )
            }),
          )}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 rounded-md text-xs border shadow-lg pointer-events-none"
          style={{
            backgroundColor: '#18181b',
            borderColor: '#3f3f46',
            left: tooltip.x,
            top: tooltip.y - 32,
            transform: 'translateX(-50%)',
          }}
        >
          <span className="text-zinc-400">
            {new Date(tooltip.date + 'T00:00:00').toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <span className="text-white ml-1.5 font-medium">
            {tooltip.count} workout{tooltip.count !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-zinc-500">
        <span>Less</span>
        {intensityClasses.map((cls, i) => (
          <div key={i} className={`w-[10px] h-[10px] rounded-sm ${cls}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
