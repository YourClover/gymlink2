import { Crown } from 'lucide-react'
import type { SharedPR } from '@/lib/compare.server'
import { formatPR } from '@/lib/formatting'

export default function ComparePRCard({ pr }: { pr: SharedPR }) {
  return (
    <div className="flex items-center gap-3 py-3 px-4">
      {/* My value */}
      <div className="flex-1 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {pr.winner === 'me' && (
            <Crown className="w-3.5 h-3.5 text-yellow-400" />
          )}
          <span
            className={`text-sm font-semibold ${
              pr.winner === 'me' ? 'text-blue-400' : 'text-zinc-400'
            }`}
          >
            {formatPR({
              recordType: pr.recordType,
              value: pr.myValue,
              weight: pr.myWeight,
              reps: pr.myReps,
              timeSeconds: pr.myTimeSeconds,
            })}
          </span>
        </div>
      </div>

      {/* Exercise name */}
      <div className="w-28 flex-shrink-0 text-center">
        <p className="text-xs font-medium text-white truncate">
          {pr.exerciseName}
        </p>
      </div>

      {/* Their value */}
      <div className="flex-1 text-left">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-sm font-semibold ${
              pr.winner === 'them' ? 'text-blue-400' : 'text-zinc-400'
            }`}
          >
            {formatPR({
              recordType: pr.recordType,
              value: pr.theirValue,
              weight: pr.theirWeight,
              reps: pr.theirReps,
              timeSeconds: pr.theirTimeSeconds,
            })}
          </span>
          {pr.winner === 'them' && (
            <Crown className="w-3.5 h-3.5 text-yellow-400" />
          )}
        </div>
      </div>
    </div>
  )
}
