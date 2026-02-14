import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
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
  area: '#3b82f6',
  line: '#a78bfa', // violet-400
  avg: '#71717a', // zinc-500
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
  dataKey: string
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
      <div className="h-[240px] flex items-center justify-center text-zinc-500">
        No volume data yet
      </div>
    )
  }

  const avgVolume =
    data.reduce((sum, w) => sum + w.volume, 0) /
    (data.filter((w) => w.volume > 0).length || 1)

  const hasWorkoutVariance = new Set(data.map((w) => w.workouts)).size > 1

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart
        data={data}
        margin={{
          top: 10,
          right: hasWorkoutVariance ? 40 : 10,
          left: 0,
          bottom: 0,
        }}
      >
        <defs>
          <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColors.area} stopOpacity={0.3} />
            <stop
              offset="100%"
              stopColor={chartColors.area}
              stopOpacity={0.05}
            />
          </linearGradient>
        </defs>
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
          yAxisId="volume"
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
        {hasWorkoutVariance && (
          <YAxis
            yAxisId="workouts"
            orientation="right"
            stroke={chartColors.line}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={30}
            allowDecimals={false}
          />
        )}
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <ReferenceLine
          yAxisId="volume"
          y={avgVolume}
          stroke={chartColors.avg}
          strokeDasharray="4 4"
          strokeWidth={1}
          label={{
            value: 'avg',
            position: 'left',
            fill: chartColors.avg,
            fontSize: 11,
          }}
        />
        <Area
          yAxisId="volume"
          type="monotone"
          dataKey="volume"
          fill="url(#volumeGradient)"
          stroke="none"
        />
        <Bar
          yAxisId="volume"
          dataKey="volume"
          fill={chartColors.bar}
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
        {hasWorkoutVariance && (
          <Line
            yAxisId="workouts"
            type="monotone"
            dataKey="workouts"
            stroke={chartColors.line}
            strokeWidth={2}
            dot={false}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
