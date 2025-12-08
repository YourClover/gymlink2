import { useState } from 'react'

interface PlanFormProps {
  initialData?: { name: string; description?: string }
  onSubmit: (data: { name: string; description?: string }) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  submitLabel?: string
}

export default function PlanForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save',
}: PlanFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [description, setDescription] = useState(
    initialData?.description ?? '',
  )
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Plan name is required')
      return
    }

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="plan-name"
          className="block text-sm font-medium text-zinc-400 mb-2"
        >
          Plan Name *
        </label>
        <input
          id="plan-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Push Pull Legs"
          className="w-full px-4 py-3 bg-zinc-800 text-white placeholder-zinc-500 rounded-xl border border-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
      </div>

      <div>
        <label
          htmlFor="plan-description"
          className="block text-sm font-medium text-zinc-400 mb-2"
        >
          Description
        </label>
        <textarea
          id="plan-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description for your plan"
          rows={3}
          className="w-full px-4 py-3 bg-zinc-800 text-white placeholder-zinc-500 rounded-xl border border-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-zinc-800 text-white font-medium rounded-xl hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
