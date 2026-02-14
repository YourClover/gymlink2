import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Loader2, Trophy, UserPlus, Users } from 'lucide-react'
import type { ActivityType } from '@prisma/client'
import { useAuth } from '@/context/AuthContext'
import { getActivityFeed } from '@/lib/feed.server'
import AppLayout from '@/components/AppLayout'
import { ActivityFeedItem } from '@/components/feed/ActivityFeedItem'
import { SkeletonFeedItem } from '@/components/ui/SocialSkeletons'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'

export const Route = createFileRoute('/feed')({
  component: FeedPage,
})

interface ActivityData {
  id: string
  userId: string
  activityType: ActivityType
  referenceId: string | null
  metadata: Record<string, unknown>
  createdAt: Date
  user: { id: string; name: string }
  profile?: { username: string; avatarUrl: string | null }
}

function FeedPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activities, setActivities] = useState<Array<ActivityData>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const loadFeed = async (append = false) => {
    if (!user) return
    setIsLoading(true)
    if (!append) setError(null)

    try {
      const result = await getActivityFeed({
        data: {
          userId: user.id,
          cursor: append ? (cursor ?? undefined) : undefined,
        },
      })

      if (append) {
        setActivities((prev) => [
          ...prev,
          ...(result.activities as Array<ActivityData>),
        ])
      } else {
        setActivities(result.activities as Array<ActivityData>)
      }
      setCursor(result.nextCursor)
      setHasMore(result.activities.length === 20)
    } catch (err) {
      console.error('Failed to load feed:', err)
      if (!append) {
        setError('Failed to load feed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadFeed()
  }, [user])

  return (
    <AppLayout title="Activity Feed">
      {/* Quick Actions */}
      <div className="px-4 pt-4 flex gap-2">
        <Link
          to="/users/search"
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-3 hover:bg-zinc-700/50 text-white text-sm font-medium transition-colors"
        >
          <div className="p-1 bg-blue-500/20 rounded-lg">
            <UserPlus className="w-4 h-4 text-blue-400" />
          </div>
          Find People
        </Link>
        <Link
          to="/challenges"
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-3 hover:bg-zinc-700/50 text-white text-sm font-medium transition-colors"
        >
          <div className="p-1 bg-yellow-500/20 rounded-lg">
            <Trophy className="w-4 h-4 text-yellow-400" />
          </div>
          Challenges
        </Link>
      </div>

      <div className="p-4">
        {/* Error state with retry */}
        {error && activities.length === 0 ? (
          <ErrorState
            title="Failed to load feed"
            message={error}
            onRetry={() => loadFeed()}
            isRetrying={isLoading}
          />
        ) : /* Initial loading skeleton */
        isLoading && activities.length === 0 ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonFeedItem key={i} />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="Your feed is empty"
            description="Follow other users to see their workouts, PRs, and achievements here."
            action={{
              label: 'Find People',
              onClick: () => navigate({ to: '/users/search' }),
            }}
          />
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div
                key={activity.id}
                className="animate-fade-in"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'backwards',
                }}
              >
                <ActivityFeedItem activity={activity} />
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
              </div>
            )}

            {hasMore && !isLoading && (
              <button
                onClick={() => loadFeed(true)}
                className="w-full py-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-700/50 transition-colors text-blue-400 text-sm font-medium"
              >
                Load more
              </button>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
