import { Star } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts'

function MoodTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: { mood: number; date: string } }>
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
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`w-3 h-3 ${i <= data.mood ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-600'}`}
          />
        ))}
      </div>
    </div>
  )
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i <= Math.round(value) ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-600'}`}
        />
      ))}
    </div>
  )
}

type MoodData = {
  avgMood: number
  moodCount: number
  trend: Array<{ mood: number; date: string }>
}

type Props = {
  data: MoodData
}

export default function MoodStats({ data }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center mb-2">
            <Star className="w-4 h-4 text-yellow-400" />
          </div>
          <StarRating value={data.avgMood} />
          <p className="text-sm font-bold text-white mt-1">{data.avgMood}</p>
          <p className="text-xs text-zinc-400">Avg Mood</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center mb-2">
            <Star className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-lg font-bold text-white">{data.moodCount}</p>
          <p className="text-xs text-zinc-400">Rated Sessions</p>
        </div>
      </div>

      {data.trend.length >= 3 && (
        <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <p className="text-xs text-zinc-400 mb-2">Mood Trend</p>
          <ResponsiveContainer width="100%" height={60}>
            <LineChart data={data.trend}>
              <Tooltip content={<MoodTooltip />} cursor={false} />
              <Line
                type="monotone"
                dataKey="mood"
                stroke="#facc15"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  fill: '#facc15',
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
