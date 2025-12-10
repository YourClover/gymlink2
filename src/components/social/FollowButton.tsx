import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { sendFollowRequest, unfollow } from '@/lib/social.server'
import { UserPlus, UserCheck, Clock, Loader2 } from 'lucide-react'

interface FollowButtonProps {
  userId: string
  currentStatus: string | null // null = not following, PENDING, ACCEPTED
  onStatusChange?: () => void
  size?: 'sm' | 'md'
}

export function FollowButton({
  userId,
  currentStatus,
  onStatusChange,
  size = 'md',
}: FollowButtonProps) {
  const { user } = useAuth()
  const [status, setStatus] = useState(currentStatus)
  const [isLoading, setIsLoading] = useState(false)

  if (!user || user.id === userId) return null

  const handleClick = async () => {
    setIsLoading(true)
    try {
      if (status === 'ACCEPTED' || status === 'PENDING') {
        await unfollow({ data: { followerId: user.id, followingId: userId } })
        setStatus(null)
      } else {
        const result = await sendFollowRequest({
          data: { followerId: user.id, followingId: userId },
        })
        setStatus(result.follow.status)
      }
      onStatusChange?.()
    } catch (error) {
      console.error('Follow action failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sizeClasses = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'

  if (isLoading) {
    return (
      <button
        disabled
        className={`flex items-center justify-center gap-2 bg-zinc-700 text-zinc-300 rounded-lg ${sizeClasses} w-full`}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
      </button>
    )
  }

  if (status === 'ACCEPTED') {
    return (
      <button
        onClick={handleClick}
        className={`flex items-center justify-center gap-2 bg-zinc-700 hover:bg-red-600/20 hover:text-red-400 text-white rounded-lg transition-colors ${sizeClasses} w-full`}
      >
        <UserCheck className="w-4 h-4" />
        Following
      </button>
    )
  }

  if (status === 'PENDING') {
    return (
      <button
        onClick={handleClick}
        className={`flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg ${sizeClasses} w-full`}
      >
        <Clock className="w-4 h-4" />
        Requested
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors ${sizeClasses} w-full`}
    >
      <UserPlus className="w-4 h-4" />
      Follow
    </button>
  )
}
