import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Dumbbell,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import type { MuscleGroup } from '@prisma/client'
import MuscleGroupBadge from '@/components/exercises/MuscleGroupBadge'
import { formatDuration, formatTime, formatVolume } from '@/lib/formatting'
import { getWorkoutSession } from '@/lib/workouts.server'

type WorkoutHistory = {
  id: string
  completedAt: Date | null
  durationSeconds: number | null
  workoutPlan?: { name: string } | null
  planDay?: { name: string } | null
  _count: { workoutSets: number }
  workoutSets: Array<{
    exercise: {
      name: string
      muscleGroup: MuscleGroup
    }
  }>
}

type SessionDetail = {
  workoutSets: Array<{
    id: string
    setNumber: number
    reps: number | null
    timeSeconds: number | null
    weight: number | null
    isWarmup: boolean
    isDropset: boolean
    exercise: {
      id: string
      name: string
      muscleGroup: MuscleGroup
      isTimed: boolean
    }
  }>
}

type Props = {
  workout: WorkoutHistory
  userId: string
}

function getUniqueMuscles(
  sets: WorkoutHistory['workoutSets'],
): Array<MuscleGroup> {
  const muscles = new Set<MuscleGroup>()
  for (const set of sets) {
    muscles.add(set.exercise.muscleGroup)
  }
  return Array.from(muscles).slice(0, 3)
}

function groupSetsByExercise(sets: SessionDetail['workoutSets']) {
  const groups: Array<{
    exerciseId: string
    exerciseName: string
    isTimed: boolean
    sets: SessionDetail['workoutSets']
  }> = []

  for (const set of sets) {
    const last = groups[groups.length - 1] as
      | (typeof groups)[number]
      | undefined
    if (last?.exerciseId === set.exercise.id) {
      last.sets.push(set)
    } else {
      groups.push({
        exerciseId: set.exercise.id,
        exerciseName: set.exercise.name,
        isTimed: set.exercise.isTimed,
        sets: [set],
      })
    }
  }

  return groups
}

function calculateVolume(sets: SessionDetail['workoutSets']): number {
  let volume = 0
  for (const set of sets) {
    if (set.isWarmup || set.isDropset) continue
    if (set.weight && set.reps) {
      volume += set.weight * set.reps
    }
  }
  return volume
}

export default function ExpandableWorkoutCard({ workout, userId }: Props) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(false)

  const formatDate = (date: Date | null) => {
    if (!date) return '--'
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const handleToggle = async () => {
    if (!expanded && !detail) {
      setLoading(true)
      try {
        const result = await getWorkoutSession({
          data: { id: workout.id, userId },
        })
        if (result.session) {
          setDetail(result.session as unknown as SessionDetail)
        }
      } catch (error) {
        console.error('Failed to load workout details:', error)
      } finally {
        setLoading(false)
      }
    }
    setExpanded(!expanded)
  }

  const muscles = getUniqueMuscles(workout.workoutSets)

  return (
    <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full p-4 text-left hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white truncate">
              {workout.planDay?.name ||
                workout.workoutPlan?.name ||
                'Quick Workout'}
            </h3>
            <p className="text-sm text-zinc-400">
              {formatDate(workout.completedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <div className="text-right text-sm text-zinc-400">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {workout.durationSeconds
                  ? formatDuration(workout.durationSeconds)
                  : '--'}
              </div>
            </div>
            {loading ? (
              <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
            ) : expanded ? (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {muscles.map((muscle) => (
              <MuscleGroupBadge key={muscle} muscleGroup={muscle} size="sm" />
            ))}
          </div>
          <div className="flex items-center gap-1 text-sm text-zinc-500">
            <Dumbbell className="w-4 h-4" />
            {workout._count.workoutSets} sets
          </div>
        </div>
      </button>

      {expanded && detail && (
        <div className="border-t border-zinc-700/50 px-4 py-3 space-y-3">
          {groupSetsByExercise(detail.workoutSets).map((group) => (
            <div key={`${group.exerciseId}-${group.sets[0].id}`}>
              <p className="text-sm font-medium text-zinc-300 mb-1">
                {group.exerciseName}
              </p>
              <div className="space-y-0.5">
                {group.sets.map((set) => (
                  <div
                    key={set.id}
                    className="flex items-center gap-2 text-xs text-zinc-500"
                  >
                    {set.isWarmup && (
                      <span className="text-yellow-500/70">W</span>
                    )}
                    {set.isDropset && (
                      <span className="text-orange-500/70">D</span>
                    )}
                    {!set.isWarmup && !set.isDropset && (
                      <span className="text-zinc-600">{set.setNumber}</span>
                    )}
                    <span className="text-zinc-400">
                      {group.isTimed
                        ? set.weight
                          ? `${set.weight}kg x ${formatTime(set.timeSeconds ?? 0)}`
                          : formatTime(set.timeSeconds ?? 0)
                        : set.weight
                          ? `${set.weight}kg x ${set.reps} reps`
                          : `${set.reps} reps`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {calculateVolume(detail.workoutSets) > 0 && (
            <div className="pt-2 border-t border-zinc-700/30 text-xs text-zinc-500">
              Total volume: {formatVolume(calculateVolume(detail.workoutSets))}
              kg
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate({
                to: '/workout/summary/$sessionId',
                params: { sessionId: workout.id },
              })
            }}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors pt-1"
          >
            <ExternalLink className="w-3 h-3" />
            View Full Summary
          </button>
        </div>
      )}
    </div>
  )
}
