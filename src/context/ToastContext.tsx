import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    bgClass: 'bg-green-500/20 border-green-500/40',
    iconClass: 'text-green-400',
  },
  error: {
    icon: XCircle,
    bgClass: 'bg-red-500/20 border-red-500/40',
    iconClass: 'text-red-400',
  },
  warning: {
    icon: AlertCircle,
    bgClass: 'bg-yellow-500/20 border-yellow-500/40',
    iconClass: 'text-yellow-400',
  },
  info: {
    icon: Info,
    bgClass: 'bg-blue-500/20 border-blue-500/40',
    iconClass: 'text-blue-400',
  },
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast
  onRemove: (id: string) => void
}) {
  const config = toastConfig[toast.type]
  const Icon = config.icon

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-xl border backdrop-blur-sm shadow-lg animate-in slide-in-from-top-2 duration-200 ${config.bgClass}`}
      role="alert"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${config.iconClass}`} />
      <p className="flex-1 text-sm text-white">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700/50 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (type: ToastType, message: string, duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const toast: Toast = { id, type, message, duration }

      setToasts((prev) => [...prev, toast])

      // Auto-remove after duration
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration)
      }
    },
    [removeToast],
  )

  const success = useCallback(
    (message: string, duration?: number) => showToast('success', message, duration),
    [showToast],
  )
  const error = useCallback(
    (message: string, duration?: number) => showToast('error', message, duration),
    [showToast],
  )
  const warning = useCallback(
    (message: string, duration?: number) => showToast('warning', message, duration),
    [showToast],
  )
  const info = useCallback(
    (message: string, duration?: number) => showToast('info', message, duration),
    [showToast],
  )

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="fixed top-4 left-4 right-4 z-[100] pointer-events-none safe-area-mt">
          <div className="max-w-md mx-auto flex flex-col gap-2 pointer-events-auto">
            {toasts.map((toast) => (
              <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
            ))}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}
