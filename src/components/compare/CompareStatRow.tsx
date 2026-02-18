import type { LucideIcon } from 'lucide-react'

interface CompareStatRowProps {
  icon: LucideIcon
  label: string
  leftValue: string | number
  rightValue: string | number
  leftRaw?: number
  rightRaw?: number
}

export default function CompareStatRow({
  icon: Icon,
  label,
  leftValue,
  rightValue,
  leftRaw,
  rightRaw,
}: CompareStatRowProps) {
  const left = leftRaw ?? (typeof leftValue === 'number' ? leftValue : 0)
  const right = rightRaw ?? (typeof rightValue === 'number' ? rightValue : 0)

  const leftWins = left > right
  const rightWins = right > left

  return (
    <div className="flex items-center gap-3 py-3">
      <span
        className={`flex-1 text-right text-sm font-semibold tabular-nums ${
          leftWins ? 'text-blue-400' : 'text-zinc-400'
        }`}
      >
        {leftValue}
      </span>
      <div className="flex flex-col items-center gap-0.5 w-20 flex-shrink-0">
        <Icon className="w-4 h-4 text-zinc-500" />
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <span
        className={`flex-1 text-left text-sm font-semibold tabular-nums ${
          rightWins ? 'text-blue-400' : 'text-zinc-400'
        }`}
      >
        {rightValue}
      </span>
    </div>
  )
}
