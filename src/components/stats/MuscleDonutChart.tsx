import { useState } from 'react'
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
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

const muscleColors: Record<string, string> = {
  CHEST: '#f87171', // red-400
  BACK: '#60a5fa', // blue-400
  LEGS: '#4ade80', // green-400
  SHOULDERS: '#fb923c', // orange-400
  ARMS: '#c084fc', // purple-400
  CORE: '#facc15', // yellow-400
  CARDIO: '#f472b6', // pink-400
  FULL_BODY: '#22d3ee', // cyan-400
}

function formatMuscleName(muscle: string): string {
  return muscle.toLowerCase().replace('_', ' ')
}

type TooltipPayloadEntry = {
  name: string
  value: number
  payload: MuscleGroupData & { fill: string }
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
      style={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }}
    >
      <p className="text-sm font-medium text-white capitalize">
        {formatMuscleName(data.muscle)}
      </p>
      <p className="text-xs text-zinc-400">
        {data.count} sets ({data.percentage}%)
      </p>
    </div>
  )
}

type LegendPayloadEntry = {
  value: string
  color: string
}

function CustomLegend({
  payload,
  data,
}: {
  payload?: Array<LegendPayloadEntry>
  data: Array<MuscleGroupData>
}) {
  if (!payload) return null

  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
      {payload.map((entry) => {
        const item = data.find((d) => d.muscle === entry.value)
        return (
          <div key={entry.value} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-zinc-400 capitalize">
              {formatMuscleName(entry.value)}
            </span>
            {item && (
              <span className="text-xs text-zinc-500">{item.count}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

const RADIAN = Math.PI / 180

function renderLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percentage,
}: {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percentage: number
}) {
  if (percentage < 5) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {percentage}%
    </text>
  )
}

function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  )
}

export default function MuscleDonutChart({ data }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)

  if (data.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-zinc-500">
        No muscle group data yet
      </div>
    )
  }

  const totalSets = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="muscle"
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          label={renderLabel}
          labelLine={false}
          activeIndex={activeIndex}
          activeShape={renderActiveShape}
          onMouseEnter={(_, index) => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(undefined)}
        >
          {data.map((entry) => (
            <Cell
              key={entry.muscle}
              fill={muscleColors[entry.muscle] ?? '#71717a'}
              stroke="none"
            />
          ))}
        </Pie>
        {/* Center text showing total sets */}
        <text
          x="50%"
          y="42%"
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize={22}
          fontWeight={700}
        >
          {totalSets}
        </text>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#a1a1aa"
          fontSize={12}
        >
          sets
        </text>
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Legend content={<CustomLegend data={data} />} />
      </PieChart>
    </ResponsiveContainer>
  )
}
