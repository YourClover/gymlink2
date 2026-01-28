import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

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
  const [isExpanded, setIsExpanded] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [, forceUpdate] = useState(0)
  const hasCompletedRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    setIsExpanded(false)
    setIsClosing(false)
    hasCompletedRef.current = false
    onClose()
  }, [clearPersistedTimer, onClose])

  // Handle minimize with animation
  const handleMinimize = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      setIsExpanded(false)
      setIsClosing(false)
    }, 200) // Match animation duration
  }, [])

  // Initialize timer when opening
  useEffect(() => {
    if (isOpen && durationSeconds > 0) {
      // Reset completion state for new timer
      hasCompletedRef.current = false

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

    const tick = () => {
      const remaining = Math.ceil((endTime - Date.now()) / 1000)

      if (remaining <= 0) {
        // Only handle completion once
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true
          // Stop the interval since timer is done
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          // Trigger haptic and expand to show completion
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200])
          }
          setIsExpanded(true)
        }
        forceUpdate((n) => n + 1)
        return
      }

      forceUpdate((n) => n + 1)
    }

    // Update every 100ms for smooth display
    intervalRef.current = setInterval(tick, 100)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isOpen, endTime])

  if (!isOpen) return null

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress =
    originalDuration > 0 ? 1 - remainingSeconds / originalDuration : 0
  const isComplete = remainingSeconds === 0

  // Expanded view
  if (isExpanded) {
    const circumference = 2 * Math.PI * 54
    const strokeDashoffset = circumference * (1 - progress)

    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        {/* Backdrop - tap to minimize */}
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => !isComplete && handleMinimize()}
        />

        {/* Expanded card */}
        <div
          className={`relative w-full max-w-md mx-4 mb-20 bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-800 safe-area-mb ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
        >
          {/* Minimize button */}
          <button
            onClick={handleMinimize}
            className="absolute top-3 right-3 p-1.5 text-zinc-500 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
            aria-label="Minimize"
          >
            <ChevronDown className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center">
            {/* Progress ring - smaller */}
            <div className="relative w-32 h-32 mb-4">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="54"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-zinc-800"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="54"
                  stroke="currentColor"
                  strokeWidth="6"
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

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-zinc-500">
                  {isComplete ? 'DONE' : 'REST'}
                </span>
                <span className="text-3xl font-mono font-bold text-white">
                  {formatTime(remainingSeconds)}
                </span>
              </div>
            </div>

            {/* Next set info */}
            {nextSetInfo && !isComplete && (
              <div className="text-center mb-4">
                <p className="text-zinc-500 text-xs">Next up</p>
                <p className="text-white text-sm font-medium">
                  Set {nextSetInfo.setNumber} - {nextSetInfo.exerciseName}
                </p>
              </div>
            )}

            {/* Action button */}
            <button
              onClick={handleClose}
              className="w-full py-3 bg-zinc-800 text-white font-medium rounded-xl hover:bg-zinc-700 transition-colors"
            >
              {isComplete ? 'Continue' : 'Skip Rest'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Minimized pill view
  return (
    <button
      onClick={() => setIsExpanded(true)}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-full shadow-lg hover:bg-zinc-800 transition-colors safe-area-mb"
    >
      {/* Mini progress ring */}
      <div className="relative w-8 h-8">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="16"
            cy="16"
            r="14"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            className="text-zinc-700"
          />
          <circle
            cx="16"
            cy="16"
            r="14"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            className={isComplete ? 'text-green-500' : 'text-blue-500'}
            style={{
              strokeDasharray: 2 * Math.PI * 14,
              strokeDashoffset: 2 * Math.PI * 14 * (1 - progress),
              transition: 'stroke-dashoffset 0.3s ease-out',
            }}
          />
        </svg>
      </div>

      {/* Time display */}
      <span className="font-mono font-semibold text-white text-lg">
        {formatTime(remainingSeconds)}
      </span>

      {/* Expand indicator */}
      <ChevronUp className="w-4 h-4 text-zinc-500" />
    </button>
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
