import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronRight, Clock, Dumbbell } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import { formatDuration, formatRelativeDate } from '@/lib/formatting'

export type RecentWorkout = {
  id: string
  completedAt: Date | null
  durationSeconds: number | null
  workoutPlan?: { name: string } | null
  planDay?: { name: string } | null
  _count: { workoutSets: number }
}

type Props = {
  workouts: Array<RecentWorkout>
  animationDelayOffset?: number
}

export default function RecentWorkoutsList({
  workouts,
  animationDelayOffset = 0,
}: Props) {
  const navigate = useNavigate()

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Recent Workouts</h2>
        {workouts.length > 0 && (
          <Link
            to="/history"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            View all &rarr;
          </Link>
        )}
      </div>
      {workouts.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="w-8 h-8" />}
          title="No workouts yet"
          description="Complete a workout to see it here."
        />
      ) : (
        <div className="space-y-2">
          {workouts.map((workout, index) => (
            <button
              key={workout.id}
              onClick={() =>
                navigate({
                  to: '/workout/summary/$sessionId',
                  params: { sessionId: workout.id },
                })
              }
              className="w-full p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800/70 transition-colors text-left animate-fade-in"
              style={{
                animationDelay: `${animationDelayOffset + index * 50}ms`,
                animationFillMode: 'backwards',
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-zinc-700/50">
                  <Dumbbell className="w-5 h-5 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white truncate">
                    {workout.planDay?.name ||
                      workout.workoutPlan?.name ||
                      'Quick Workout'}
                  </h4>
                  <div className="flex items-center gap-3 text-sm text-zinc-500">
                    <span>
                      {workout.completedAt &&
                        formatRelativeDate(workout.completedAt)}
                    </span>
                    {workout.durationSeconds && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDuration(workout.durationSeconds)}
                      </span>
                    )}
                    <span>{workout._count.workoutSets} sets</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-600" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
