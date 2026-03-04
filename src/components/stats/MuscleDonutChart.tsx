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
import {
  MuscleChartTooltip,
  formatMuscleName,
  muscleColors,
} from './muscle-chart-utils'
import type { MuscleGroupData } from './muscle-chart-utils'
import { useChartDimensions } from '@/hooks/useChartDimensions'

type Props = {
  data: Array<MuscleGroupData>
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

interface ActiveShapeProps {
  cx: number
  cy: number
  innerRadius: number
  outerRadius: number
  startAngle: number
  endAngle: number
  fill: string
}

function renderActiveShape(props: unknown) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } =
    props as ActiveShapeProps

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
  const { compact } = useChartDimensions()

  if (data.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-zinc-500">
        No muscle group data yet
      </div>
    )
  }

  const totalSets = data.reduce((sum, d) => sum + d.count, 0)
  const labelThreshold = compact ? 8 : 5
  const labelFontSize = compact ? 10 : 12
  const centerFontSize = compact ? 18 : 22

  function renderLabel(props: any) {
    const { cx, cy, midAngle, innerRadius, outerRadius, percentage } = props
    if (percentage < labelThreshold) return null
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180))
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180))

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={labelFontSize}
        fontWeight={600}
      >
        {percentage}%
      </text>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={compact ? 250 : 280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="muscle"
          cx="50%"
          cy="45%"
          innerRadius={compact ? '40%' : '38%'}
          outerRadius={compact ? '68%' : '55%'}
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
          y="38%"
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize={centerFontSize}
          fontWeight={700}
        >
          {totalSets}
        </text>
        <text
          x="50%"
          y="45%"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#a1a1aa"
          fontSize={12}
        >
          sets
        </text>
        <Tooltip content={<MuscleChartTooltip />} cursor={false} />
        <Legend content={<CustomLegend data={data} />} />
      </PieChart>
    </ResponsiveContainer>
  )
}
