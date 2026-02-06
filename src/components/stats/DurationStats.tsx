import { Clock, Timer, TrendingUp } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { formatDuration } from '@/lib/formatting'

type DurationData = {
  avgDurationSeconds: number
  maxDurationSeconds: number
  totalDurationSeconds: number
  sessionCount: number
  trend: Array<{ duration: number; date: string }>
}

type Props = {
  data: DurationData
}

export default function DurationStats({ data }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center mb-2">
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-lg font-bold text-white">
            {formatDuration(data.avgDurationSeconds)}
          </p>
          <p className="text-xs text-zinc-400">Avg Duration</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center mb-2">
            <Timer className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-lg font-bold text-white">
            {formatDuration(data.maxDurationSeconds)}
          </p>
          <p className="text-xs text-zinc-400">Longest</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center mb-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-lg font-bold text-white">{data.sessionCount}</p>
          <p className="text-xs text-zinc-400">Sessions</p>
        </div>
      </div>

      {data.trend.length >= 3 && (
        <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <p className="text-xs text-zinc-400 mb-2">Duration Trend</p>
          <ResponsiveContainer width="100%" height={60}>
            <LineChart data={data.trend}>
              <Line
                type="monotone"
                dataKey="duration"
                stroke="#c084fc"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
