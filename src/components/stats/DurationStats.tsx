import { Clock, Timer, TrendingUp } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatDuration } from '@/lib/formatting'

function DurationTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: { duration: number; date: string } }>
}) {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0].payload

  return (
    <div
      className="px-3 py-2 rounded-lg border shadow-lg"
      style={{
        backgroundColor: '#18181b',
        borderColor: '#3f3f46',
      }}
    >
      <p className="text-xs text-zinc-400">{data.date}</p>
      <p className="text-sm font-medium text-white">
        {formatDuration(data.duration)}
      </p>
    </div>
  )
}

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
              <Tooltip content={<DurationTooltip />} cursor={false} />
              <Line
                type="monotone"
                dataKey="duration"
                stroke="#c084fc"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  fill: '#c084fc',
                  stroke: '#1e3a5f',
                  strokeWidth: 2,
                  r: 4,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
