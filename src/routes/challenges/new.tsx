import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Loader2, Search, X } from 'lucide-react'
import type { ChallengeType, Exercise } from '@prisma/client'
import { useAuth } from '@/context/AuthContext'
import { createChallenge } from '@/lib/challenges.server'
import { getExercises } from '@/lib/exercises.server'
import AppLayout from '@/components/AppLayout'

export const Route = createFileRoute('/challenges/new')({
  component: NewChallengePage,
})

function NewChallengePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [challengeType, setChallengeType] =
    useState<ChallengeType>('TOTAL_WORKOUTS')
  const [targetValue, setTargetValue] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Exercise selector state
  const [exercises, setExercises] = useState<Array<Exercise>>([])
  const [exerciseId, setExerciseId] = useState<string>('')
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false)
  const exerciseInputRef = useRef<HTMLInputElement>(null)

  const challengeTypes: Array<{
    value: ChallengeType
    label: string
    unit: string
  }> = [
    { value: 'TOTAL_WORKOUTS', label: 'Total Workouts', unit: 'workouts' },
    { value: 'TOTAL_VOLUME', label: 'Total Volume', unit: 'kg' },
    { value: 'TOTAL_SETS', label: 'Total Sets', unit: 'sets' },
    { value: 'WORKOUT_STREAK', label: 'Workout Streak', unit: 'days' },
    {
      value: 'SPECIFIC_EXERCISE',
      label: 'Specific Exercise',
      unit: 'kg volume',
    },
  ]

  // Fetch exercises when SPECIFIC_EXERCISE is selected
  useEffect(() => {
    if (challengeType === 'SPECIFIC_EXERCISE' && exercises.length === 0) {
      getExercises({ data: { userId: user?.id } }).then((result) => {
        setExercises(result.exercises)
      })
    }
  }, [challengeType, user?.id, exercises.length])

  // Filter exercises based on search
  const filteredExercises = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()),
  )

  const selectedExercise = exercises.find((ex) => ex.id === exerciseId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await createChallenge({
        data: {
          creatorId: user.id,
          name,
          description: description || undefined,
          challengeType,
          targetValue: parseFloat(targetValue),
          exerciseId:
            challengeType === 'SPECIFIC_EXERCISE' ? exerciseId : undefined,
          startDate,
          endDate,
          isPublic,
          maxParticipants: maxParticipants
            ? parseInt(maxParticipants)
            : undefined,
        },
      })

      navigate({
        to: '/challenges/$challengeId',
        params: { challengeId: result.challenge.id },
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create challenge',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedType = challengeTypes.find((t) => t.value === challengeType)

  // Set default dates
  if (!startDate) {
    const today = new Date()
    today.setDate(today.getDate() + 1)
    setStartDate(today.toISOString().split('T')[0])
  }
  if (!endDate) {
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 8)
    setEndDate(nextWeek.toISOString().split('T')[0])
  }

  return (
    <AppLayout showNav={false}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate({ to: '/challenges' })}
            className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <h1 className="text-lg font-semibold text-white">Create Challenge</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div
            className="animate-fade-in"
            style={{ animationDelay: '50ms', animationFillMode: 'backwards' }}
          >
            <label className="block text-sm text-zinc-400 mb-1">
              Challenge Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={50}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="e.g., January Fitness Challenge"
            />
          </div>

          {/* Description */}
          <div
            className="animate-fade-in"
            style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
          >
            <label className="block text-sm text-zinc-400 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white resize-none focus:outline-none focus:border-blue-500"
              placeholder="Describe the challenge..."
            />
          </div>

          {/* Challenge Type */}
          <div
            className="animate-fade-in"
            style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
          >
            <label className="block text-sm text-zinc-400 mb-2">
              Challenge Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {challengeTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setChallengeType(type.value)}
                  className={`p-3 rounded-lg text-left transition-colors ${
                    challengeType === type.value
                      ? 'bg-blue-600/20 border-2 border-blue-500'
                      : 'bg-zinc-800 border border-zinc-700 hover:bg-zinc-700/30'
                  }`}
                >
                  <p className="font-medium text-white">{type.label}</p>
                  <p className="text-xs text-zinc-500">
                    Measured in {type.unit}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Exercise Selector (for SPECIFIC_EXERCISE type) */}
          {challengeType === 'SPECIFIC_EXERCISE' && (
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Select Exercise
              </label>
              <div className="relative">
                {selectedExercise ? (
                  <div className="flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
                    <span className="text-white">{selectedExercise.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setExerciseId('')
                        setExerciseSearch('')
                      }}
                      className="p-1 hover:bg-zinc-700 rounded"
                    >
                      <X className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        ref={exerciseInputRef}
                        type="text"
                        value={exerciseSearch}
                        onChange={(e) => {
                          setExerciseSearch(e.target.value)
                          setShowExerciseDropdown(true)
                        }}
                        onFocus={() => setShowExerciseDropdown(true)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        placeholder="Search exercises..."
                      />
                    </div>
                    {showExerciseDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg max-h-48 overflow-y-auto">
                        {filteredExercises.length > 0 ? (
                          filteredExercises.slice(0, 20).map((exercise) => (
                            <button
                              key={exercise.id}
                              type="button"
                              onClick={() => {
                                setExerciseId(exercise.id)
                                setExerciseSearch('')
                                setShowExerciseDropdown(false)
                              }}
                              className="w-full px-3 py-2 text-left text-white hover:bg-zinc-700 first:rounded-t-lg last:rounded-b-lg"
                            >
                              {exercise.name}
                            </button>
                          ))
                        ) : (
                          <p className="px-3 py-2 text-zinc-500 text-sm">
                            No exercises found
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Target Value */}
          <div
            className="animate-fade-in"
            style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
          >
            <label className="block text-sm text-zinc-400 mb-1">
              Target ({selectedType?.unit})
            </label>
            <input
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              required
              min="1"
              step="any"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder={`Enter target ${selectedType?.unit}`}
            />
          </div>

          {/* Dates */}
          <div
            className="grid grid-cols-2 gap-4 animate-fade-in"
            style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}
          >
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                min={startDate}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Max Participants */}
          <div
            className="animate-fade-in"
            style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
          >
            <label className="block text-sm text-zinc-400 mb-1">
              Max Participants (optional)
            </label>
            <input
              type="number"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              min="2"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="Leave empty for unlimited"
            />
          </div>

          {/* Public Toggle */}
          <label
            className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50 cursor-pointer animate-fade-in"
            style={{ animationDelay: '350ms', animationFillMode: 'backwards' }}
          >
            <div>
              <p className="text-white font-medium">Public Challenge</p>
              <p className="text-sm text-zinc-500">
                Anyone can find and join this challenge
              </p>
            </div>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-blue-600 focus:ring-blue-500"
            />
          </label>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={
              isSubmitting ||
              !name ||
              !targetValue ||
              (challengeType === 'SPECIFIC_EXERCISE' && !exerciseId)
            }
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium py-3 rounded-lg transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              'Create Challenge'
            )}
          </button>
        </form>
      </div>
    </AppLayout>
  )
}
