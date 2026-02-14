import { CalendarDays, List } from 'lucide-react'

type Props = {
  value: 'list' | 'calendar'
  onChange: (view: 'list' | 'calendar') => void
}

const options: Array<{
  value: 'list' | 'calendar'
  icon: typeof List
}> = [
  { value: 'list', icon: List },
  { value: 'calendar', icon: CalendarDays },
]

export default function ViewToggle({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-zinc-800/50">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`p-1.5 rounded-md transition-colors ${
            value === opt.value
              ? 'bg-blue-500 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
          }`}
          aria-label={`${opt.value} view`}
        >
          <opt.icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  )
}
