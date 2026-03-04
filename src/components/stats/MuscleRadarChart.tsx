import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { MuscleChartTooltip, formatMuscleName } from './muscle-chart-utils'
import type { MuscleGroupData } from './muscle-chart-utils'
import { useChartDimensions } from '@/hooks/useChartDimensions'

type Props = {
  data: Array<MuscleGroupData>
}

export default function MuscleRadarChart({ data }: Props) {
  const { compact } = useChartDimensions()

  if (data.length < 3) {
    return (
      <div className="py-4 text-center text-zinc-500 text-sm">
        Need at least 3 muscle groups for radar chart
      </div>
    )
  }

  const truncateLen = compact ? 6 : 8

  const chartData = data.map((d) => ({
    ...d,
    label: formatMuscleName(d.muscle),
  }))

  return (
    <ResponsiveContainer width="100%" height={compact ? 200 : 260}>
      <RadarChart
        data={chartData}
        cx="50%"
        cy="50%"
        outerRadius={compact ? '80%' : '65%'}
      >
        <PolarGrid stroke="#3f3f46" />
        <PolarAngleAxis
          dataKey="label"
          tick={{ fill: '#a1a1aa', fontSize: 10 }}
          tickFormatter={(v: string) =>
            v.length > truncateLen ? v.slice(0, truncateLen) + '.' : v
          }
        />
        <Tooltip content={<MuscleChartTooltip />} cursor={false} />
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
