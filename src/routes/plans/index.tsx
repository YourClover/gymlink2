import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ClipboardList, Download, Plus } from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import EmptyState from '@/components/ui/EmptyState'
import PlanCard from '@/components/plans/PlanCard'
import ImportPlanModal from '@/components/sharing/ImportPlanModal'
import { getPlans } from '@/lib/plans.server'
import { SkeletonPlanCard } from '@/components/ui/SocialSkeletons'
import { useAuth } from '@/context/AuthContext'

export const Route = createFileRoute('/plans/')({
  component: PlansPage,
})

type PlanWithCount = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  userId: string
  _count: { planDays: number; collaborators: number }
}

type SharedPlan = PlanWithCount & {
  ownerName: string
  role: string
}

function PlansPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [plans, setPlans] = useState<Array<PlanWithCount>>([])
  const [sharedPlans, setSharedPlans] = useState<Array<SharedPlan>>([])
  const [loading, setLoading] = useState(true)
  const [showImportModal, setShowImportModal] = useState(false)

  useEffect(() => {
    const fetchPlans = async () => {
      if (!user) return

      try {
        const result = await getPlans({ data: { userId: user.id } })
        setPlans(result.plans)
        setSharedPlans(result.sharedPlans as Array<SharedPlan>)
      } catch (error) {
        console.error('Failed to fetch plans:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [user])

  const handlePlanPress = (planId: string) => {
    navigate({ to: '/plans/$planId', params: { planId } })
  }

  const handleImportSuccess = (planId: string) => {
    navigate({ to: '/plans/$planId', params: { planId } })
  }

  const hasAnyPlans = plans.length > 0 || sharedPlans.length > 0

  return (
    <AppLayout title="Workout Plans">
      <div className="flex flex-col h-full">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="animate-fade-in"
                style={{
                  animationDelay: `${i * 50}ms`,
                  animationFillMode: 'backwards',
                }}
              >
                <SkeletonPlanCard />
              </div>
            ))}
          </div>
        ) : !hasAnyPlans ? (
          <div className="flex-1 flex items-center justify-center px-4">
            <EmptyState
              icon={<ClipboardList className="w-8 h-8" />}
              title="No workout plans yet"
              description="Create your first workout plan to organize your training and track progress."
              action={{
                label: 'Create Plan',
                onClick: () => navigate({ to: '/plans/new' }),
              }}
              secondaryAction={{
                label: 'Import Plan',
                onClick: () => setShowImportModal(true),
              }}
            />
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {/* My Plans */}
            {plans.length > 0 && (
              <div className="space-y-3">
                {sharedPlans.length > 0 && (
                  <h2 className="text-sm font-medium text-zinc-400 px-1">
                    My Plans
                  </h2>
                )}
                {plans.map((plan, index) => (
                  <div
                    key={plan.id}
                    className="animate-fade-in"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animationFillMode: 'backwards',
                    }}
                  >
                    <PlanCard
                      plan={plan}
                      onPress={() => handlePlanPress(plan.id)}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Shared Plans */}
            {sharedPlans.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-zinc-400 px-1">
                  Shared with Me
                </h2>
                {sharedPlans.map((plan, index) => (
                  <div
                    key={plan.id}
                    className="animate-fade-in"
                    style={{
                      animationDelay: `${(plans.length + index) * 50}ms`,
                      animationFillMode: 'backwards',
                    }}
                  >
                    <PlanCard
                      plan={plan}
                      ownerName={plan.ownerName}
                      role={plan.role}
                      onPress={() => handlePlanPress(plan.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FABs for creating/importing plans */}
        {hasAnyPlans && (
          <div className="fixed bottom-24 right-4 flex flex-col gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="w-14 h-14 bg-zinc-700 rounded-full flex items-center justify-center shadow-lg hover:bg-zinc-600 active:bg-zinc-500 transition-colors"
              aria-label="Import plan"
            >
              <Download className="w-6 h-6 text-white" />
            </button>
            <Link
              to="/plans/new"
              className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
              aria-label="Create new plan"
            >
              <Plus className="w-6 h-6 text-white" />
            </Link>
          </div>
        )}

        {/* Import Plan Modal */}
        <ImportPlanModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportSuccess={handleImportSuccess}
        />
      </div>
    </AppLayout>
  )
}
