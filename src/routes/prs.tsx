import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, LineChart, TrendingUp, Trophy } from 'lucide-react'
import type { MuscleGroup, RecordType } from '@prisma/client'
import type { PRSortMode } from '@/components/prs/PRSortSelector'
import { useAuth } from '@/context/AuthContext'
import { SkeletonPRRow } from '@/components/ui/SocialSkeletons'
import EmptyState from '@/components/ui/EmptyState'
import MuscleGroupBadge from '@/components/exercises/MuscleGroupBadge'
import PRSortSelector from '@/components/prs/PRSortSelector'
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
  weight: number | null
  recordType: RecordType
  achievedAt: Date
  previousRecord: number | null
}

type GroupedPRs = Record<string, Array<ExercisePR>>

function PRsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [grouped, setGrouped] = useState<GroupedPRs>({})
  const [total, setTotal] = useState(0)
  const [sortMode, setSortMode] = useState<PRSortMode>('muscle')

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatPR = (pr: ExercisePR) => {
    switch (pr.recordType) {
      case 'MAX_VOLUME':
        if (pr.weight && pr.reps) {
          return `${pr.weight}kg x ${pr.reps} reps`
        }
        if (pr.weight && pr.timeSeconds) {
          return `${pr.weight}kg x ${formatTime(pr.timeSeconds)}`
        }
        return `Score: ${pr.value.toLocaleString()}`
      case 'MAX_TIME':
        return formatTime(pr.value)
      case 'MAX_REPS':
        return `${pr.value} reps`
      case 'MAX_WEIGHT':
        return `${pr.value}kg`
      default:
        return pr.value.toLocaleString()
    }
  }

  const getImprovement = (pr: ExercisePR): number | null => {
    if (pr.previousRecord && pr.previousRecord > 0) {
      return Math.round(
        ((pr.value - pr.previousRecord) / pr.previousRecord) * 100,
      )
    }
    return null
  }

  const isNewPR = (pr: ExercisePR): boolean => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return new Date(pr.achievedAt) > sevenDaysAgo
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

  // Get all PRs as a flat list
  const allPRs = useMemo(() => Object.values(grouped).flat(), [grouped])

  // Sorted flat list for non-grouped modes
  const sortedFlatPRs = useMemo(() => {
    if (sortMode === 'newest') {
      return [...allPRs].sort(
        (a, b) =>
          new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime(),
      )
    }
    if (sortMode === 'improvement') {
      return [...allPRs].sort((a, b) => {
        const aImp = getImprovement(a) ?? -1
        const bImp = getImprovement(b) ?? -1
        return bImp - aImp
      })
    }
    return allPRs
  }, [allPRs, sortMode])

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
    const aIndex = muscleGroupOrder.indexOf(a as MuscleGroup)
    const bIndex = muscleGroupOrder.indexOf(b as MuscleGroup)
    return aIndex - bIndex
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900">
        <header className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 safe-area-pt">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="p-2 -ml-2 w-9 h-9" />
            <h1 className="text-lg font-semibold text-white">My PRs</h1>
          </div>
        </header>
        <div className="px-4 py-4 space-y-4">
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 divide-y divide-zinc-700/50">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonPRRow key={i} />
            ))}
          </div>
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 divide-y divide-zinc-700/50">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonPRRow key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderPRRow = (pr: ExercisePR) => {
    const improvement = getImprovement(pr)
    const isRecent = isNewPR(pr)

    return (
      <div
        key={`${pr.exerciseId}-${pr.recordType}`}
        className="p-4 flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
          <Trophy className="w-5 h-5 text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-white truncate">{pr.exerciseName}</p>
            {isRecent && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-semibold uppercase flex-shrink-0">
                New
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-zinc-400">{formatPR(pr)}</p>
            {improvement !== null && improvement > 0 && (
              <span className="flex items-center gap-0.5 text-xs font-medium text-green-400">
                <TrendingUp className="w-3 h-3" />+{improvement}%
              </span>
            )}
          </div>
        </div>
        <div className="text-xs text-zinc-500 text-right mr-2 flex-shrink-0">
          {formatDate(pr.achievedAt)}
        </div>
        <button
          onClick={() =>
            navigate({
              to: '/progress/$exerciseId',
              params: { exerciseId: pr.exerciseId },
            })
          }
          className="p-2 text-zinc-400 hover:text-blue-400 rounded-lg hover:bg-zinc-700/50 transition-colors focus:outline-none active:scale-95"
          title="View progress"
        >
          <LineChart className="w-4 h-4" />
        </button>
      </div>
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
          <EmptyState
            icon={<Trophy className="w-8 h-8" />}
            title="No PRs yet"
            description="Complete workouts to start tracking your personal records."
            action={{
              label: 'Start Workout',
              onClick: () => navigate({ to: '/workout' }),
            }}
          />
        ) : (
          <>
            {/* Sort selector */}
            <PRSortSelector value={sortMode} onChange={setSortMode} />

            {/* Grouped by muscle (default) */}
            {sortMode === 'muscle' &&
              sortedGroups.map(([muscleGroup, exercises], index) => (
                <section
                  key={muscleGroup}
                  className="animate-fade-in"
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animationFillMode: 'backwards',
                  }}
                >
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <MuscleGroupBadge
                      muscleGroup={muscleGroup as MuscleGroup}
                      size="sm"
                    />
                    <span className="text-sm text-zinc-500">
                      {exercises.length} exercise
                      {exercises.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 divide-y divide-zinc-700/50">
                    {exercises.map(renderPRRow)}
                  </div>
                </section>
              ))}

            {/* Flat list (newest or improvement) */}
            {(sortMode === 'newest' || sortMode === 'improvement') && (
              <div
                className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 divide-y divide-zinc-700/50 animate-fade-in"
                style={{ animationFillMode: 'backwards' }}
              >
                {sortedFlatPRs.map(renderPRRow)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
