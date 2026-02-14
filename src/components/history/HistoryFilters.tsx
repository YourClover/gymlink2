import { useEffect, useRef, useState } from 'react'
import { Filter, Search, X } from 'lucide-react'
import type { MuscleGroup } from '@prisma/client'
import { muscleGroupConfig } from '@/components/exercises/MuscleGroupBadge'

type PlanOption = {
  id: string
  name: string
}

type Props = {
  selectedMuscles: Array<MuscleGroup>
  selectedPlanId: string
  searchQuery: string
  plans: Array<PlanOption>
  onMuscleToggle: (muscle: MuscleGroup) => void
  onPlanChange: (planId: string) => void
  onSearchChange: (query: string) => void
  onClearAll: () => void
}

const ALL_MUSCLES: Array<MuscleGroup> = [
  'CHEST',
  'BACK',
  'LEGS',
  'SHOULDERS',
  'ARMS',
  'CORE',
  'CARDIO',
  'FULL_BODY',
]

export default function HistoryFilters({
  selectedMuscles,
  selectedPlanId,
  searchQuery,
  plans,
  onMuscleToggle,
  onPlanChange,
  onSearchChange,
  onClearAll,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [localSearch, setLocalSearch] = useState(searchQuery)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeFilterCount =
    selectedMuscles.length + (selectedPlanId ? 1 : 0) + (searchQuery ? 1 : 0)

  // Sync local search with URL param
  useEffect(() => {
    setLocalSearch(searchQuery)
  }, [searchQuery])

  const handleSearchInput = (value: string) => {
    setLocalSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onSearchChange(value)
    }, 300)
  }

  return (
    <div className="space-y-2">
      {/* Filter toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
          expanded || activeFilterCount > 0
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            : 'bg-zinc-800/50 text-zinc-400 hover:text-white border border-zinc-700/50'
        }`}
      >
        <Filter className="w-4 h-4" />
        Filters
        {activeFilterCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-xs font-medium">
            {activeFilterCount}
          </span>
        )}
      </button>

      {expanded && (
        <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4 space-y-4">
          {/* Search input */}
          <div>
            <label className="text-xs text-zinc-500 font-medium mb-1.5 block">
              Search exercises
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => handleSearchInput(e.target.value)}
                placeholder="Exercise name..."
                className="w-full pl-9 pr-8 py-2 rounded-lg bg-zinc-900/50 border border-zinc-700/50 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50"
              />
              {localSearch && (
                <button
                  onClick={() => {
                    setLocalSearch('')
                    onSearchChange('')
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Muscle group pills */}
          <div>
            <label className="text-xs text-zinc-500 font-medium mb-1.5 block">
              Muscle groups
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_MUSCLES.map((muscle) => {
                const config = muscleGroupConfig[muscle]
                const isSelected = selectedMuscles.includes(muscle)
                return (
                  <button
                    key={muscle}
                    onClick={() => onMuscleToggle(muscle)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      isSelected
                        ? `${config.bgColor} ${config.color} ring-1 ring-current`
                        : 'bg-zinc-700/50 text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    {config.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Plan dropdown */}
          {plans.length > 0 && (
            <div>
              <label className="text-xs text-zinc-500 font-medium mb-1.5 block">
                Workout plan
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => onPlanChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-700/50 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none"
              >
                <option value="">All plans</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Clear all */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                onClearAll()
                setLocalSearch('')
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
