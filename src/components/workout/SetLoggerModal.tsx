import { useEffect, useState } from 'react'
import { Calendar, Minus, Plus, X } from 'lucide-react'
import type { Exercise, WeightUnit } from '@prisma/client'
import { useBodyOverflow } from '@/hooks/useBodyOverflow'
import {
  MIN_REPS,
  MIN_TIME_SECONDS,
  MIN_WEIGHT,
  RPE_VALUES,
  TIME_INCREMENT,
  WEIGHT_INCREMENT,
} from '@/lib/constants'
import { parseDecimalInput } from '@/lib/formatting'

interface PreviousWorkoutData {
  date: Date | null
  sets: Array<{
    setNumber: number
    weight: number | null
    reps: number | null
    timeSeconds: number | null
    rpe: number | null
    weightUnit: WeightUnit
  }>
}

interface SetLoggerModalProps {
  isOpen: boolean
  onClose: () => void
  onLog: (setData: {
    reps?: number
    timeSeconds?: number
    weight?: number
    rpe?: number
    isWarmup: boolean
    isDropset: boolean
  }) => void
  exercise: Exercise
  setNumber: number
  defaultValues?: {
    reps?: number
    timeSeconds?: number
    weight?: number
  }
  previousWorkout?: PreviousWorkoutData | null
  isLoading?: boolean
}

