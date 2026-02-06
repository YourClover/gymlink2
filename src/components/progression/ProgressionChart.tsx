import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ProgressionDataPoint } from '@/lib/progression.server'
import type { ProgressionMetric } from '@/lib/progression-utils'
import { formatMetricValue } from '@/lib/progression-utils'

type Props = {
  data: Array<ProgressionDataPoint>
  metric: ProgressionMetric
}

const chartColors = {
  line: '#3b82f6', // blue-500
  grid: '#3f3f46', // zinc-700
  text: '#a1a1aa', // zinc-400
  tooltip: '#18181b', // zinc-900
  tooltipBorder: '#3f3f46', // zinc-700
  dot: '#3b82f6', // blue-500
  dotStroke: '#1e3a5f', // darker blue
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type TooltipPayloadEntry = {
  value: number
  payload: ProgressionDataPoint
}

type CustomTooltipProps = {
  active?: boolean
  payload?: Array<TooltipPayloadEntry>
  metric: ProgressionMetric
}

function CustomTooltip({ active, payload, metric }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0]
  const date = new Date(data.payload.date)
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div
      className="px-3 py-2 rounded-lg border shadow-lg"
      style={{
        backgroundColor: chartColors.tooltip,
        borderColor: chartColors.tooltipBorder,
      }}
    >
      <p className="text-xs text-zinc-400">{formattedDate}</p>
      <p className="text-sm font-medium text-white">
        {formatMetricValue(data.value, metric)}
      </p>
    </div>
  )
}

export default function ProgressionChart({ data, metric }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center text-zinc-500">
        No data available
      </div>
    )
  }

  // Calculate Y-axis domain with some padding
  const values = data.map((d) => d.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const padding = (maxValue - minValue) * 0.1 || maxValue * 0.1
  const yMin = Math.max(0, Math.floor(minValue - padding))
  const yMax = Math.ceil(maxValue + padding)

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={chartColors.grid}
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateShort}
          stroke={chartColors.text}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          domain={[yMin, yMax]}
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
        <Tooltip content={<CustomTooltip metric={metric} />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={chartColors.line}
          strokeWidth={2}
          dot={{
            fill: chartColors.dot,
            stroke: chartColors.dotStroke,
            strokeWidth: 2,
            r: 4,
          }}
          activeDot={{
            fill: chartColors.line,
            stroke: chartColors.dotStroke,
            strokeWidth: 2,
            r: 6,
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
