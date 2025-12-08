import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import AppLayout from '@/components/AppLayout'
import PlanForm from '@/components/forms/PlanForm'
import { createPlan } from '@/lib/plans.server'
import { useAuth } from '@/context/AuthContext'

export const Route = createFileRoute('/plans/new')({
  component: NewPlanPage,
})

function NewPlanPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: { name: string; description?: string }) => {
    if (!user) return

    setIsLoading(true)
    try {
      const result = await createPlan({
        data: {
          name: data.name,
          description: data.description,
          userId: user.id,
        },
      })

      // Navigate to the new plan's detail page
      navigate({ to: '/plans/$planId', params: { planId: result.plan.id } })
    } catch (error) {
      console.error('Failed to create plan:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    navigate({ to: '/plans' })
  }

  return (
    <AppLayout title="Create Plan" showNav={false}>
      <div className="p-4">
        <PlanForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
          submitLabel="Create Plan"
        />
      </div>
    </AppLayout>
  )
}
