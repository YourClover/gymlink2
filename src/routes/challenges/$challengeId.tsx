import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Check,
  Clock,
  Crown,
  Loader2,
  Medal,
  Share2,
  Target,
  Trophy,
  Users,
} from 'lucide-react'
import type { ChallengeStatus, ChallengeType } from '@prisma/client'
import { useAuth } from '@/context/AuthContext'
import {
  getChallengeDetails,
  joinChallenge,
  leaveChallenge,
} from '@/lib/challenges.server'
import AppLayout from '@/components/AppLayout'

export const Route = createFileRoute('/challenges/$challengeId')({
  component: ChallengeDetailPage,
})

interface ParticipantData {
  id: string
  userId: string
  progress: number
  completedAt: Date | null
  rank: number
  user: { id: string; name: string }
  profile?: { username: string; avatarUrl: string | null }
}

interface ChallengeData {
  id: string
  name: string
  description: string | null
  challengeType: ChallengeType
  targetValue: number
  status: ChallengeStatus
  startDate: Date
  endDate: Date
  isPublic: boolean
  inviteCode: string | null
  maxParticipants: number | null
  creatorId: string
  creator: { id: string; name: string }
  exercise: { id: string; name: string } | null
  participants: Array<ParticipantData>
}

function ChallengeDetailPage() {
  const { challengeId } = Route.useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [challenge, setChallenge] = useState<ChallengeData | null>(null)
  const [isParticipating, setIsParticipating] = useState(false)
  const [userProgress, setUserProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [copied, setCopied] = useState(false)

  const loadChallenge = async () => {
    setIsLoading(true)
    try {
      const result = await getChallengeDetails({
        data: { challengeId, userId: user?.id },
      })

      if (result.challenge) {
        setChallenge(result.challenge as ChallengeData)
        setIsParticipating(!!result.userParticipation)
        setUserProgress(result.userParticipation?.progress ?? 0)
      }
    } catch (error) {
      console.error('Failed to load challenge:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadChallenge()
  }, [challengeId, user])

  const handleJoin = async () => {
    if (!user) return
    setIsJoining(true)
    try {
      await joinChallenge({ data: { challengeId, userId: user.id } })
      loadChallenge()
    } catch (error) {
      console.error('Failed to join:', error)
    } finally {
      setIsJoining(false)
    }
  }

  const handleLeave = async () => {
    if (!user) return
    setIsJoining(true)
    try {
      await leaveChallenge({ data: { challengeId, userId: user.id } })
      loadChallenge()
    } catch (error) {
      console.error('Failed to leave:', error)
    } finally {
      setIsJoining(false)
    }
  }

  const copyInviteLink = async () => {
    if (!challenge?.inviteCode) return
    const url = `${window.location.origin}/challenges/join/${challenge.inviteCode}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getChallengeTypeLabel = (type: ChallengeType) => {
    switch (type) {
      case 'TOTAL_WORKOUTS':
        return 'Total Workouts'
      case 'TOTAL_VOLUME':
        return 'Total Volume'
      case 'WORKOUT_STREAK':
        return 'Day Streak'
      case 'SPECIFIC_EXERCISE':
        return 'Exercise Volume'
      case 'TOTAL_SETS':
        return 'Total Sets'
    }
  }

  const getStatusBadge = (status: ChallengeStatus) => {
    switch (status) {
      case 'UPCOMING':
        return (
          <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs">
            Upcoming
          </span>
        )
      case 'ACTIVE':
        return (
          <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
            Active
          </span>
        )
      case 'COMPLETED':
        return (
          <span className="px-2 py-1 rounded-full bg-zinc-500/20 text-zinc-400 text-xs">
            Completed
          </span>
        )
      case 'CANCELLED':
        return (
          <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
            Cancelled
          </span>
        )
    }
  }

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />
      case 2:
        return <Medal className="w-5 h-5 text-zinc-400" />
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />
      default:
        return (
          <span className="w-5 h-5 flex items-center justify-center text-zinc-500 text-sm">
            {rank}
          </span>
        )
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

  if (isLoading) {
    return (
      <AppLayout showNav={false}>
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
        </div>
      </AppLayout>
    )
  }

  if (!challenge) {
    return (
      <AppLayout showNav={false}>
        <div className="p-4 text-center py-12">
          <p className="text-zinc-400">Challenge not found</p>
          <Link
            to="/challenges"
            className="text-blue-500 hover:text-blue-400 mt-2 inline-block"
          >
            Back to challenges
          </Link>
        </div>
      </AppLayout>
    )
  }

  const progress = (userProgress / challenge.targetValue) * 100
  const isCreator = user?.id === challenge.creatorId

  return (
    <AppLayout showNav={false}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate({ to: '/challenges' })}
            className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-white truncate">
                {challenge.name}
              </h1>
              {getStatusBadge(challenge.status)}
            </div>
            <p className="text-sm text-zinc-500">by {challenge.creator.name}</p>
          </div>
        </div>

        {/* Description */}
        {challenge.description && (
          <p className="text-zinc-400 mb-4">{challenge.description}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-zinc-800/50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-sm">Goal</span>
            </div>
            <p className="text-xl font-bold text-white">
              {challenge.targetValue}
            </p>
            <p className="text-xs text-zinc-500">
              {getChallengeTypeLabel(challenge.challengeType)}
            </p>
          </div>

          <div className="bg-zinc-800/50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-sm">Participants</span>
            </div>
            <p className="text-xl font-bold text-white">
              {challenge.participants.length}
              {challenge.maxParticipants && `/${challenge.maxParticipants}`}
            </p>
          </div>

          <div className="bg-zinc-800/50 rounded-xl p-3 col-span-2">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Duration</span>
            </div>
            <p className="text-white">
              {formatDate(challenge.startDate)} -{' '}
              {formatDate(challenge.endDate)}
            </p>
          </div>
        </div>

        {/* User Progress */}
        {isParticipating && challenge.status === 'ACTIVE' && (
          <div className="bg-zinc-800/50 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-medium">Your Progress</span>
              <span className="text-zinc-400">
                {Math.round(userProgress)} / {challenge.targetValue}
              </span>
            </div>
            <div className="h-3 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
            {progress >= 100 && (
              <div className="flex items-center gap-2 mt-2 text-green-400">
                <Trophy className="w-4 h-4" />
                <span className="text-sm">Challenge completed!</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mb-6">
          {!isParticipating && challenge.status !== 'COMPLETED' && (
            <button
              onClick={handleJoin}
              disabled={isJoining}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
            >
              {isJoining ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                'Join Challenge'
              )}
            </button>
          )}

          {isParticipating && !isCreator && challenge.status === 'ACTIVE' && (
            <button
              onClick={handleLeave}
              disabled={isJoining}
              className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-3 rounded-lg font-medium"
            >
              Leave Challenge
            </button>
          )}

          {challenge.inviteCode && (
            <button
              onClick={copyInviteLink}
              className="flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-3 rounded-lg"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <Share2 className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        {/* Leaderboard */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Leaderboard</h2>
          <div className="space-y-2">
            {challenge.participants.map((participant) => {
              const isCurrentUser = participant.userId === user?.id
              const participantProgress =
                (participant.progress / challenge.targetValue) * 100

              return (
                <Link
                  key={participant.id}
                  to="/u/$username"
                  params={{ username: participant.profile?.username ?? '' }}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    isCurrentUser
                      ? 'bg-blue-600/20 border border-blue-500/30'
                      : 'bg-zinc-800/50'
                  }`}
                >
                  <div className="w-8 flex items-center justify-center">
                    {getRankBadge(participant.rank)}
                  </div>

                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    {participant.profile?.avatarUrl ? (
                      <img
                        src={participant.profile.avatarUrl}
                        alt={`${participant.user.name}'s profile picture`}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials(participant.user.name)
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium truncate ${
                        isCurrentUser ? 'text-blue-400' : 'text-white'
                      }`}
                    >
                      {participant.user.name}
                      {isCurrentUser && ' (You)'}
                    </p>
                    <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full transition-all ${
                          participant.completedAt
                            ? 'bg-green-500'
                            : 'bg-blue-600'
                        }`}
                        style={{
                          width: `${Math.min(100, participantProgress)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-white">
                      {Math.round(participant.progress)}
                    </p>
                    {participant.completedAt && (
                      <Trophy className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
