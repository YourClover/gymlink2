import { useState, useEffect } from 'react'
import { X, Minus, Plus } from 'lucide-react'
import { type Exercise } from '@prisma/client'

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
  isLoading?: boolean
}

const RPE_VALUES = [6, 7, 8, 9, 10]

export default function SetLoggerModal({
  isOpen,
  onClose,
  onLog,
  exercise,
  setNumber,
  defaultValues,
  isLoading = false,
}: SetLoggerModalProps) {
  const [weight, setWeight] = useState(defaultValues?.weight ?? 0)
  const [reps, setReps] = useState(defaultValues?.reps ?? 10)
  const [timeSeconds, setTimeSeconds] = useState(defaultValues?.timeSeconds ?? 60)
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
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleLog = () => {
    onLog({
      reps: exercise.isTimed ? undefined : reps,
      timeSeconds: exercise.isTimed ? timeSeconds : undefined,
      weight: weight > 0 ? weight : undefined,
      rpe,
      isWarmup,
      isDropset,
    })
  }

  const adjustWeight = (delta: number) => {
    setWeight((prev) => Math.max(0, prev + delta))
  }

  const adjustReps = (delta: number) => {
    setReps((prev) => Math.max(1, prev + delta))
  }

  const adjustTime = (delta: number) => {
    setTimeSeconds((prev) => Math.max(5, prev + delta))
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
            <h2 className="text-lg font-semibold text-white">Log Set {setNumber}</h2>
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Weight Input */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-3">
              Weight (kg)
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => adjustWeight(-2.5)}
                className="w-14 h-14 flex items-center justify-center bg-zinc-800 rounded-xl text-white hover:bg-zinc-700 active:bg-zinc-600 transition-colors"
                aria-label="Decrease weight"
              >
                <Minus className="w-6 h-6" />
              </button>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                className="flex-1 text-center text-2xl font-semibold bg-zinc-800 text-white rounded-xl py-3 border border-zinc-700 focus:border-blue-500 focus:outline-none"
                inputMode="decimal"
                step={0.5}
                min={0}
              />
              <button
                onClick={() => adjustWeight(2.5)}
                className="w-14 h-14 flex items-center justify-center bg-zinc-800 rounded-xl text-white hover:bg-zinc-700 active:bg-zinc-600 transition-colors"
                aria-label="Increase weight"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Reps or Time Input */}
          {exercise.isTimed ? (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-3">
                Time
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => adjustTime(-15)}
                  className="w-14 h-14 flex items-center justify-center bg-zinc-800 rounded-xl text-white hover:bg-zinc-700 active:bg-zinc-600 transition-colors"
                  aria-label="Decrease time"
                >
                  <Minus className="w-6 h-6" />
                </button>
                <div className="flex-1 text-center text-2xl font-semibold bg-zinc-800 text-white rounded-xl py-3 border border-zinc-700">
                  {formatTime(timeSeconds)}
                </div>
                <button
                  onClick={() => adjustTime(15)}
                  className="w-14 h-14 flex items-center justify-center bg-zinc-800 rounded-xl text-white hover:bg-zinc-700 active:bg-zinc-600 transition-colors"
                  aria-label="Increase time"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-3">
                Reps
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => adjustReps(-1)}
                  className="w-14 h-14 flex items-center justify-center bg-zinc-800 rounded-xl text-white hover:bg-zinc-700 active:bg-zinc-600 transition-colors"
                  aria-label="Decrease reps"
                >
                  <Minus className="w-6 h-6" />
                </button>
                <input
                  type="number"
                  value={reps}
                  onChange={(e) => setReps(parseInt(e.target.value) || 1)}
                  className="flex-1 text-center text-2xl font-semibold bg-zinc-800 text-white rounded-xl py-3 border border-zinc-700 focus:border-blue-500 focus:outline-none"
                  inputMode="numeric"
                  min={1}
                />
                <button
                  onClick={() => adjustReps(1)}
                  className="w-14 h-14 flex items-center justify-center bg-zinc-800 rounded-xl text-white hover:bg-zinc-700 active:bg-zinc-600 transition-colors"
                  aria-label="Increase reps"
                >
                  <Plus className="w-6 h-6" />
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
