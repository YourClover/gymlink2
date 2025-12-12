import { useEffect, useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { generateShareCode } from '@/lib/sharing.server'
import { useAuth } from '@/context/AuthContext'

interface SharePlanModalProps {
  isOpen: boolean
  onClose: () => void
  planId: string
  planName: string
}

export default function SharePlanModal({
  isOpen,
  onClose,
  planId,
  planName,
}: SharePlanModalProps) {
  const { user } = useAuth()
  const [shareCode, setShareCode] = useState<{
    code: string
    expiresAt: Date
  } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expiryText, setExpiryText] = useState('')

  const handleGenerateCode = async () => {
    if (!user) return

    setIsGenerating(true)
    setError(null)

    try {
      const result = await generateShareCode({
        data: {
          workoutPlanId: planId,
          userId: user.id,
        },
      })
      setShareCode({
        code: result.shareCode.code,
        expiresAt: new Date(result.shareCode.expiresAt),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate code')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!shareCode) return

    try {
      await navigator.clipboard.writeText(shareCode.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = shareCode.code
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShare = async () => {
    if (!shareCode) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Workout Plan: ${planName}`,
          text: `Import my workout plan "${planName}" using code: ${shareCode.code}`,
        })
      } catch {
        // User cancelled or share failed
      }
    }
  }

  const handleClose = () => {
    setShareCode(null)
    setCopied(false)
    setError(null)
    setExpiryText('')
    onClose()
  }

  // Calculate expiry text after hydration to avoid mismatch
  useEffect(() => {
    if (shareCode?.expiresAt) {
      const days = Math.ceil(
        (shareCode.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      )
      setExpiryText(days === 1 ? 'Expires in 1 day' : `Expires in ${days} days`)
    }
  }, [shareCode?.expiresAt])

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Share Plan">
      <div className="space-y-4">
        {!shareCode ? (
          <>
            <p className="text-zinc-400 text-sm">
              Generate a share code that others can use to import a copy of "
              {planName}".
            </p>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleGenerateCode}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5" />
                  Generate Share Code
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <p className="text-zinc-400 text-sm">
              Share this code with others to let them import your plan:
            </p>

            {/* Share code display */}
            <div className="bg-zinc-800 rounded-xl p-4 text-center">
              <p className="text-3xl font-mono font-bold text-white tracking-widest">
                {shareCode.code}
              </p>
              <p className="text-zinc-500 text-sm mt-2">{expiryText}</p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 text-white font-medium rounded-xl hover:bg-zinc-700 active:bg-zinc-600 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copy Code
                  </>
                )}
              </button>

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  Share
                </button>
              )}
            </div>

            <p className="text-zinc-500 text-xs text-center">
              Recipients will get their own copy of the plan to customize.
            </p>
          </>
        )}
      </div>
    </Modal>
  )
}
