import { memo } from 'react'

interface SkeletonProps {
  className?: string
}

// Base skeleton with shimmer animation
export const Skeleton = memo(function Skeleton({
  className = '',
}: SkeletonProps) {
  return (
    <div
      className={`bg-zinc-800 animate-pulse rounded ${className}`}
      aria-hidden="true"
    />
  )
})

// Skeleton for text lines
export const SkeletonText = memo(function SkeletonText({
  lines = 1,
  className = '',
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  )
})

// Skeleton for circular avatars
export const SkeletonAvatar = memo(function SkeletonAvatar({
  size = 'md',
}: {
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  }
  return <Skeleton className={`${sizeClasses[size]} rounded-full`} />
})

// Skeleton for workout/feed card
export const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div className="bg-zinc-800/50 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <SkeletonAvatar size="md" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="flex items-start gap-3">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  )
})

// Skeleton for exercise card
export const SkeletonExerciseCard = memo(function SkeletonExerciseCard() {
  return (
    <div className="bg-zinc-800/50 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32 mb-2" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
})

// Skeleton for workout history item
export const SkeletonWorkoutItem = memo(function SkeletonWorkoutItem() {
  return (
    <div className="bg-zinc-800/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <Skeleton className="h-5 w-40 mb-1" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
})

// Skeleton for stats card
export const SkeletonStatsCard = memo(function SkeletonStatsCard() {
  return (
    <div className="bg-zinc-800/50 rounded-xl p-4">
      <Skeleton className="h-4 w-20 mb-2" />
      <Skeleton className="h-8 w-16" />
    </div>
  )
})

// Skeleton for leaderboard row
export const SkeletonLeaderboardRow = memo(function SkeletonLeaderboardRow() {
  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl">
      <Skeleton className="w-8 h-8 rounded-full" />
      <SkeletonAvatar size="sm" />
      <div className="flex-1">
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-5 w-16" />
    </div>
  )
})

// Skeleton for profile header
export const SkeletonProfileHeader = memo(function SkeletonProfileHeader() {
  return (
    <div className="flex flex-col items-center">
      <SkeletonAvatar size="lg" />
      <Skeleton className="h-6 w-32 mt-3 mb-1" />
      <Skeleton className="h-4 w-24 mb-4" />
      <div className="flex gap-6">
        <div className="text-center">
          <Skeleton className="h-5 w-8 mx-auto mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="text-center">
          <Skeleton className="h-5 w-8 mx-auto mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="text-center">
          <Skeleton className="h-5 w-8 mx-auto mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  )
})
