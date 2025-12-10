import { ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import type { ProgressionMetric } from '@/lib/progression-utils'

type MetricOption = {
  value: ProgressionMetric
  label: string
}

type Props = {
  options: MetricOption[]
  value: ProgressionMetric
  onChange: (metric: ProgressionMetric) => void
}

export default function MetricSelector({ options, value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-sm font-medium text-white hover:bg-zinc-700/50 transition-colors"
      >
        <span>Metric: {selectedOption?.label}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 rounded-lg bg-zinc-800 border border-zinc-700 shadow-lg z-20 overflow-hidden">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                option.value === value
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-zinc-300 hover:bg-zinc-700/50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
