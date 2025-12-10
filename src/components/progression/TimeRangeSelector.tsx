export type TimeRange = '1m' | '3m' | '6m' | 'all'

type Props = {
  value: TimeRange
  onChange: (range: TimeRange) => void
}

const ranges: Array<{ value: TimeRange; label: string }> = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: 'all', label: 'ALL' },
]

export default function TimeRangeSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-zinc-800/50">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            value === range.value
              ? 'bg-blue-500 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Get start date for a time range
 */
export function getStartDateForRange(range: TimeRange): string | undefined {
  if (range === 'all') return undefined

  const date = new Date()
  switch (range) {
    case '1m':
      date.setMonth(date.getMonth() - 1)
      break
    case '3m':
      date.setMonth(date.getMonth() - 3)
      break
    case '6m':
      date.setMonth(date.getMonth() - 6)
      break
  }
  return date.toISOString().split('T')[0]
}
