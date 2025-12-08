import { ChevronRight, Calendar, Star } from 'lucide-react'

interface PlanCardProps {
  plan: {
    id: string
    name: string
    description?: string | null
    isActive: boolean
    _count?: { planDays: number }
  }
  onPress?: () => void
}

export default function PlanCard({ plan, onPress }: PlanCardProps) {
  const dayCount = plan._count?.planDays ?? 0

  return (
    <button
      onClick={onPress}
      className="w-full text-left p-4 bg-zinc-800/50 rounded-xl hover:bg-zinc-800 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-white truncate">{plan.name}</h3>
            {plan.isActive && (
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
            )}
          </div>
          {plan.description && (
            <p className="text-sm text-zinc-400 truncate mb-2">
              {plan.description}
            </p>
          )}
          <div className="flex items-center gap-1 text-sm text-zinc-500">
            <Calendar className="w-4 h-4" />
            <span>
              {dayCount} day{dayCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-zinc-500 flex-shrink-0" />
      </div>
    </button>
  )
}
