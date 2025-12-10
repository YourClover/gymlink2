import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getActivityFeed } from '@/lib/feed.server'
import AppLayout from '@/components/AppLayout'
import { ActivityFeedItem } from '@/components/feed/ActivityFeedItem'
import { Loader2, Trophy, UserPlus, Users } from 'lucide-react'
import type { ActivityType } from '@prisma/client'

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
  const [activities, setActivities] = useState<ActivityData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const loadFeed = async (append = false) => {
    if (!user) return
    setIsLoading(true)

    try {
      const result = await getActivityFeed({
        data: {
          userId: user.id,
          cursor: append ? cursor ?? undefined : undefined,
        },
      })

      if (append) {
        setActivities((prev) => [...prev, ...(result.activities as ActivityData[])])
      } else {
        setActivities(result.activities as ActivityData[])
      }
      setCursor(result.nextCursor)
      setHasMore(result.activities.length === 20)
    } catch (error) {
      console.error('Failed to load feed:', error)
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
          className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Find People
        </Link>
        <Link
          to="/challenges"
          className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Trophy className="w-4 h-4" />
          Challenges
        </Link>
      </div>

      <div className="p-4">
        {activities.length === 0 && !isLoading ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-white font-medium mb-1">Your feed is empty</h3>
            <p className="text-sm text-zinc-500 mb-4">
              Follow other users to see their workouts, PRs, and achievements
              here.
            </p>
            <Link
              to="/users/search"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Find People
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <ActivityFeedItem key={activity.id} activity={activity} />
            ))}

            {isLoading && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
              </div>
            )}

            {hasMore && !isLoading && (
              <button
                onClick={() => loadFeed(true)}
                className="w-full py-3 text-blue-500 text-sm hover:text-blue-400"
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
