import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface RestTimerProps {
  isOpen: boolean
  onClose: () => void
  durationSeconds: number
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
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds)

  // Reset when opening with new duration
  useEffect(() => {
    if (isOpen) {
      setRemainingSeconds(durationSeconds)
    }
  }, [isOpen, durationSeconds])

  // Countdown timer
  useEffect(() => {
    if (!isOpen || remainingSeconds <= 0) return

    let timeoutId: ReturnType<typeof setTimeout>

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          // Timer complete - trigger haptic if available
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200])
          }
          // Auto-close after a brief delay
          timeoutId = setTimeout(onClose, 1500)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeoutId)
    }
  }, [isOpen, durationSeconds, onClose])

  // Prevent body scroll
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = 1 - remainingSeconds / durationSeconds
  const circumference = 2 * Math.PI * 120 // radius = 120
  const strokeDashoffset = circumference * (1 - progress)

  const isComplete = remainingSeconds === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/95 safe-area-pt safe-area-pb">
      {/* Close button */}
      <button
        onClick={onClose}
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
          onClick={onClose}
          className="px-8 py-3 bg-zinc-800 text-white font-medium rounded-xl hover:bg-zinc-700 transition-colors"
        >
          {isComplete ? 'Continue' : 'Skip Rest'}
        </button>
      </div>
    </div>
  )
}
