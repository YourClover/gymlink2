import { useEffect } from 'react'
import { Trophy, X } from 'lucide-react'

type RecordType = 'MAX_WEIGHT' | 'MAX_REPS' | 'MAX_VOLUME' | 'MAX_TIME'

interface PRToastProps {
  exerciseName: string
  newRecord: number
  previousRecord?: number
  recordType: RecordType
  weight?: number
  reps?: number
  timeSeconds?: number
  onClose: () => void
  autoCloseMs?: number
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatRecordDisplay(
  recordType: RecordType,
  newRecord: number,
  weight?: number,
  reps?: number,
  timeSeconds?: number,
): string {
  switch (recordType) {
    case 'MAX_VOLUME':
      if (weight && reps) {
        return `${weight}kg × ${reps} reps`
      }
      if (weight && timeSeconds) {
        return `${weight}kg × ${formatTime(timeSeconds)}`
      }
      if (reps) return `${reps} reps`
      if (timeSeconds) return formatTime(timeSeconds)
      return newRecord.toLocaleString()
    case 'MAX_TIME':
      return formatTime(newRecord)
    case 'MAX_REPS':
      return `${newRecord} reps`
    case 'MAX_WEIGHT':
      return `${newRecord}kg`
    default:
      return newRecord.toLocaleString()
  }
}

function formatImprovement(
  recordType: RecordType,
  improvement: number,
): string {
  switch (recordType) {
    case 'MAX_TIME':
      return `+${formatTime(improvement)}`
    case 'MAX_REPS':
      return `+${improvement} reps`
    case 'MAX_VOLUME':
    case 'MAX_WEIGHT':
    default:
      return `+${improvement.toLocaleString()}`
  }
}

export default function PRToast({
  exerciseName,
  newRecord,
  previousRecord,
  recordType,
  weight,
  reps,
  timeSeconds,
  onClose,
  autoCloseMs = 4000,
}: PRToastProps) {
  // Auto-close after delay
  useEffect(() => {
    const timer = setTimeout(onClose, autoCloseMs)
    return () => clearTimeout(timer)
  }, [onClose, autoCloseMs])

  const improvement = previousRecord ? newRecord - previousRecord : null

  return (
    <div className="fixed top-4 left-4 right-4 z-[90] animate-in slide-in-from-top-4 duration-300 safe-area-mt">
      <div className="max-w-md mx-auto bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/40 rounded-xl p-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-start gap-3">
          {/* Trophy icon */}
          <div className="p-2 rounded-full bg-yellow-500/30">
            <Trophy className="w-6 h-6 text-yellow-400" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-yellow-400">New PR!</span>
              {improvement && improvement > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-green-500/30 text-green-400 rounded-full">
                  {formatImprovement(recordType, improvement)}
                </span>
              )}
            </div>
            <p className="text-white font-medium truncate">{exerciseName}</p>
            <p className="text-sm text-zinc-400">
              {formatRecordDisplay(
                recordType,
                newRecord,
                weight,
                reps,
                timeSeconds,
              )}
              {previousRecord && (
                <span className="text-zinc-500">
                  {' '}
                  (previous:{' '}
                  {formatRecordDisplay(
                    recordType,
                    previousRecord,
                    weight,
                    reps,
                    timeSeconds,
                  )}
                  )
                </span>
              )}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700/50 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
