export type PRSortMode = 'muscle' | 'newest' | 'improvement'

type Props = {
  value: PRSortMode
  onChange: (mode: PRSortMode) => void
}

const options: Array<{ value: PRSortMode; label: string }> = [
  { value: 'muscle', label: 'Muscle Group' },
  { value: 'newest', label: 'Newest' },
  { value: 'improvement', label: 'Improvement' },
]

export default function PRSortSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-zinc-800/50">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            value === opt.value
              ? 'bg-blue-500 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
