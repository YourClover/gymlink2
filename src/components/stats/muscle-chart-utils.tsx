export type MuscleGroupData = {
  muscle: string
  count: number
  percentage: number
}

export const muscleColors: Record<string, string> = {
  CHEST: '#f87171', // red-400
  BACK: '#60a5fa', // blue-400
  LEGS: '#4ade80', // green-400
  SHOULDERS: '#fb923c', // orange-400
  ARMS: '#c084fc', // purple-400
  CORE: '#facc15', // yellow-400
  CARDIO: '#f472b6', // pink-400
  FULL_BODY: '#22d3ee', // cyan-400
}

export function formatMuscleName(muscle: string): string {
  return muscle
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

type TooltipPayloadEntry = {
  value: number
  payload: MuscleGroupData & { fill?: string }
}

type MuscleChartTooltipProps = {
  active?: boolean
  payload?: Array<TooltipPayloadEntry>
}

export function MuscleChartTooltip({
  active,
  payload,
}: MuscleChartTooltipProps) {
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
