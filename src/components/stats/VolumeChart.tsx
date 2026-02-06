import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type WeekData = {
  weekStart: string
  volume: number
  workouts: number
}

type Props = {
  data: Array<WeekData>
}

const chartColors = {
  bar: '#3b82f6', // blue-500
  grid: '#3f3f46', // zinc-700
  text: '#a1a1aa', // zinc-400
  tooltip: '#18181b', // zinc-900
  tooltipBorder: '#3f3f46', // zinc-700
}

function formatDateShort(weekStart: string): string {
  const date = new Date(weekStart)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type TooltipPayloadEntry = {
  value: number
  payload: WeekData
}

type CustomTooltipProps = {
  active?: boolean
  payload?: Array<TooltipPayloadEntry>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0].payload

  return (
    <div
      className="px-3 py-2 rounded-lg border shadow-lg"
      style={{
        backgroundColor: chartColors.tooltip,
        borderColor: chartColors.tooltipBorder,
      }}
    >
      <p className="text-xs text-zinc-400">{formatDateShort(data.weekStart)}</p>
      <p className="text-sm font-medium text-white">
        {data.volume >= 1000
          ? `${(data.volume / 1000).toFixed(1)}k kg`
          : `${data.volume} kg`}
      </p>
      <p className="text-xs text-zinc-400">
        {data.workouts} workout{data.workouts !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

export default function VolumeChart({ data }: Props) {
  const hasVolume = data.some((w) => w.volume > 0)

  if (!hasVolume) {
    return (
      <div className="h-[200px] flex items-center justify-center text-zinc-500">
        No volume data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={chartColors.grid}
          vertical={false}
        />
        <XAxis
          dataKey="weekStart"
          tickFormatter={formatDateShort}
          stroke={chartColors.text}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          stroke={chartColors.text}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={45}
          tickFormatter={(value: number) => {
            if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
            return value.toString()
          }}
        />
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Bar
          dataKey="volume"
          fill={chartColors.bar}
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
