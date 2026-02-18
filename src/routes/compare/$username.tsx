import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Dumbbell,
  Flame,
  Loader2,
  Lock,
  Medal,
  Trophy,
  Zap,
} from 'lucide-react'
import type { MuscleGroup } from '@prisma/client'
import type {ComparisonData} from '@/lib/compare.server';
import { useAuth } from '@/context/AuthContext'
import {  getComparisonData } from '@/lib/compare.server'
import CompareHeader from '@/components/compare/CompareHeader'
import CompareStatRow from '@/components/compare/CompareStatRow'
import ComparePRCard from '@/components/compare/ComparePRCard'
import CompareSummaryBar from '@/components/compare/CompareSummaryBar'
import MuscleGroupBadge from '@/components/exercises/MuscleGroupBadge'

export const Route = createFileRoute('/compare/$username')({
  component: ComparePage,
})

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

function formatVolume(volume: number) {
  if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M kg`
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K kg`
  return `${Math.round(volume)} kg`
}

function ComparePage() {
  const { username } = Route.useParams()
  const { user } = useAuth()
  const router = useRouter()

  const [data, setData] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      if (!user) return
      setLoading(true)
      setError(null)
      try {
        const result = await getComparisonData({
          data: { userId: user.id, targetUsername: username },
        })
        setData(result)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load comparison',
        )
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [user, username])

  const groupedPRs = useMemo(() => {
    if (!data) return []
    const groups: Record<string, typeof data.sharedPRs> = {}
    for (const pr of data.sharedPRs) {
      groups[pr.muscleGroup] ??= []
      groups[pr.muscleGroup].push(pr)
    }
    return Object.entries(groups).sort(([a], [b]) => {
      const aIdx = muscleGroupOrder.indexOf(a as MuscleGroup)
      const bIdx = muscleGroupOrder.indexOf(b as MuscleGroup)
      return aIdx - bIdx
    })
  }, [data])

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 safe-area-pt">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.history.back()}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-white">Compare</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-6 safe-area-pb pb-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-6 text-center">
            <Lock className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
            <h3 className="text-white font-medium mb-1">Cannot Compare</h3>
            <p className="text-sm text-zinc-400">{error}</p>
          </div>
        )}

        {data && (
          <>
            {/* Avatars + VS */}
            <CompareHeader me={data.me.profile} them={data.them.profile} />

            {/* Overview stats */}
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 divide-y divide-zinc-700/50">
              <CompareStatRow
                icon={Dumbbell}
                label="Workouts"
                leftValue={data.me.stats.totalWorkouts}
                rightValue={data.them.stats.totalWorkouts}
              />
              <CompareStatRow
                icon={Trophy}
                label="PRs"
                leftValue={data.me.stats.totalPRs}
                rightValue={data.them.stats.totalPRs}
              />
              <CompareStatRow
                icon={Flame}
                label="Volume"
                leftValue={formatVolume(data.me.stats.totalVolume)}
                rightValue={formatVolume(data.them.stats.totalVolume)}
                leftRaw={data.me.stats.totalVolume}
                rightRaw={data.them.stats.totalVolume}
              />
              <CompareStatRow
                icon={Medal}
                label="Badges"
                leftValue={data.me.stats.totalAchievements}
                rightValue={data.them.stats.totalAchievements}
              />
              <CompareStatRow
                icon={Zap}
                label="Streak"
                leftValue={`${data.me.stats.currentStreak}w`}
                rightValue={`${data.them.stats.currentStreak}w`}
                leftRaw={data.me.stats.currentStreak}
                rightRaw={data.them.stats.currentStreak}
              />
            </div>

            {/* PR comparison summary */}
            {data.sharedPRs.length > 0 && (
              <>
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-3">
                    Shared Exercises ({data.sharedPRs.length})
                  </h3>
                  <CompareSummaryBar
                    wins={data.summary.wins}
                    losses={data.summary.losses}
                    ties={data.summary.ties}
                  />
                </div>

                {/* Grouped PR cards */}
                {groupedPRs.map(([muscleGroup, prs]) => (
                  <section key={muscleGroup}>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <MuscleGroupBadge
                        muscleGroup={muscleGroup as MuscleGroup}
                        size="sm"
                      />
                      <span className="text-sm text-zinc-500">
                        {prs.length} exercise{prs.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 divide-y divide-zinc-700/50">
                      {prs.map((pr) => (
                        <ComparePRCard key={pr.exerciseId} pr={pr} />
                      ))}
                    </div>
                  </section>
                ))}
              </>
            )}

            {data.sharedPRs.length === 0 && (
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-6 text-center">
                <Trophy className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
                <h3 className="text-white font-medium mb-1">
                  No Shared Exercises
                </h3>
                <p className="text-sm text-zinc-400">
                  You and @{data.them.profile.username} don&apos;t have PRs for
                  any of the same exercises yet.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
