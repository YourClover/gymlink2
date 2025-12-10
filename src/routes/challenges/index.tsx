import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getUserChallenges } from '@/lib/challenges.server'
import AppLayout from '@/components/AppLayout'
import {
  Target,
  Plus,
  Trophy,
  Clock,
  Users,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import type { ChallengeStatus, ChallengeType } from '@prisma/client'

export const Route = createFileRoute('/challenges/')({
  component: ChallengesPage,
})

interface ChallengeData {
  id: string
  name: string
  description: string | null
  challengeType: ChallengeType
  targetValue: number
  status: ChallengeStatus
  startDate: Date
  endDate: Date
  userProgress: number
  userCompletedAt: Date | null
  participantCount: number
  creator: { name: string }
}

function ChallengesPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'active' | 'upcoming' | 'completed'>('active')
  const [challenges, setChallenges] = useState<ChallengeData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadChallenges = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const result = await getUserChallenges({ data: { userId: user.id } })
      setChallenges(result.challenges as ChallengeData[])
    } catch (error) {
      console.error('Failed to load challenges:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadChallenges()
  }, [user])

  const filteredChallenges = challenges.filter((c) => {
    switch (tab) {
      case 'active':
        return c.status === 'ACTIVE'
      case 'upcoming':
        return c.status === 'UPCOMING'
      case 'completed':
        return c.status === 'COMPLETED' || c.userCompletedAt !== null
    }
  })

  const getChallengeTypeLabel = (type: ChallengeType) => {
    switch (type) {
      case 'TOTAL_WORKOUTS':
        return 'Workouts'
      case 'TOTAL_VOLUME':
        return 'Volume (kg)'
      case 'WORKOUT_STREAK':
        return 'Day Streak'
      case 'SPECIFIC_EXERCISE':
        return 'Exercise Volume'
      case 'TOTAL_SETS':
        return 'Total Sets'
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const getProgress = (challenge: ChallengeData) => {
    return Math.min(100, (challenge.userProgress / challenge.targetValue) * 100)
  }

  return (
    <AppLayout title="Challenges">
      <div className="p-4">
        {/* Header Actions */}
        <div className="flex gap-2 mb-4">
          <Link
            to="/challenges/new"
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
          >
            <Plus className="w-5 h-5" />
            Create Challenge
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('active')}
            className={`flex-1 py-2 rounded-lg font-medium text-sm ${
              tab === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setTab('upcoming')}
            className={`flex-1 py-2 rounded-lg font-medium text-sm ${
              tab === 'upcoming'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setTab('completed')}
            className={`flex-1 py-2 rounded-lg font-medium text-sm ${
              tab === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            Completed
          </button>
        </div>

        {/* Challenges List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        ) : filteredChallenges.length > 0 ? (
          <div className="space-y-3">
            {filteredChallenges.map((challenge) => (
              <Link
                key={challenge.id}
                to="/challenges/$challengeId"
                params={{ challengeId: challenge.id }}
                className="block bg-zinc-800/50 rounded-xl p-4 hover:bg-zinc-700/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">
                      {challenge.name}
                    </h3>
                    <p className="text-sm text-zinc-500">
                      by {challenge.creator.name}
                    </p>
                  </div>
                  {challenge.userCompletedAt ? (
                    <Trophy className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-zinc-500 flex-shrink-0" />
                  )}
                </div>

                {/* Progress */}
                {tab === 'active' && (
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-400">
                        {getChallengeTypeLabel(challenge.challengeType)}
                      </span>
                      <span className="text-white">
                        {Math.round(challenge.userProgress)} /{' '}
                        {challenge.targetValue}
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: `${getProgress(challenge)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Meta */}
                <div className="flex items-center gap-4 text-sm text-zinc-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDate(challenge.startDate)} -{' '}
                    {formatDate(challenge.endDate)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {challenge.participantCount}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-white font-medium mb-1">
              No {tab} challenges
            </h3>
            <p className="text-sm text-zinc-500">
              {tab === 'active'
                ? 'Create or join a challenge to get started'
                : tab === 'upcoming'
                  ? 'No upcoming challenges yet'
                  : 'Complete challenges to see them here'}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
