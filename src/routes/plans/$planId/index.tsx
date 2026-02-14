import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  Calendar,
  MoreVertical,
  Pencil,
  Plus,
  Share2,
  Trash2,
} from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import PlanDayCard from '@/components/plans/PlanDayCard'
import PlanForm from '@/components/forms/PlanForm'
import PlanDayForm from '@/components/forms/PlanDayForm'
import SharePlanModal from '@/components/sharing/SharePlanModal'
import {
  createPlanDay,
  deletePlan,
  getPlan,
  reorderPlanDays,
  updatePlan,
} from '@/lib/plans.server'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/context/AuthContext'

export const Route = createFileRoute('/plans/$planId/')({
  component: PlanDetailPage,
})

type PlanDay = {
  id: string
  name: string
  dayOrder: number
  restDay: boolean
  _count: { planExercises: number }
}

type Plan = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  planDays: Array<PlanDay>
}

function PlanDetailPage() {
  const { planId } = Route.useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const router = useRouter()

  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddDayModal, setShowAddDayModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchPlan = useCallback(async () => {
    if (!user) return

    try {
      const result = await getPlan({ data: { id: planId, userId: user.id } })
      setPlan(result.plan)
    } catch (error) {
      console.error('Failed to fetch plan:', error)
    } finally {
      setLoading(false)
    }
  }, [planId, user])

  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])

  const handleEditPlan = async (data: {
    name: string
    description?: string
  }) => {
    if (!user) return

    setIsSubmitting(true)
    try {
      await updatePlan({
        data: {
          id: planId,
          name: data.name,
          description: data.description,
          userId: user.id,
        },
      })
      await fetchPlan()
      setShowEditModal(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePlan = async () => {
    if (!user) return

    setIsSubmitting(true)
    try {
      await deletePlan({ data: { id: planId, userId: user.id } })
      navigate({ to: '/plans' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddDay = async (data: { name: string; restDay: boolean }) => {
    if (!user || !plan) return

    setIsSubmitting(true)
    try {
      await createPlanDay({
        data: {
          workoutPlanId: planId,
          name: data.name,
          dayOrder: plan.planDays.length + 1,
          restDay: data.restDay,
          userId: user.id,
        },
      })
      await fetchPlan()
      setShowAddDayModal(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMoveDay = async (dayIndex: number, direction: 'up' | 'down') => {
    if (!user || !plan) return

    const newDays = [...plan.planDays]
    const targetIndex = direction === 'up' ? dayIndex - 1 : dayIndex + 1

    if (targetIndex < 0 || targetIndex >= newDays.length)
      return // Swap the days
    ;[newDays[dayIndex], newDays[targetIndex]] = [
      newDays[targetIndex],
      newDays[dayIndex],
    ]

    // Update local state optimistically
    setPlan({ ...plan, planDays: newDays })

    // Send reorder request
    try {
      await reorderPlanDays({
        data: {
          workoutPlanId: planId,
          dayIds: newDays.map((d) => d.id),
          userId: user.id,
        },
      })
    } catch (error) {
      // Revert on error
      await fetchPlan()
    }
  }

  const handleDayPress = (dayId: string) => {
    navigate({
      to: '/plans/$planId/day/$dayId',
      params: { planId, dayId },
    })
  }

  if (loading) {
    return (
      <AppLayout showNav={false}>
        <div className="p-4 space-y-4">
          <Skeleton className="h-7 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <div className="space-y-3 mt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-28 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!plan) {
    return (
      <AppLayout showNav={false}>
        <div className="p-4">
          <EmptyState
            icon={<Calendar className="w-8 h-8" />}
            title="Plan not found"
            description="This workout plan doesn't exist or you don't have access to it."
            action={{
              label: 'Go to Plans',
              onClick: () => navigate({ to: '/plans' }),
            }}
          />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout showNav={false}>
      {/* Custom Header */}
      <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 safe-area-pt">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.history.back()}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 text-center px-4">
            <h1 className="text-lg font-semibold text-white truncate">
              {plan.name}
            </h1>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 -mr-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
              aria-label="Menu"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Dropdown menu */}
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-800 rounded-xl shadow-lg border border-zinc-700 overflow-hidden z-20">
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      setShowShareModal(true)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-zinc-700 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Share Plan
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      setShowEditModal(true)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-zinc-700 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit Plan
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      setShowDeleteConfirm(true)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-zinc-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Plan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Plan description */}
      {plan.description && (
        <div className="px-4 py-3 border-b border-zinc-800">
          <p className="text-sm text-zinc-400">{plan.description}</p>
        </div>
      )}

      {/* Days list */}
      <div className="flex-1">
        {plan.planDays.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Calendar className="w-8 h-8" />}
              title="No days yet"
              description="Add days to your workout plan to get started."
              action={{
                label: 'Add Day',
                onClick: () => setShowAddDayModal(true),
              }}
            />
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-zinc-500">
                {plan.planDays.length} day
                {plan.planDays.length !== 1 ? 's' : ''}
              </p>
            </div>
            {plan.planDays.map((day, index) => (
              <div
                key={day.id}
                className="animate-fade-in"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'backwards',
                }}
              >
                <PlanDayCard
                  day={day}
                  onPress={() => handleDayPress(day.id)}
                  onMoveUp={() => handleMoveDay(index, 'up')}
                  onMoveDown={() => handleMoveDay(index, 'down')}
                  showReorder={plan.planDays.length > 1}
                  isFirst={index === 0}
                  isLast={index === plan.planDays.length - 1}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Day Button */}
      <div className="p-4 border-t border-zinc-800 safe-area-pb">
        <button
          onClick={() => setShowAddDayModal(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Day
        </button>
      </div>

      {/* Edit Plan Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Plan"
      >
        <PlanForm
          initialData={{ name: plan.name, description: plan.description ?? '' }}
          onSubmit={handleEditPlan}
          onCancel={() => setShowEditModal(false)}
          isLoading={isSubmitting}
          submitLabel="Save Changes"
        />
      </Modal>

      {/* Add Day Modal */}
      <Modal
        isOpen={showAddDayModal}
        onClose={() => setShowAddDayModal(false)}
        title="Add Day"
      >
        <PlanDayForm
          onSubmit={handleAddDay}
          onCancel={() => setShowAddDayModal(false)}
          isLoading={isSubmitting}
          submitLabel="Add Day"
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Plan"
        message={`Are you sure you want to delete "${plan.name}"? This will also delete all days and exercises in this plan. This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDeletePlan}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="danger"
      />

      {/* Share Plan Modal */}
      <SharePlanModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        planId={plan.id}
        planName={plan.name}
      />
    </AppLayout>
  )
}
