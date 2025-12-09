import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ClipboardList, Plus } from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import EmptyState from '@/components/ui/EmptyState'
import PlanCard from '@/components/plans/PlanCard'
import { getPlans } from '@/lib/plans.server'
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
  _count: { planDays: number }
}

function PlansPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [plans, setPlans] = useState<Array<PlanWithCount>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPlans = async () => {
      if (!user) return

      try {
        const result = await getPlans({ data: { userId: user.id } })
        setPlans(result.plans)
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

  return (
    <AppLayout title="Workout Plans">
      <div className="flex flex-col h-full">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <div className="flex-1 flex items-center justify-center px-4">
            <EmptyState
              icon={<ClipboardList className="w-8 h-8" />}
              title="No workout plans yet"
              description="Create your first workout plan to organize your training and track progress."
              action={{
                label: 'Create Plan',
                onClick: () => navigate({ to: '/plans/new' }),
              }}
            />
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onPress={() => handlePlanPress(plan.id)}
              />
            ))}
          </div>
        )}

        {/* FAB for creating new plan */}
        {plans.length > 0 && (
          <Link
            to="/plans/new"
            className="fixed bottom-24 right-4 w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
            aria-label="Create new plan"
          >
            <Plus className="w-6 h-6 text-white" />
          </Link>
        )}
      </div>
    </AppLayout>
  )
}
