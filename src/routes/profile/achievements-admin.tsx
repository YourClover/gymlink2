import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Award,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import type {
  AchievementCategory,
  AchievementRarity,
  Exercise,
} from '@prisma/client'
import { useAuth } from '@/context/AuthContext'
import {
  createAchievement,
  deleteAchievement,
  getAllAchievements,
  updateAchievement,
} from '@/lib/achievements.server'
import { getExercises } from '@/lib/exercises.server'
import AppLayout from '@/components/AppLayout'
import { Skeleton } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { AchievementBadge } from '@/components/achievements'

export const Route = createFileRoute('/profile/achievements-admin')({
  component: AchievementsAdminPage,
})

interface Achievement {
  id: string
  code: string
  name: string
  description: string
  category: AchievementCategory
  rarity: AchievementRarity
  icon: string
  threshold: number
  sortOrder: number
  isHidden: boolean
  exerciseId: string | null
  exercise: { id: string; name: string } | null
}

const CATEGORIES: Array<AchievementCategory> = [
  'MILESTONE',
  'STREAK',
  'PERSONAL_RECORD',
  'VOLUME',
  'CONSISTENCY',
  'MUSCLE_FOCUS',
  'EXERCISE_SPECIFIC',
]

const RARITIES: Array<AchievementRarity> = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
]

const RARITY_COLORS: Record<AchievementRarity, string> = {
  COMMON: 'bg-zinc-600',
  UNCOMMON: 'bg-green-600',
  RARE: 'bg-blue-600',
  EPIC: 'bg-purple-600',
  LEGENDARY: 'bg-amber-500',
}

function AchievementsAdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [achievements, setAchievements] = useState<Array<Achievement>>([])
  const [exercises, setExercises] = useState<Array<Exercise>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAchievement, setEditingAchievement] =
    useState<Achievement | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<AchievementCategory>('MILESTONE')
  const [rarity, setRarity] = useState<AchievementRarity>('COMMON')
  const [icon, setIcon] = useState('')
  const [threshold, setThreshold] = useState(1)
  const [sortOrder, setSortOrder] = useState(0)
  const [isHidden, setIsHidden] = useState(false)
  const [exerciseId, setExerciseId] = useState<string | null>(null)

  // Redirect non-admins
  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate({ to: '/profile' })
    }
  }, [user, navigate])

  const loadAchievements = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const [achievementsResult, exercisesResult] = await Promise.all([
        getAllAchievements({ data: { userId: user.id } }),
        getExercises({ data: {} }),
      ])
      setAchievements(achievementsResult.achievements)
      setExercises(exercisesResult.exercises)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user?.isAdmin) {
      loadAchievements()
    }
  }, [user])

  const resetForm = () => {
    setCode('')
    setName('')
    setDescription('')
    setCategory('MILESTONE')
    setRarity('COMMON')
    setIcon('')
    setThreshold(1)
    setSortOrder(0)
    setIsHidden(false)
    setExerciseId(null)
    setEditingAchievement(null)
    setError(null)
  }

  const openCreateModal = () => {
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (achievement: Achievement) => {
    setEditingAchievement(achievement)
    setCode(achievement.code)
    setName(achievement.name)
    setDescription(achievement.description)
    setCategory(achievement.category)
    setRarity(achievement.rarity)
    setIcon(achievement.icon)
    setThreshold(achievement.threshold)
    setSortOrder(achievement.sortOrder)
    setIsHidden(achievement.isHidden)
    setExerciseId(achievement.exerciseId)
    setError(null)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!user) return
    if (!code.trim() || !name.trim() || !description.trim() || !icon.trim()) {
      setError('All fields are required')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      if (editingAchievement) {
        await updateAchievement({
          data: {
            userId: user.id,
            id: editingAchievement.id,
            code,
            name,
            description,
            category,
            rarity,
            icon,
            threshold,
            sortOrder,
            isHidden,
            exerciseId: category === 'EXERCISE_SPECIFIC' ? exerciseId : null,
          },
        })
      } else {
        await createAchievement({
          data: {
            userId: user.id,
            code,
            name,
            description,
            category,
            rarity,
            icon,
            threshold,
            sortOrder,
            isHidden,
            exerciseId: category === 'EXERCISE_SPECIFIC' ? exerciseId : null,
          },
        })
      }
      setShowModal(false)
      resetForm()
      loadAchievements()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (achievement: Achievement) => {
    if (!user) return
    if (
      !confirm(
        `Delete "${achievement.name}"? This will also remove it from all users who earned it.`,
      )
    )
      return

    try {
      await deleteAchievement({ data: { userId: user.id, id: achievement.id } })
      loadAchievements()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  if (!user?.isAdmin) {
    return (
      <AppLayout showNav={false}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout showNav={false}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: '/profile' })}
              className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </button>
            <h1 className="text-lg font-semibold text-white">
              Manage Achievements
            </h1>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 animate-fade-in"
                style={{
                  animationDelay: `${i * 50}ms`,
                  animationFillMode: 'backwards',
                }}
              >
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="w-8 h-8 rounded-lg" />
                <Skeleton className="w-8 h-8 rounded-lg" />
              </div>
            ))}
          </div>
        ) : achievements.length === 0 ? (
          <EmptyState
            icon={<Award className="w-8 h-8" />}
            title="No achievements yet"
            description="Create achievements to reward users for their progress."
            action={{
              label: 'Create Achievement',
              onClick: openCreateModal,
            }}
          />
        ) : (
          <div className="space-y-3">
            {achievements.map((achievement, index) => (
              <div
                key={achievement.id}
                className={`flex items-center gap-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 animate-fade-in`}
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'backwards',
                }}
              >
                <AchievementBadge
                  icon={achievement.icon}
                  rarity={achievement.rarity}
                  earned={true}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-white">{achievement.name}</p>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${RARITY_COLORS[achievement.rarity]}`}
                    >
                      {achievement.rarity}
                    </span>
                    {achievement.isHidden && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">
                        Hidden
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 mt-0.5">
                    {achievement.category.replace(/_/g, ' ')} | Threshold:{' '}
                    {achievement.threshold}
                  </p>
                  {achievement.exercise && (
                    <p className="text-xs text-blue-400 mt-0.5">
                      Exercise: {achievement.exercise.name}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => openEditModal(achievement)}
                  className="p-2 hover:bg-zinc-700 rounded-lg"
                >
                  <Pencil className="w-4 h-4 text-zinc-400" />
                </button>
                <button
                  onClick={() => handleDelete(achievement)}
                  className="p-2 hover:bg-zinc-700 rounded-lg"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white">
                {editingAchievement ? 'Edit Achievement' : 'New Achievement'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-zinc-800 rounded"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FIRST_WORKOUT"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. First Steps"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Complete your first workout"
                  rows={2}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white resize-none focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Icon</label>
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="e.g. dumbbell, trophy, star"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as AchievementCategory)
                    }
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">
                    Rarity
                  </label>
                  <select
                    value={rarity}
                    onChange={(e) =>
                      setRarity(e.target.value as AchievementRarity)
                    }
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    {RARITIES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {category === 'EXERCISE_SPECIFIC' && (
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">
                    Exercise
                  </label>
                  <select
                    value={exerciseId || ''}
                    onChange={(e) => setExerciseId(e.target.value || null)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select an exercise...</option>
                    {exercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-500 mt-1">
                    Link this achievement to a specific exercise
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">
                    Threshold
                  </label>
                  <input
                    type="number"
                    value={threshold}
                    onChange={(e) =>
                      setThreshold(parseInt(e.target.value) || 1)
                    }
                    min={1}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) =>
                      setSortOrder(parseInt(e.target.value) || 0)
                    }
                    min={0}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHidden}
                  onChange={(e) => setIsHidden(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-700 border-zinc-600 text-blue-600"
                />
                <span className="text-sm text-zinc-400">
                  Hidden (won't show in achievements list until earned)
                </span>
              </label>
            </div>

            <div className="flex gap-3 p-4 border-t border-zinc-800">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 rounded-lg text-white flex items-center justify-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
