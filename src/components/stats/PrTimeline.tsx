import type { MuscleGroup, RecordType } from '@prisma/client'
import { TrendingUp, Trophy } from 'lucide-react'
import MuscleGroupBadge from '@/components/exercises/MuscleGroupBadge'

type PrEntry = {
  id: string
  exerciseName: string
  muscleGroup: MuscleGroup | null
  recordType: RecordType
  value: number
  previousRecord: number | null
  improvement: number | null
  achievedAt: Date
}

type Props = {
  timeline: Array<PrEntry>
}

const recordTypeLabels: Record<RecordType, string> = {
  MAX_WEIGHT: 'Weight',
  MAX_REPS: 'Reps',
  MAX_VOLUME: 'Volume',
  MAX_TIME: 'Time',
}

const recordTypeColors: Record<RecordType, string> = {
  MAX_WEIGHT: 'bg-yellow-500/20 text-yellow-400',
  MAX_REPS: 'bg-blue-500/20 text-blue-400',
  MAX_VOLUME: 'bg-green-500/20 text-green-400',
  MAX_TIME: 'bg-purple-500/20 text-purple-400',
}

function formatValue(value: number, recordType: RecordType): string {
  switch (recordType) {
    case 'MAX_WEIGHT':
      return `${value}kg`
    case 'MAX_REPS':
      return `${value} reps`
    case 'MAX_VOLUME':
      return `${value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}kg`
    case 'MAX_TIME': {
      const mins = Math.floor(value / 60)
      const secs = value % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }
    default:
      return `${value}`
  }
}

export default function PrTimeline({ timeline }: Props) {
  if (timeline.length === 0) {
    return (
      <div className="py-6 text-center text-zinc-500 text-sm">
        No PR improvements yet
      </div>
    )
  }

  return (
    <div className="relative pl-6">
      {/* Vertical connecting line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-zinc-700" />

      <div className="space-y-4">
        {timeline.map((pr) => (
          <div key={pr.id} className="relative flex gap-3">
            {/* Timeline dot */}
            <div className="absolute -left-6 top-1 w-[22px] h-[22px] rounded-full bg-yellow-500/20 flex items-center justify-center z-10">
              <Trophy className="w-3 h-3 text-yellow-400" />
            </div>

            <div className="flex-1 min-w-0">
              {/* Date */}
              <p className="text-[11px] text-zinc-500 mb-0.5">
                {new Date(pr.achievedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>

              {/* Exercise name */}
              <p className="font-medium text-white text-sm truncate">
                {pr.exerciseName}
              </p>

              {/* Badges row */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${recordTypeColors[pr.recordType]}`}
                >
                  {recordTypeLabels[pr.recordType]}
                </span>
                {pr.muscleGroup && (
                  <MuscleGroupBadge
                    muscleGroup={pr.muscleGroup}
                    size="sm"
                  />
                )}
              </div>

              {/* Value + improvement */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-zinc-300">
                  {formatValue(pr.value, pr.recordType)}
                </span>
                {pr.improvement !== null && pr.improvement > 0 && (
                  <span className="flex items-center gap-0.5 text-xs font-medium text-green-400">
                    <TrendingUp className="w-3 h-3" />+{pr.improvement}%
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
