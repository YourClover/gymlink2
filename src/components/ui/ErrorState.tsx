import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  isRetrying?: boolean
  variant?: 'default' | 'network' | 'inline'
}

export default function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while loading. Please try again.',
  onRetry,
  isRetrying = false,
  variant = 'default',
}: ErrorStateProps) {
  const Icon = variant === 'network' ? WifiOff : AlertCircle

  if (variant === 'inline') {
    return (
      <div className="flex items-center justify-between gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{message}</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="flex items-center gap-1 px-2 py-1 text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
            aria-label="Retry"
          >
            <RefreshCw
              className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`}
            />
            Retry
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-400 max-w-sm mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          aria-label="Retry loading"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`}
          />
          {isRetrying ? 'Retrying...' : 'Try Again'}
        </button>
      )}
    </div>
  )
}
