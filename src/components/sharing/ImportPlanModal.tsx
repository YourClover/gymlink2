import { useState } from 'react'
import { Download, Calendar, Dumbbell, User, AlertTriangle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { getShareCodePreview, importPlanFromCode } from '@/lib/sharing.server'
import { useAuth } from '@/context/AuthContext'

interface ImportPlanModalProps {
  isOpen: boolean
  onClose: () => void
  onImportSuccess: (planId: string) => void
}

type Preview = {
  planName: string
  planDescription: string | null
  creatorName: string
  dayCount: number
  exerciseCount: number
  expiresAt: Date
}

export default function ImportPlanModal({
  isOpen,
  onClose,
  onImportSuccess,
}: ImportPlanModalProps) {
  const { user } = useAuth()
  const [code, setCode] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [customName, setCustomName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [skippedCount, setSkippedCount] = useState<number | null>(null)

  const handleLookup = async () => {
    if (!code.trim()) return

    setIsLoading(true)
    setError(null)
    setPreview(null)

    try {
      const result = await getShareCodePreview({
        data: { code: code.trim() },
      })
      setPreview({
        ...result.preview,
        expiresAt: new Date(result.preview.expiresAt),
      })
      setCustomName(result.preview.planName)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid share code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = async () => {
    if (!user || !preview) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await importPlanFromCode({
        data: {
          code: code.trim(),
          userId: user.id,
          newPlanName: customName !== preview.planName ? customName : undefined,
        },
      })

      if (result.skippedCustomExercises > 0) {
        setSkippedCount(result.skippedCustomExercises)
        // Show warning briefly, then redirect
        setTimeout(() => {
          onImportSuccess(result.newPlanId)
          handleClose()
        }, 2000)
      } else {
        onImportSuccess(result.newPlanId)
        handleClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import plan')
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setCode('')
    setPreview(null)
    setCustomName('')
    setError(null)
    setSkippedCount(null)
    setIsLoading(false)
    onClose()
  }

  const handleCodeChange = (value: string) => {
    // Uppercase and remove spaces
    setCode(value.toUpperCase().replace(/\s/g, ''))
    // Reset preview when code changes
    if (preview) {
      setPreview(null)
      setError(null)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Plan">
      <div className="space-y-4">
        {skippedCount !== null ? (
          // Success with warning
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
            <p className="text-white font-medium">Plan imported!</p>
            <p className="text-zinc-400 text-sm mt-1">
              {skippedCount} custom exercise{skippedCount !== 1 ? 's were' : ' was'} skipped
              (custom exercises cannot be shared).
            </p>
          </div>
        ) : !preview ? (
          // Code input state
          <>
            <p className="text-zinc-400 text-sm">
              Enter the share code you received to import a workout plan.
            </p>

            <div className="space-y-3">
              <input
                type="text"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="Enter share code"
                maxLength={8}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-center text-xl font-mono tracking-widest placeholder:text-zinc-500 placeholder:tracking-normal placeholder:text-base focus:outline-none focus:border-blue-500 transition-colors"
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleLookup}
                disabled={code.length < 8 || isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Looking up...
                  </>
                ) : (
                  'Look Up Plan'
                )}
              </button>
            </div>
          </>
        ) : (
          // Preview state
          <>
            {/* Plan preview card */}
            <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-white font-semibold text-lg">
                  {preview.planName}
                </p>
                {preview.planDescription && (
                  <p className="text-zinc-400 text-sm mt-1">
                    {preview.planDescription}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-sm">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <User className="w-4 h-4" />
                  <span>{preview.creatorName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Calendar className="w-4 h-4" />
                  <span>{preview.dayCount} days</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Dumbbell className="w-4 h-4" />
                  <span>{preview.exerciseCount} exercises</span>
                </div>
              </div>
            </div>

            {/* Custom name input */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Plan name (optional)
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Keep original name"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPreview(null)
                  setError(null)
                }}
                className="flex-1 px-4 py-3 bg-zinc-800 text-white font-medium rounded-xl hover:bg-zinc-700 active:bg-zinc-600 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Import Plan
                  </>
                )}
              </button>
            </div>

            <p className="text-zinc-500 text-xs text-center">
              You'll get your own copy of this plan to customize.
            </p>
          </>
        )}
      </div>
    </Modal>
  )
}
