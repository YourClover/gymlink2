function Shimmer({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-zinc-800/50 ${className}`} />
  )
}

export default function StatsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Overview grid */}
      <div className="grid grid-cols-2 gap-3">
        <Shimmer className="h-28" />
        <Shimmer className="h-28" />
        <Shimmer className="h-28" />
        <Shimmer className="h-28" />
      </div>

      {/* Achievement placeholder */}
      <div className="space-y-2">
        <Shimmer className="h-4 w-28" />
        <Shimmer className="h-16" />
        <Shimmer className="h-20" />
        <Shimmer className="h-14" />
      </div>

      {/* Heatmap placeholder */}
      <div className="space-y-2">
        <Shimmer className="h-4 w-40" />
        <Shimmer className="h-36" />
      </div>

      {/* Chart placeholder */}
      <div className="space-y-2">
        <Shimmer className="h-4 w-32" />
        <Shimmer className="h-60" />
      </div>

      {/* List placeholder */}
      <div className="space-y-2">
        <Shimmer className="h-4 w-36" />
        <Shimmer className="h-14" />
        <Shimmer className="h-14" />
        <Shimmer className="h-14" />
      </div>
    </div>
  )
}
