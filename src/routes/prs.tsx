import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, Trophy } from 'lucide-react'
import type { MuscleGroup } from '@prisma/client'
import { useAuth } from '@/context/AuthContext'
import AppLayout from '@/components/AppLayout'
import MuscleGroupBadge from '@/components/exercises/MuscleGroupBadge'
import { getUserExercisePRs } from '@/lib/stats.server'

export const Route = createFileRoute('/prs')({
  component: PRsPage,
})

type ExercisePR = {
  exerciseId: string
  exerciseName: string
  isTimed: boolean
  value: number
  reps: number | null
  timeSeconds: number | null
  achievedAt: Date
}

type GroupedPRs = Record<string, Array<ExercisePR>>

function PRsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [grouped, setGrouped] = useState<GroupedPRs>({})
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const fetchPRs = async () => {
      if (!user) return

      try {
        const result = await getUserExercisePRs({ data: { userId: user.id } })
        setGrouped(result.grouped)
        setTotal(result.total)
      } catch (error) {
        console.error('Failed to fetch PRs:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPRs()
  }, [user])

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatPR = (pr: ExercisePR) => {
    if (pr.timeSeconds) {
      return `${pr.value}kg x ${pr.timeSeconds}s`
    }
    return `${pr.value}kg x ${pr.reps} reps`
  }

  const muscleGroupOrder: Array<MuscleGroup> = [
    'CHEST',
    'BACK',
    'LEGS',
    'SHOULDERS',
    'ARMS',
    'CORE',
    'CARDIO',
    'FULL_BODY',
  ]

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
    const aIndex = muscleGroupOrder.indexOf(a as MuscleGroup)
    const bIndex = muscleGroupOrder.indexOf(b as MuscleGroup)
    return aIndex - bIndex
  })

  if (loading) {
    return (
      <AppLayout title="My PRs" showNav={false}>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 safe-area-pt">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate({ to: '/profile' })}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-white">My PRs</h1>
          <span className="ml-auto text-sm text-zinc-500">
            {total} exercise{total !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      <div className="px-4 py-4 space-y-6 safe-area-pb pb-8">
        {total === 0 ? (
          <div className="p-8 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-center">
            <Trophy className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              No PRs yet
            </h2>
            <p className="text-zinc-400 max-w-sm mx-auto">
              Complete workouts to start tracking your personal records
            </p>
          </div>
        ) : (
          sortedGroups.map(([muscleGroup, exercises]) => (
            <section key={muscleGroup}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <MuscleGroupBadge
                  muscleGroup={muscleGroup as MuscleGroup}
                  size="sm"
                />
                <span className="text-sm text-zinc-500">
                  {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 divide-y divide-zinc-700/50">
                {exercises.map((pr) => (
                  <div
                    key={pr.exerciseId}
                    className="p-4 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {pr.exerciseName}
                      </p>
                      <p className="text-sm text-zinc-400">{formatPR(pr)}</p>
                    </div>
                    <div className="text-xs text-zinc-500 text-right">
                      {formatDate(pr.achievedAt)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
