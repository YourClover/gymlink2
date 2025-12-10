import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { joinChallengeByCode } from '@/lib/challenges.server'
import { Loader2, Target, AlertCircle } from 'lucide-react'

export const Route = createFileRoute('/challenges/join/$code')({
  component: JoinChallengeByCodePage,
})

function JoinChallengeByCodePage() {
  const { code } = Route.useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [isJoining, setIsJoining] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const joinChallenge = async () => {
      if (!user) {
        // Redirect to login with return URL
        navigate({ to: '/login' })
        return
      }

      try {
        const result = await joinChallengeByCode({
          data: { inviteCode: code, userId: user.id },
        })

        // Redirect to challenge page
        navigate({
          to: '/challenges/$challengeId',
          params: { challengeId: result.participant.challengeId },
        })
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to join challenge',
        )
        setIsJoining(false)
      }
    }

    joinChallenge()
  }, [code, user, navigate])

  if (isJoining) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Target className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <Loader2 className="w-6 h-6 text-zinc-500 animate-spin mx-auto mb-4" />
          <p className="text-white">Joining challenge...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">
          Unable to Join Challenge
        </h1>
        <p className="text-zinc-400 mb-6">{error}</p>
        <button
          onClick={() => navigate({ to: '/challenges' })}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
        >
          Go to Challenges
        </button>
      </div>
    </div>
  )
}
