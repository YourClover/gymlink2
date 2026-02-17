export type PlanRole = 'OWNER' | 'EDITOR' | 'VIEWER'

export type PlanAccess = {
  hasAccess: boolean
  isOwner: boolean
  role: PlanRole | null
}
