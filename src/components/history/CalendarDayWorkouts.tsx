import ExpandableWorkoutCard from './ExpandableWorkoutCard'
import type { MuscleGroup } from '@prisma/client'

type WorkoutDaySummary = {
  id: string
  completedAt: Date | null
  durationSeconds: number | null
  workoutPlan: { name: string } | null
  planDay: { name: string } | null
  _count: { workoutSets: number }
  workoutSets: Array<{
    exercise: { name: string; muscleGroup: MuscleGroup }
  }>
}

type Props = {
  year: number
  month: number
  day: number
  workouts: Array<WorkoutDaySummary>
  userId: string
}

export default function CalendarDayWorkouts({
  year,
  month,
  day,
  workouts,
  userId,
}: Props) {
  const date = new Date(year, month - 1, day)
  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-zinc-400 px-1">{dateLabel}</h3>
      {workouts.length === 0 ? (
        <div className="p-6 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-center">
          <p className="text-sm text-zinc-500">No workouts on this day</p>
        </div>
      ) : (
        workouts.map((workout) => (
          <ExpandableWorkoutCard
            key={workout.id}
            workout={workout}
            userId={userId}
          />
        ))
      )}
    </div>
  )
}
