import { memo } from 'react'
import { Link } from '@tanstack/react-router'
import { Dumbbell, Medal, PartyPopper, Target, Trophy } from 'lucide-react'
import type { ActivityType } from '@prisma/client'

interface ActivityMetadata {
  workoutName?: string
  setCount?: number
  duration?: number
  volume?: number
  exerciseName?: string
  value?: number
  previousRecord?: number
  recordType?: string
  weight?: number
  reps?: number
  timeSeconds?: number
  achievementName?: string
  achievementRarity?: string
  challengeName?: string
}

interface ActivityFeedItemProps {
  activity: {
    id: string
    userId: string
    activityType: ActivityType
    referenceId: string | null
    metadata: ActivityMetadata
    createdAt: Date
    user: { id: string; name: string }
    profile?: { username: string; avatarUrl: string | null }
  }
}

// Helper functions moved outside component to avoid recreation on each render
const formatRelativeDate = (date: Date) => {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins} min`
}

const formatVolume = (volume: number) => {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K kg`
  }
  return `${Math.round(volume)} kg`
}

const formatPRTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatPRValue = (metadata: ActivityMetadata) => {
  switch (metadata.recordType) {
    case 'MAX_VOLUME':
      if (metadata.weight && metadata.reps) {
        return `${metadata.weight}kg × ${metadata.reps} reps`
      }
      if (metadata.weight && metadata.timeSeconds) {
        return `${metadata.weight}kg × ${formatPRTime(metadata.timeSeconds)}`
      }
      return (metadata.value ?? 0).toLocaleString()
    case 'MAX_TIME':
      return formatPRTime(metadata.value ?? 0)
    case 'MAX_REPS':
      return `${metadata.value} reps`
    case 'MAX_WEIGHT':
      return `${metadata.value}kg`
    default:
      return (metadata.value ?? 0).toLocaleString()
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

function ActivityFeedItemComponent({ activity }: ActivityFeedItemProps) {
  const initials = getInitials(activity.user.name)

  const renderContent = (): React.ReactNode => {
    const metadata = activity.metadata

    switch (activity.activityType) {
      case 'WORKOUT_COMPLETED':
        return (
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Dumbbell className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-white">
                Completed{' '}
                <span className="font-medium">
                  {metadata.workoutName ?? 'a workout'}
                </span>
              </p>
              <p className="text-sm text-zinc-500">
                {metadata.setCount !== undefined && (
                  <span>{metadata.setCount} sets</span>
                )}
                {metadata.duration !== undefined && (
                  <span> · {formatDuration(metadata.duration)}</span>
                )}
                {metadata.volume !== undefined && metadata.volume > 0 && (
                  <span> · {formatVolume(metadata.volume)}</span>
                )}
              </p>
            </div>
          </div>
        )

      case 'PR_ACHIEVED':
        return (
          <div className="flex items-start gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Trophy className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-white">
                New PR on{' '}
                <span className="font-medium">
                  {metadata.exerciseName ?? 'an exercise'}
                </span>
              </p>
              <p className="text-sm text-zinc-500">{formatPRValue(metadata)}</p>
            </div>
          </div>
        )

      case 'ACHIEVEMENT_EARNED':
        return (
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Medal className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-white">
                Earned{' '}
                <span className="font-medium">
                  {metadata.achievementName ?? 'an achievement'}
                </span>
              </p>
              {metadata.achievementRarity && (
                <p className="text-sm text-zinc-500">
                  {metadata.achievementRarity} achievement
                </p>
              )}
            </div>
          </div>
        )

      case 'CHALLENGE_JOINED':
        return (
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Target className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-white">
                Joined the challenge{' '}
                <span className="font-medium">
                  {metadata.challengeName ?? ''}
                </span>
              </p>
            </div>
          </div>
        )

      case 'CHALLENGE_COMPLETED':
        return (
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <PartyPopper className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-white">
                Completed the challenge{' '}
                <span className="font-medium">
                  {metadata.challengeName ?? ''}
                </span>
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="bg-zinc-800/50 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Link
          to="/u/$username"
          params={{ username: activity.profile?.username ?? '' }}
        >
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
            {activity.profile?.avatarUrl ? (
              <img
                src={activity.profile.avatarUrl}
                alt={`${activity.user.name}'s profile picture`}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            to="/u/$username"
            params={{ username: activity.profile?.username ?? '' }}
          >
            <p className="font-medium text-white truncate hover:text-blue-400">
              {activity.user.name}
            </p>
          </Link>
          <p className="text-xs text-zinc-500">
            {formatRelativeDate(activity.createdAt)}
          </p>
        </div>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders in lists
export const ActivityFeedItem = memo(ActivityFeedItemComponent)
