import { useState } from 'react'

interface PlanDayFormProps {
  initialData?: { name: string; restDay: boolean }
  onSubmit: (data: { name: string; restDay: boolean }) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  submitLabel?: string
}

export default function PlanDayForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save',
}: PlanDayFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [restDay, setRestDay] = useState(initialData?.restDay ?? false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Day name is required')
      return
    }

    try {
      await onSubmit({
        name: name.trim(),
        restDay,
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
          htmlFor="day-name"
          className="block text-sm font-medium text-zinc-400 mb-2"
        >
          Day Name *
        </label>
        <input
          id="day-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Push Day, Upper Body"
          className="w-full px-4 py-3 bg-zinc-800 text-white placeholder-zinc-500 rounded-xl border border-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
      </div>

      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={restDay}
              onChange={(e) => setRestDay(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-11 h-6 rounded-full transition-colors ${
                restDay ? 'bg-blue-600' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  restDay ? 'translate-x-5' : ''
                }`}
              />
            </div>
          </div>
          <span className="text-white">Rest Day</span>
        </label>
        <p className="text-sm text-zinc-500 mt-1 ml-14">
          Mark this as a rest day (no exercises)
        </p>
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
