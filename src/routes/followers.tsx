import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Loader2, MoreVertical, Users } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  getFollowers,
  getFollowing,
  getMutualFollowers,
  getPendingFollowRequests,
  removeFollower,
  respondToFollowRequest,
  unfollow,
} from '@/lib/social.server'
import AppLayout from '@/components/AppLayout'

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
  isMutual?: boolean
}

interface MutualData {
  id: string
  userId: string
  user: { id: string; name: string }
  profile?: { username: string; avatarUrl: string | null }
}

function FollowersPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<
    'followers' | 'following' | 'mutuals' | 'requests'
  >('followers')
  const [followers, setFollowers] = useState<Array<FollowData>>([])
  const [following, setFollowing] = useState<Array<FollowData>>([])
  const [mutuals, setMutuals] = useState<Array<MutualData>>([])
  const [requests, setRequests] = useState<Array<FollowData>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    if (!user) return
    setIsLoading(true)

    try {
      const [followersResult, followingResult, requestsResult, mutualsResult] =
        await Promise.all([
          getFollowers({ data: { userId: user.id, status: 'ACCEPTED' } }),
          getFollowing({ data: { userId: user.id, status: 'ACCEPTED' } }),
          getPendingFollowRequests({ data: { userId: user.id } }),
          getMutualFollowers({ data: { userId: user.id } }),
        ])

      setFollowers(followersResult.followers as Array<FollowData>)
      setFollowing(followingResult.following as Array<FollowData>)
      setRequests(requestsResult.followers as Array<FollowData>)
      setMutuals(mutualsResult.mutuals as Array<MutualData>)
    } catch (error) {
      console.error('Failed to load followers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const handleRemoveFollower = async (followerId: string) => {
    if (!user) return
    if (!confirm('Remove this follower? They can request to follow you again.'))
      return
    try {
      await removeFollower({ data: { userId: user.id, followerId } })
      setActiveMenu(null)
      loadData()
    } catch (error) {
      console.error('Failed to remove follower:', error)
    }
  }

  const handleUnfollow = async (followingId: string) => {
    if (!user) return
    if (!confirm('Unfollow this user?')) return
    try {
      await unfollow({ data: { followerId: user.id, followingId } })
      setActiveMenu(null)
      loadData()
    } catch (error) {
      console.error('Failed to unfollow:', error)
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

  const renderUserCard = (
    userId: string,
    userName: string,
    profile: { username: string; avatarUrl: string | null } | undefined,
    isMutual: boolean | undefined,
    actions: {
      onRemove?: () => void
      onUnfollow?: () => void
    },
  ) => {
    const menuId = `menu-${userId}`

    return (
      <div
        key={userId}
        className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg"
      >
        <Link to="/u/$username" params={{ username: profile?.username ?? '' }}>
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={`${userName}'s profile picture`}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(userName)
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to="/u/$username"
              params={{ username: profile?.username ?? '' }}
              className="font-medium text-white truncate hover:text-blue-400"
            >
              {userName}
            </Link>
            {isMutual && (
              <span className="flex items-center gap-1 text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                <Users className="w-3 h-3" />
                Mutual
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-500">@{profile?.username}</p>
        </div>
        <div className="relative" ref={activeMenu === menuId ? menuRef : null}>
          <button
            onClick={() => setActiveMenu(activeMenu === menuId ? null : menuId)}
            className="p-2 hover:bg-zinc-700 rounded-lg"
          >
            <MoreVertical className="w-5 h-5 text-zinc-400" />
          </button>
          {activeMenu === menuId && (
            <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg py-1 z-10 min-w-[160px]">
              <Link
                to="/u/$username"
                params={{ username: profile?.username ?? '' }}
                className="block w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
              >
                View Profile
              </Link>
              {actions.onRemove && (
                <button
                  onClick={actions.onRemove}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                >
                  Remove Follower
                </button>
              )}
              {actions.onUnfollow && (
                <button
                  onClick={actions.onUnfollow}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                >
                  Unfollow
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
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
        <div className="flex gap-1 mb-4 overflow-x-auto">
          <button
            onClick={() => setTab('followers')}
            className={`flex-1 py-2 px-2 rounded-lg font-medium text-sm whitespace-nowrap ${
              tab === 'followers'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            Followers ({followers.length})
          </button>
          <button
            onClick={() => setTab('following')}
            className={`flex-1 py-2 px-2 rounded-lg font-medium text-sm whitespace-nowrap ${
              tab === 'following'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            Following ({following.length})
          </button>
          <button
            onClick={() => setTab('mutuals')}
            className={`flex-1 py-2 px-2 rounded-lg font-medium text-sm whitespace-nowrap ${
              tab === 'mutuals'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            Mutuals ({mutuals.length})
          </button>
          <button
            onClick={() => setTab('requests')}
            className={`flex-1 py-2 px-2 rounded-lg font-medium text-sm relative whitespace-nowrap ${
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
                          alt={`${req.follower?.name ?? 'User'}'s profile picture`}
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
              {followers.map((f) =>
                renderUserCard(
                  f.follower?.id ?? '',
                  f.follower?.name ?? 'Unknown',
                  f.profile,
                  f.isMutual,
                  {
                    onRemove: () => handleRemoveFollower(f.follower?.id ?? ''),
                  },
                ),
              )}
            </div>
          ) : (
            <div className="text-zinc-500 text-center py-8">
              No followers yet
            </div>
          )
        ) : tab === 'following' ? (
          following.length > 0 ? (
            <div className="space-y-2">
              {following.map((f) =>
                renderUserCard(
                  f.following?.id ?? '',
                  f.following?.name ?? 'Unknown',
                  f.profile,
                  f.isMutual,
                  {
                    onUnfollow: () => handleUnfollow(f.following?.id ?? ''),
                  },
                ),
              )}
            </div>
          ) : (
            <div className="text-zinc-500 text-center py-8">
              You're not following anyone yet
            </div>
          )
        ) : mutuals.length > 0 ? (
          <div className="space-y-2">
            {mutuals.map((m) =>
              renderUserCard(m.userId, m.user.name, m.profile, true, {
                onUnfollow: () => handleUnfollow(m.userId),
              }),
            )}
          </div>
        ) : (
          <div className="text-zinc-500 text-center py-8">
            <p>No mutual connections yet</p>
            <p className="text-sm mt-1">
              Mutuals are people who follow each other
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
