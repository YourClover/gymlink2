import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  getFollowers,
  getFollowing,
  getPendingFollowRequests,
  respondToFollowRequest,
} from '@/lib/social.server'
import AppLayout from '@/components/AppLayout'
import { ArrowLeft, Loader2 } from 'lucide-react'

export const Route = createFileRoute('/followers')({
  component: FollowersPage,
})

interface FollowData {
  id: string
  status: string
  createdAt: Date
  follower?: { id: string; name: string }
  following?: { id: string; name: string }
  profile?: { username: string; avatarUrl: string | null }
}

function FollowersPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'followers' | 'following' | 'requests'>(
    'followers',
  )
  const [followers, setFollowers] = useState<FollowData[]>([])
  const [following, setFollowing] = useState<FollowData[]>([])
  const [requests, setRequests] = useState<FollowData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    if (!user) return
    setIsLoading(true)

    try {
      const [followersResult, followingResult, requestsResult] =
        await Promise.all([
          getFollowers({ data: { userId: user.id, status: 'ACCEPTED' } }),
          getFollowing({ data: { userId: user.id, status: 'ACCEPTED' } }),
          getPendingFollowRequests({ data: { userId: user.id } }),
        ])

      setFollowers(followersResult.followers as FollowData[])
      setFollowing(followingResult.following as FollowData[])
      setRequests(requestsResult.followers as FollowData[])
    } catch (error) {
      console.error('Failed to load followers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  const handleAccept = async (followId: string) => {
    if (!user) return
    try {
      await respondToFollowRequest({
        data: { followId, userId: user.id, accept: true },
      })
      loadData()
    } catch (error) {
      console.error('Failed to accept request:', error)
    }
  }

  const handleDecline = async (followId: string) => {
    if (!user) return
    try {
      await respondToFollowRequest({
        data: { followId, userId: user.id, accept: false },
      })
      loadData()
    } catch (error) {
      console.error('Failed to decline request:', error)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <AppLayout showNav={false}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate({ to: '/profile' })}
            className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <h1 className="text-lg font-semibold text-white">Social</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('followers')}
            className={`flex-1 py-2 rounded-lg font-medium text-sm ${
              tab === 'followers'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            Followers ({followers.length})
          </button>
          <button
            onClick={() => setTab('following')}
            className={`flex-1 py-2 rounded-lg font-medium text-sm ${
              tab === 'following'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            Following ({following.length})
          </button>
          <button
            onClick={() => setTab('requests')}
            className={`flex-1 py-2 rounded-lg font-medium text-sm relative ${
              tab === 'requests'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            Requests
            {requests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                {requests.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        ) : tab === 'requests' ? (
          requests.length > 0 ? (
            <div className="space-y-2">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg"
                >
                  <Link
                    to="/u/$username"
                    params={{ username: req.profile?.username ?? '' }}
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                      {req.profile?.avatarUrl ? (
                        <img
                          src={req.profile.avatarUrl}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        getInitials(req.follower?.name ?? 'U')
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">
                      {req.follower?.name}
                    </p>
                    <p className="text-sm text-zinc-500">
                      @{req.profile?.username}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(req.id)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecline(req.id)}
                      className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-white"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-zinc-500 text-center py-8">
              No pending requests
            </div>
          )
        ) : tab === 'followers' ? (
          followers.length > 0 ? (
            <div className="space-y-2">
              {followers.map((f) => (
                <Link
                  key={f.id}
                  to="/u/$username"
                  params={{ username: f.profile?.username ?? '' }}
                  className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-700/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                    {f.profile?.avatarUrl ? (
                      <img
                        src={f.profile.avatarUrl}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials(f.follower?.name ?? 'U')
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">
                      {f.follower?.name}
                    </p>
                    <p className="text-sm text-zinc-500">
                      @{f.profile?.username}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-zinc-500 text-center py-8">
              No followers yet
            </div>
          )
        ) : following.length > 0 ? (
          <div className="space-y-2">
            {following.map((f) => (
              <Link
                key={f.id}
                to="/u/$username"
                params={{ username: f.profile?.username ?? '' }}
                className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-700/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                  {f.profile?.avatarUrl ? (
                    <img
                      src={f.profile.avatarUrl}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getInitials(f.following?.name ?? 'U')
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">
                    {f.following?.name}
                  </p>
                  <p className="text-sm text-zinc-500">
                    @{f.profile?.username}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-zinc-500 text-center py-8">
            You're not following anyone yet
          </div>
        )}
      </div>
    </AppLayout>
  )
}
