import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import ExerciseCard from './ExerciseCard'
import ExerciseFilters from './ExerciseFilters'
import type { Equipment, Exercise, MuscleGroup } from '@prisma/client'
import { getExercises } from '@/lib/exercises.server'
import { useAuth } from '@/context/AuthContext'

interface ExercisePickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (exercise: Exercise) => void
  excludeIds?: Array<string>
}

export default function ExercisePicker({
  isOpen,
  onClose,
  onSelect,
  excludeIds = [],
}: ExercisePickerProps) {
  const { user } = useAuth()
  const [exercises, setExercises] = useState<Array<Exercise>>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | undefined>()
  const [equipment, setEquipment] = useState<Equipment | undefined>()
  const [showFilters, setShowFilters] = useState(false)

  // Fetch exercises when filters change
  useEffect(() => {
    if (!isOpen) return

    const fetchExercises = async () => {
      setLoading(true)
      try {
        const result = await getExercises({
          data: {
            muscleGroup,
            equipment,
            search: search || undefined,
            userId: user?.id,
          },
        })
        setExercises(result.exercises.filter((e) => !excludeIds.includes(e.id)))
      } catch (error) {
        console.error('Failed to fetch exercises:', error)
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(fetchExercises, 300)
    return () => clearTimeout(debounce)
  }, [isOpen, muscleGroup, equipment, search, user?.id, excludeIds])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setSearch('')
      setMuscleGroup(undefined)
      setEquipment(undefined)
      setShowFilters(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSelect = (exercise: Exercise) => {
    onSelect(exercise)
    onClose()
  }

  const activeFilterCount = [muscleGroup, equipment].filter(Boolean).length

  return (
    <div className="fixed inset-0 z-50 bg-zinc-900 flex flex-col safe-area-pt safe-area-pb">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-zinc-800">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-lg font-semibold text-white">Select Exercise</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 text-white placeholder-zinc-500 rounded-xl border border-zinc-700 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Filter toggle */}
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilterCount > 0
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="px-4 pb-3">
            <ExerciseFilters
              muscleGroup={muscleGroup}
              equipment={equipment}
              onMuscleGroupChange={setMuscleGroup}
              onEquipmentChange={setEquipment}
            />
          </div>
        )}
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <p className="text-zinc-400">No exercises found</p>
            <p className="text-sm text-zinc-500 mt-1">
              Try adjusting your filters
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onPress={() => handleSelect(exercise)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
