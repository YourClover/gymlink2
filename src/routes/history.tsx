import { createFileRoute } from '@tanstack/react-router'
import { Calendar } from 'lucide-react'
import AppLayout from '@/components/AppLayout'

export const Route = createFileRoute('/history')({
  component: HistoryPage,
})

function HistoryPage() {
  return (
    <AppLayout title="Workout History">
      <div className="px-4 py-6">
        {/* Empty State */}
        <div className="p-8 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-center">
          <Calendar className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            No workout history
          </h2>
          <p className="text-zinc-400 max-w-sm mx-auto">
            Complete your first workout to see your training history and
            progress over time
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
