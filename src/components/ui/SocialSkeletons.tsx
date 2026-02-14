import { memo } from 'react'
import { Skeleton, SkeletonAvatar } from './Skeleton'

// Skeleton for activity feed items (matches ActivityFeedItem layout)
export const SkeletonFeedItem = memo(function SkeletonFeedItem() {
  return (
    <div
      className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4"
      aria-hidden="true"
    >
      <div className="flex items-center gap-3 mb-3">
        <SkeletonAvatar size="md" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-12" />
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

// Skeleton for user cards in followers/search (matches renderUserCard layout)
export const SkeletonUserCard = memo(function SkeletonUserCard() {
  return (
    <div
      className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50"
      aria-hidden="true"
    >
      <Skeleton className="w-12 h-12 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-28 mb-1" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  )
})

// Skeleton for challenge cards (matches challenge card layout)
export const SkeletonChallengeCard = memo(function SkeletonChallengeCard() {
  return (
    <div
      className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4"
      aria-hidden="true"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Skeleton className="h-5 w-40 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-4 mb-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  )
})

// Skeleton for notification items (matches notification row layout)
export const SkeletonNotificationItem = memo(
  function SkeletonNotificationItem() {
    return (
      <div
        className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50"
        aria-hidden="true"
      >
        <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
        <div className="flex-1">
          <Skeleton className="h-4 w-40 mb-1" />
          <Skeleton className="h-3 w-56 mb-1" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    )
  },
)
