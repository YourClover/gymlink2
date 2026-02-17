import { Calendar, ChevronRight, Star, Users } from 'lucide-react'

interface PlanCardProps {
  plan: {
    id: string
    name: string
    description?: string | null
    isActive: boolean
    _count?: { planDays: number; collaborators?: number }
  }
  ownerName?: string
  role?: string
  onPress?: () => void
}

export default function PlanCard({
  plan,
  ownerName,
  role,
  onPress,
}: PlanCardProps) {
  const dayCount = plan._count?.planDays ?? 0
  const collaboratorCount = plan._count?.collaborators ?? 0
  const isShared = !!ownerName

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
            {isShared && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-blue-400 bg-blue-500/10 rounded flex-shrink-0">
                <Users className="w-3 h-3" />
                Shared
              </span>
            )}
          </div>
          {isShared && (
            <p className="text-xs text-zinc-500 mb-1">
              by {ownerName}
              {role && (
                <span className="text-zinc-600">
                  {' '}
                  &middot; {role.charAt(0) + role.slice(1).toLowerCase()}
                </span>
              )}
            </p>
          )}
          {plan.description && (
            <p className="text-sm text-zinc-400 truncate mb-2">
              {plan.description}
            </p>
          )}
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {dayCount} day{dayCount !== 1 ? 's' : ''}
              </span>
            </div>
            {collaboratorCount > 0 && (
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span>{collaboratorCount}</span>
              </div>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-zinc-500 flex-shrink-0" />
      </div>
    </button>
  )
}
