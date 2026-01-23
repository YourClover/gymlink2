import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useBodyOverflow } from '@/hooks/useBodyOverflow'
import { REST_TIMER_AUTO_CLOSE_DELAY_MS } from '@/lib/constants'

const STORAGE_KEY = 'gymlink_rest_timer'

interface RestTimerProps {
  isOpen: boolean
  onClose: () => void
  durationSeconds: number
  nextSetInfo?: {
    exerciseName: string
    setNumber: number
  }
}

interface StoredTimer {
  endTime: number
  duration: number // Original duration for progress calculation
  nextSetInfo?: {
    exerciseName: string
    setNumber: number
  }
}

export default function RestTimer({
  isOpen,
  onClose,
  durationSeconds,
  nextSetInfo,
}: RestTimerProps) {
  const [endTime, setEndTime] = useState<number | null>(null)
  const [originalDuration, setOriginalDuration] = useState(durationSeconds)
  const [, forceUpdate] = useState(0)

  // Calculate remaining seconds from end time
  const remainingSeconds = endTime
    ? Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
    : 0

  // Clear persisted timer
  const clearPersistedTimer = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  // Handle close - clear storage and call onClose
  const handleClose = useCallback(() => {
    clearPersistedTimer()
    setEndTime(null)
    onClose()
  }, [clearPersistedTimer, onClose])

  // Initialize timer when opening
  useEffect(() => {
    if (isOpen && durationSeconds > 0) {
      // Check if there's a persisted timer first
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          const data: StoredTimer = JSON.parse(stored)
          const remaining = Math.ceil((data.endTime - Date.now()) / 1000)
          if (remaining > 0) {
            // Resume persisted timer
            setEndTime(data.endTime)
            setOriginalDuration(data.duration)
            return
          }
        } catch {
          // Invalid data, clear it
        }
        clearPersistedTimer()
      }

      // Start new timer
      const newEndTime = Date.now() + durationSeconds * 1000
      setEndTime(newEndTime)
      setOriginalDuration(durationSeconds)
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          endTime: newEndTime,
          duration: durationSeconds,
          nextSetInfo,
        }),
      )
    }
  }, [isOpen, durationSeconds, nextSetInfo, clearPersistedTimer])

  // Update display and handle completion
  useEffect(() => {
    if (!isOpen || !endTime) return

    let timeoutId: ReturnType<typeof setTimeout>

    const tick = () => {
      const remaining = Math.ceil((endTime - Date.now()) / 1000)

      if (remaining <= 0) {
        // Timer complete - trigger haptic
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200])
        }
        // Auto-close after delay
        timeoutId = setTimeout(handleClose, REST_TIMER_AUTO_CLOSE_DELAY_MS)
        forceUpdate((n) => n + 1)
        return
      }

      forceUpdate((n) => n + 1)
    }

    // Update every 100ms for smooth display
    const interval = setInterval(tick, 100)

    return () => {
      clearInterval(interval)
      clearTimeout(timeoutId)
    }
  }, [isOpen, endTime, handleClose])

  // Prevent body scroll
  useBodyOverflow(isOpen)

  if (!isOpen) return null

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress =
    originalDuration > 0 ? 1 - remainingSeconds / originalDuration : 0
  const circumference = 2 * Math.PI * 120
  const strokeDashoffset = circumference * (1 - progress)

  const isComplete = remainingSeconds === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/95 safe-area-pt safe-area-pb">
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors safe-area-mt"
        aria-label="Skip rest"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="flex flex-col items-center">
        {/* Progress ring */}
        <div className="relative w-64 h-64 mb-6">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="128"
              cy="128"
              r="120"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-zinc-800"
            />
            {/* Progress circle */}
            <circle
              cx="128"
              cy="128"
              r="120"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              className={isComplete ? 'text-green-500' : 'text-blue-500'}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset,
                transition: 'stroke-dashoffset 0.3s ease-out',
              }}
            />
          </svg>

          {/* Timer display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm text-zinc-500 mb-1">
              {isComplete ? 'REST COMPLETE' : 'REST'}
            </span>
            <span className="text-5xl font-mono font-bold text-white">
              {formatTime(remainingSeconds)}
            </span>
          </div>
        </div>

        {/* Next set info */}
        {nextSetInfo && !isComplete && (
          <div className="text-center mb-8">
            <p className="text-zinc-500 text-sm">Next up</p>
            <p className="text-white font-medium">
              Set {nextSetInfo.setNumber} - {nextSetInfo.exerciseName}
            </p>
          </div>
        )}

        {/* Skip button */}
        <button
          onClick={handleClose}
          className="px-8 py-3 bg-zinc-800 text-white font-medium rounded-xl hover:bg-zinc-700 transition-colors"
        >
          {isComplete ? 'Continue' : 'Skip Rest'}
        </button>
      </div>
    </div>
  )
}

// Export helper to check for persisted timer
export function getPersistedRestTimer(): StoredTimer | null {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return null

  try {
    const data: StoredTimer = JSON.parse(stored)
    const remaining = Math.ceil((data.endTime - Date.now()) / 1000)
    if (remaining > 0) {
      return data
    }
  } catch {
    // Invalid data
  }

  localStorage.removeItem(STORAGE_KEY)
  return null
}
