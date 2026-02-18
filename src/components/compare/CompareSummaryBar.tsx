interface CompareSummaryBarProps {
  wins: number
  losses: number
  ties: number
}

export default function CompareSummaryBar({
  wins,
  losses,
  ties,
}: CompareSummaryBarProps) {
  const total = wins + losses + ties
  if (total === 0) return null

  const winPct = (wins / total) * 100
  const lossPct = (losses / total) * 100
  const tiePct = (ties / total) * 100

  return (
    <div className="space-y-2">
      {/* Segmented bar */}
      <div className="flex h-2.5 rounded-full overflow-hidden bg-zinc-800">
        {winPct > 0 && (
          <div
            className="bg-blue-500 transition-all"
            style={{ width: `${winPct}%` }}
          />
        )}
        {tiePct > 0 && (
          <div
            className="bg-zinc-600 transition-all"
            style={{ width: `${tiePct}%` }}
          />
        )}
        {lossPct > 0 && (
          <div
            className="bg-purple-500 transition-all"
            style={{ width: `${lossPct}%` }}
          />
        )}
      </div>

      {/* Text summary */}
      <div className="flex justify-center gap-4 text-xs">
        <span className="text-blue-400 font-medium">You: {wins}</span>
        <span className="text-zinc-500">Tied: {ties}</span>
        <span className="text-purple-400 font-medium">Them: {losses}</span>
      </div>
    </div>
  )
}
