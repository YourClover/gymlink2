import { useCallback, useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
}

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value)

  // Sync local value with external value
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Debounced onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [localValue, debounceMs, onChange, value])

  const handleClear = useCallback(() => {
    setLocalValue('')
    onChange('')
  }, [onChange])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-3 bg-zinc-800 text-white placeholder-zinc-500 rounded-xl border border-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white rounded-full hover:bg-zinc-700 transition-colors"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
