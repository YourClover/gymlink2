import type { ReactNode } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'

type Props = {
  icon: ReactNode
  label: string
  value: string
  color: 'blue' | 'green' | 'purple' | 'yellow'
  change?: { value: number; label: string }
}

const colorClasses = {
  blue: 'bg-blue-500/20 text-blue-400',
  green: 'bg-green-500/20 text-green-400',
  purple: 'bg-purple-500/20 text-purple-400',
  yellow: 'bg-yellow-500/20 text-yellow-400',
}

export default function StatCard({ icon, label, value, color, change }: Props) {
  return (
    <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
      <div
        className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}
      >
        {icon}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-zinc-400">{label}</p>
      {change && change.value !== 0 && (
        <div className="mt-1.5 flex items-center gap-1">
          {change.value > 0 ? (
            <TrendingUp className="w-3 h-3 text-green-400" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-400" />
          )}
          <span
            className={`text-xs font-medium ${change.value > 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {change.value > 0 ? '+' : ''}
            {change.value}%
          </span>
          <span className="text-xs text-zinc-500">{change.label}</span>
        </div>
      )}
    </div>
  )
}