export default function SetLoggerModal({
  isOpen,
  onClose,
  onLog,
  exercise,
  setNumber,
  defaultValues,
  previousWorkout,
  isLoading = false,
}: SetLoggerModalProps) {
  const [weight, setWeight] = useState<number | string>(
    defaultValues?.weight ?? 0,
  )
  const [reps, setReps] = useState<number | string>(defaultValues?.reps ?? 10)
  const [timeSeconds, setTimeSeconds] = useState(
    defaultValues?.timeSeconds ?? 60,
  )
  const [rpe, setRpe] = useState<number | undefined>(undefined)
  const [isWarmup, setIsWarmup] = useState(false)
  const [isDropset, setIsDropset] = useState(false)

  // Reset state when modal opens with new defaults
  useEffect(() => {
    if (isOpen) {
      setWeight(defaultValues?.weight ?? 0)
      setReps(defaultValues?.reps ?? 10)
      setTimeSeconds(defaultValues?.timeSeconds ?? 60)
      setRpe(undefined)
      setIsWarmup(false)
      setIsDropset(false)
    }
  }, [isOpen, defaultValues])

  // Prevent body scroll when modal is open
  useBodyOverflow(isOpen)

  if (!isOpen) return null

  const handleLog = () => {
    const weightNum =
      typeof weight === 'string' ? parseDecimalInput(weight) : weight
    const repsNum = typeof reps === 'string' ? parseInt(reps) || 1 : reps
    onLog({
      reps: exercise.isTimed ? undefined : repsNum,
      timeSeconds: exercise.isTimed ? timeSeconds : undefined,
      weight: weightNum > 0 ? weightNum : undefined,
      rpe,
      isWarmup,
      isDropset,
    })
  }

  const adjustWeight = (delta: number) => {
    setWeight((prev) => {
      const num = typeof prev === 'string' ? parseDecimalInput(prev) : prev
      return Math.max(MIN_WEIGHT, num + delta)
    })
  }

  const adjustReps = (delta: number) => {
    setReps((prev) => {
      const num = typeof prev === 'string' ? parseInt(prev) || 0 : prev
      return Math.max(MIN_REPS, num + delta)
    })
  }

  const adjustTime = (delta: number) => {
    setTimeSeconds((prev) => Math.max(MIN_TIME_SECONDS, prev + delta))
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative w-full bg-zinc-900 rounded-t-2xl max-h-[85vh] flex flex-col animate-slide-up safe-area-pb">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Log Set {setNumber}
            </h2>
            <p className="text-sm text-zinc-400">{exercise.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Previous Workout Info */}
        {previousWorkout && previousWorkout.sets.length > 0 && (
          <div className="px-4 py-3 bg-zinc-800/50 border-b border-zinc-800">
            <div className="flex items-center justify-between text-sm text-zinc-400 mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  Last workout:{' '}
                  {previousWorkout.date
                    ? new Date(previousWorkout.date).toLocaleDateString(
                        'en-US',
                        {
                          month: 'short',
                          day: 'numeric',
                        },
                      )
                    : 'Unknown'}
                </span>
              </div>
              <span className="text-xs text-zinc-500">Tap to load</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {previousWorkout.sets.map((set) => {
                // Determine set status for coloring
                const isCompleted = set.setNumber < setNumber
                const isCurrent = set.setNumber === setNumber
                const isUpcoming = set.setNumber > setNumber

                // Build class names based on status
                let badgeClasses =
                  'text-xs px-2 py-1.5 rounded-md transition-colors cursor-pointer '
                if (isCompleted) {
                  badgeClasses +=
                    'bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-green-600/30'
                } else if (isCurrent) {
                  badgeClasses +=
                    'bg-blue-600/30 text-blue-300 border border-blue-500 hover:bg-blue-600/40 ring-1 ring-blue-500/50'
                } else if (isUpcoming) {
                  badgeClasses +=
                    'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700'
                }

                const handleLoadSet = () => {
                  if (set.weight !== null) {
                    setWeight(set.weight)
                  }
                  if (set.reps !== null) {
                    setReps(set.reps)
                  }
                  if (set.timeSeconds !== null) {
                    setTimeSeconds(set.timeSeconds)
                  }
                }

                return (
                  <button
                    key={set.setNumber}
                    onClick={handleLoadSet}
                    className={badgeClasses}
                    title={`Set ${set.setNumber} - Tap to load`}
                  >
                    {set.weight ? `${set.weight}kg` : ''}
                    {set.weight && set.reps ? ' × ' : ''}
                    {set.reps ? `${set.reps}` : ''}
                    {set.timeSeconds && !set.reps
                      ? `${Math.floor(set.timeSeconds / 60)}:${(set.timeSeconds % 60).toString().padStart(2, '0')}`
                      : ''}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Weight Input */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-3">
              Weight (kg)
            </label>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => adjustWeight(-WEIGHT_INCREMENT)}
                className="w-12 h-12 flex items-center justify-center bg-zinc-800 rounded-xl text-white hover:bg-zinc-700 active:bg-zinc-600 transition-colors"
                aria-label="Decrease weight"
              >
                <Minus className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-36 text-center text-xl font-semibold bg-zinc-800 text-white rounded-xl py-2.5 border border-zinc-700 focus:border-blue-500 focus:outline-none"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
              />
              <button
                onClick={() => adjustWeight(WEIGHT_INCREMENT)}
                className="w-12 h-12 flex items-center justify-center bg-zinc-800 rounded-xl text-white hover:bg-zinc-700 active:bg-zinc-600 transition-colors"
                aria-label="Increase weight"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Reps or Time Input */}
          {exercise.isTimed ? (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-3">
                Time
              </label>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => adjustTime(-TIME_INCREMENT)}
                  className="w-12 h-12 flex items-center justify-center bg-zinc-800 rounded-xl text-white hover:bg-zinc-700 active:bg-zinc-600 transition-colors"
                  aria-label="Decrease time"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <div className="w-36 text-center text-xl font-semibold bg-zinc-800 text-white rounded-xl py-2.5 border border-zinc-700">
                  {formatTime(timeSeconds)}
                </div>
                <button
                  onClick={() => adjustTime(TIME_INCREMENT)}
                  className="w-12 h-12 flex items-center justify-center bg-zinc-800 rounded-xl text-white hover:bg-zinc-700 active:bg-zinc-600 transition-colors"
                  aria-label="Increase time"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-3">
                Reps
              </label>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => adjustReps(-1)}
                  className="w-12 h-12 flex items-center justify-center bg-zinc-800 rounded-xl text-white hover:bg-zinc-700 active:bg-zinc-600 transition-colors"
                  aria-label="Decrease reps"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <input
                  type="number"
                  value={reps}
                  onChange={(e) =>
                    setReps(
                      e.target.value === ''
                        ? ''
                        : parseInt(e.target.value) || MIN_REPS,
                    )
                  }
                  className="w-36 text-center text-xl font-semibold bg-zinc-800 text-white rounded-xl py-2.5 border border-zinc-700 focus:border-blue-500 focus:outline-none"
                  inputMode="numeric"
                  min={MIN_REPS}
                />
                <button
                  onClick={() => adjustReps(1)}
                  className="w-12 h-12 flex items-center justify-center bg-zinc-800 rounded-xl text-white hover:bg-zinc-700 active:bg-zinc-600 transition-colors"
                  aria-label="Increase reps"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* RPE Selector */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-3">
              RPE (optional)
            </label>
            <div className="flex gap-2">
              {RPE_VALUES.map((value) => (
                <button
                  key={value}
                  onClick={() => setRpe(rpe === value ? undefined : value)}
                  className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                    rpe === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {/* Set Type Toggles */}
          <div className="flex gap-3">
            <button
              onClick={() => setIsWarmup(!isWarmup)}
              className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                isWarmup
                  ? 'bg-orange-600/20 text-orange-400 border border-orange-600'
                  : 'bg-zinc-800 text-zinc-400 border border-transparent hover:bg-zinc-700'
              }`}
            >
              Warmup
            </button>
            <button
              onClick={() => setIsDropset(!isDropset)}
              className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                isDropset
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-600'
                  : 'bg-zinc-800 text-zinc-400 border border-transparent hover:bg-zinc-700'
              }`}
            >
              Dropset
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={handleLog}
            disabled={isLoading}
            className="w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 active:bg-blue-800 disabled:bg-zinc-700 disabled:text-zinc-500 transition-colors"
          >
            {isLoading ? 'Logging...' : 'Log Set'}
          </button>
        </div>
      </div>
    </div>
  )
}
