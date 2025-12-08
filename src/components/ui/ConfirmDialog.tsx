import { useEffect } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'default'
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmDialogProps) {
  // Prevent body scroll when dialog is open
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

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const confirmButtonClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 active:bg-red-800'
      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-sm bg-zinc-900 rounded-2xl p-6 animate-fade-in">
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-zinc-400 text-sm mb-6">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-zinc-800 text-white font-medium rounded-xl hover:bg-zinc-700 active:bg-zinc-600 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-3 text-white font-medium rounded-xl transition-colors ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
