import { type ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4 text-zinc-500">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm max-w-xs mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
