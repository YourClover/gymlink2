import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

type MuscleGroupData = {
  muscle: string
  count: number
  percentage: number
}

type Props = {
  data: Array<MuscleGroupData>
}

function formatMuscleName(muscle: string): string {
  return muscle
    .toLowerCase()
    .replace('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

type TooltipPayloadEntry = {
  value: number
  payload: { muscle: string; count: number; percentage: number }
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<TooltipPayloadEntry>
}) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload
  return (
    <div
      className="px-3 py-2 rounded-lg border shadow-lg"
      style={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }}
    >
      <p className="text-sm font-medium text-white">
        {formatMuscleName(d.muscle)}
      </p>
      <p className="text-xs text-zinc-400">
        {d.count} sets ({d.percentage}%)
      </p>
    </div>
  )
}

export default function MuscleRadarChart({ data }: Props) {
  if (data.length < 3) {
    return (
      <div className="h-[260px] flex items-center justify-center text-zinc-500 text-sm">
        Need at least 3 muscle groups for radar chart
      </div>
    )
  }

  const chartData = data.map((d) => ({
    ...d,
    label: formatMuscleName(d.muscle),
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="65%">
        <PolarGrid stroke="#3f3f46" />
        <PolarAngleAxis
          dataKey="label"
          tick={{ fill: '#a1a1aa', fontSize: 10 }}
          tickFormatter={(v: string) =>
            v.length > 8 ? v.slice(0, 8) + '.' : v
          }
        />
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Radar
          dataKey="count"
          stroke="#3b82f6"
          fill="#3b82f680"
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
