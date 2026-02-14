import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type RpeData = {
  avgRpe: number
  totalRatedSets: number
  distribution: Record<number, number>
  trend: Array<{ avgRpe: number; date: string }>
}

type Props = {
  data: RpeData
}

const rpeColors: Record<number, string> = {
  1: '#4ade80',
  2: '#4ade80',
  3: '#86efac',
  4: '#a3e635',
  5: '#facc15',
  6: '#fbbf24',
  7: '#fb923c',
  8: '#f97316',
  9: '#ef4444',
  10: '#dc2626',
}

const chartColors = {
  grid: '#3f3f46',
  text: '#a1a1aa',
  tooltip: '#18181b',
  tooltipBorder: '#3f3f46',
  area: '#3b82f6',
  zone: '#22c55e',
}

type DistTooltipPayloadEntry = {
  value: number
  payload: { rpe: number; count: number }
}

function DistTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<DistTooltipPayloadEntry>
}) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload
  return (
    <div
      className="px-3 py-2 rounded-lg border shadow-lg"
      style={{
        backgroundColor: chartColors.tooltip,
        borderColor: chartColors.tooltipBorder,
      }}
    >
      <p className="text-sm font-medium text-white">RPE {d.rpe}</p>
      <p className="text-xs text-zinc-400">{d.count} sets</p>
    </div>
  )
}

type TrendTooltipPayloadEntry = {
  value: number
  payload: { avgRpe: number; date: string }
}

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<TrendTooltipPayloadEntry>
}) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload
  return (
    <div
      className="px-3 py-2 rounded-lg border shadow-lg"
      style={{
        backgroundColor: chartColors.tooltip,
        borderColor: chartColors.tooltipBorder,
      }}
    >
      <p className="text-xs text-zinc-400">
        {new Date(d.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}
      </p>
      <p className="text-sm font-medium text-white">Avg RPE: {d.avgRpe}</p>
    </div>
  )
}

export default function RpeChart({ data }: Props) {
  // Build distribution bars (1-10)
  const distData = Array.from({ length: 10 }, (_, i) => ({
    rpe: i + 1,
    count: data.distribution[i + 1] ?? 0,
    fill: rpeColors[i + 1],
  })).filter((d) => d.count > 0)

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{data.avgRpe}</p>
          <p className="text-xs text-zinc-400">Avg RPE</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{data.totalRatedSets}</p>
          <p className="text-xs text-zinc-400">Rated sets</p>
        </div>
      </div>

      {/* RPE Distribution */}
      <div>
        <p className="text-xs font-medium text-zinc-400 mb-2">
          RPE Distribution
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart
            data={distData}
            layout="vertical"
            margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartColors.grid}
              horizontal={false}
            />
            <XAxis
              type="number"
              stroke={chartColors.text}
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="rpe"
              stroke={chartColors.text}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={30}
              tickFormatter={(v: number) => `${v}`}
            />
            <Tooltip content={<DistTooltip />} cursor={false} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={16}>
              {distData.map((entry) => (
                <Cell key={entry.rpe} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* RPE Trend */}
      {data.trend.length > 2 && (
        <div>
          <p className="text-xs font-medium text-zinc-400 mb-2">
            RPE Trend (per session)
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart
              data={data.trend}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="rpeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={chartColors.area}
                    stopOpacity={0.3}
                  />
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
                dataKey="date"
                stroke={chartColors.text}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) =>
                  new Date(v).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                }
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                stroke={chartColors.text}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={30}
                domain={[1, 10]}
              />
              <ReferenceArea
                y1={7}
                y2={8}
                fill={chartColors.zone}
                fillOpacity={0.1}
                label={{
                  value: 'Sweet spot',
                  position: 'right',
                  fill: chartColors.zone,
                  fontSize: 10,
                }}
              />
              <Tooltip content={<TrendTooltip />} cursor={false} />
              <Area
                type="monotone"
                dataKey="avgRpe"
                stroke={chartColors.area}
                fill="url(#rpeGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
