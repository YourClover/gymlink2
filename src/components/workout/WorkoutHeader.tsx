import { useEffect, useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'

interface WorkoutHeaderProps {
  startedAt: Date
  onBack: () => void
  onFinish: () => void
  planName?: string
  dayName?: string
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export default function WorkoutHeader({
  startedAt,
  onBack,
  onFinish,
  planName,
  dayName,
}: WorkoutHeaderProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    // Calculate initial elapsed time
    const calculateElapsed = () => {
      return Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
    }

    setElapsedSeconds(calculateElapsed())

    // Update every second
    const interval = setInterval(() => {
      setElapsedSeconds(calculateElapsed())
    }, 1000)

    return () => clearInterval(interval)
  }, [startedAt])

  return (
    <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 safe-area-pt">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Back button */}
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Center - Timer and workout info */}
        <div className="flex-1 text-center px-4">
          {(planName || dayName) && (
            <p className="text-xs text-zinc-500 truncate">
              {planName}
              {dayName && ` - ${dayName}`}
            </p>
          )}
          <p className="text-lg font-mono font-semibold text-white">
            {formatDuration(elapsedSeconds)}
          </p>
        </div>

        {/* Finish button */}
        <button
          onClick={onFinish}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          <Check className="w-4 h-4" />
          Finish
        </button>
      </div>
    </header>
  )
}
