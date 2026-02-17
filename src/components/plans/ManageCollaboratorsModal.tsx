import { useCallback, useEffect, useState } from 'react'
import {
  ChevronDown,
  Crown,
  Loader2,
  Search,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react'
import type { PlanCollaboratorRole } from '@prisma/client'
import Modal from '@/components/ui/Modal'
import {
  getInvitableUsers,
  getPlanCollaborators,
  inviteCollaborator,
  removeCollaborator,
  updateCollaboratorRole,
} from '@/lib/collaboration.server'
import { useAuth } from '@/context/AuthContext'

interface ManageCollaboratorsModalProps {
  isOpen: boolean
  onClose: () => void
  planId: string
}

type CollaboratorData = {
  id: string
  userId: string
  name: string
  role: PlanCollaboratorRole
  inviteStatus: string
}

type InvitableUser = {
  id: string
  name: string
  username: string | null
}

export default function ManageCollaboratorsModal({
  isOpen,
  onClose,
  planId,
}: ManageCollaboratorsModalProps) {
  const { user } = useAuth()
  const [owner, setOwner] = useState<{ id: string; name: string } | null>(null)
  const [collaborators, setCollaborators] = useState<Array<CollaboratorData>>(
    [],
  )
  const [showInvite, setShowInvite] = useState(false)
  const [invitableUsers, setInvitableUsers] = useState<Array<InvitableUser>>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadCollaborators = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const result = await getPlanCollaborators({
        data: { userId: user.id, planId },
      })
      setOwner(result.owner)
      setCollaborators(result.collaborators)
    } catch (error) {
      console.error('Failed to load collaborators:', error)
    } finally {
      setLoading(false)
    }
  }, [user, planId])

  useEffect(() => {
    if (isOpen) {
      loadCollaborators()
      setShowInvite(false)
      setSearchQuery('')
    }
  }, [isOpen, loadCollaborators])

  const searchUsers = useCallback(async () => {
    if (!user) return
    setSearchLoading(true)
    try {
      const result = await getInvitableUsers({
        data: {
          userId: user.id,
          planId,
          search: searchQuery || undefined,
        },
      })
      setInvitableUsers(result.users)
    } catch (error) {
      console.error('Failed to search users:', error)
    } finally {
      setSearchLoading(false)
    }
  }, [user, planId, searchQuery])

  useEffect(() => {
    if (showInvite) {
      searchUsers()
    }
  }, [showInvite, searchUsers])

  const handleInvite = async (
    inviteeId: string,
    role: PlanCollaboratorRole,
  ) => {
    if (!user) return
    setActionLoading(inviteeId)
    try {
      await inviteCollaborator({
        data: { userId: user.id, planId, inviteeId, role },
      })
      await loadCollaborators()
      setInvitableUsers((prev) => prev.filter((u) => u.id !== inviteeId))
    } catch (error) {
      console.error('Failed to invite:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemove = async (collaboratorUserId: string) => {
    if (!user) return
    setActionLoading(collaboratorUserId)
    try {
      await removeCollaborator({
        data: { userId: user.id, planId, collaboratorUserId },
      })
      await loadCollaborators()
    } catch (error) {
      console.error('Failed to remove:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRoleChange = async (
    collaboratorUserId: string,
    role: PlanCollaboratorRole,
  ) => {
    if (!user) return
    setActionLoading(collaboratorUserId)
    try {
      await updateCollaboratorRole({
        data: { userId: user.id, planId, collaboratorUserId, role },
      })
      setCollaborators((prev) =>
        prev.map((c) => (c.userId === collaboratorUserId ? { ...c, role } : c)),
      )
    } catch (error) {
      console.error('Failed to update role:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const accepted = collaborators.filter((c) => c.inviteStatus === 'ACCEPTED')
  const pending = collaborators.filter((c) => c.inviteStatus === 'PENDING')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Collaborators">
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
        </div>
      ) : showInvite ? (
        <div className="space-y-4">
          <button
            onClick={() => setShowInvite(false)}
            className="text-sm text-zinc-400 hover:text-white"
          >
            &larr; Back to collaborators
          </button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search followers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Results */}
          {searchLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
            </div>
          ) : invitableUsers.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">
              No mutual followers available to invite
            </p>
          ) : (
            <div className="space-y-2">
              {invitableUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{u.name}</p>
                    {u.username && (
                      <p className="text-xs text-zinc-500">@{u.username}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleInvite(u.id, 'EDITOR')}
                      disabled={actionLoading === u.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-400 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 disabled:opacity-50"
                    >
                      {actionLoading === u.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <UserPlus className="w-3 h-3" />
                      )}
                      Invite
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Owner */}
          {owner && (
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white">{owner.name}</p>
                <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-yellow-400 bg-yellow-500/10 rounded">
                  <Crown className="w-3 h-3" />
                  Owner
                </span>
              </div>
            </div>
          )}

          {/* Accepted collaborators */}
          {accepted.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl"
            >
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white">{c.name}</p>
                <RoleDropdown
                  role={c.role}
                  onChange={(role) => handleRoleChange(c.userId, role)}
                  disabled={actionLoading === c.userId}
                />
              </div>
              <button
                onClick={() => handleRemove(c.userId)}
                disabled={actionLoading === c.userId}
                className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-700 disabled:opacity-50"
                title="Remove"
              >
                {actionLoading === c.userId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserMinus className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}

          {/* Pending invites */}
          {pending.length > 0 && (
            <>
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider pt-2">
                Pending Invites
              </h3>
              {pending.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-xl border border-zinc-700/50 border-dashed"
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-400">
                      {c.name}
                    </p>
                    <span className="px-1.5 py-0.5 text-xs font-medium text-zinc-500 bg-zinc-700/50 rounded">
                      {c.role === 'EDITOR' ? 'Editor' : 'Viewer'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemove(c.userId)}
                    disabled={actionLoading === c.userId}
                    className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-700 disabled:opacity-50"
                    title="Cancel invite"
                  >
                    {actionLoading === c.userId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </>
          )}

          {/* Invite button */}
          <button
            onClick={() => setShowInvite(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-400 bg-blue-500/10 rounded-xl hover:bg-blue-500/20 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Invite Collaborator
          </button>
        </div>
      )}
    </Modal>
  )
}

function RoleDropdown({
  role,
  onChange,
  disabled,
}: {
  role: PlanCollaboratorRole
  onChange: (role: PlanCollaboratorRole) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)

  const label = role === 'EDITOR' ? 'Editor' : 'Viewer'
  const otherRole: PlanCollaboratorRole =
    role === 'EDITOR' ? 'VIEWER' : 'EDITOR'
  const otherLabel = otherRole === 'EDITOR' ? 'Editor' : 'Viewer'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-zinc-400 bg-zinc-700/50 rounded hover:bg-zinc-700 disabled:opacity-50"
      >
        {label}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 w-24 bg-zinc-800 rounded-lg shadow-lg border border-zinc-700 overflow-hidden z-20">
            <button
              onClick={() => {
                onChange(otherRole)
                setOpen(false)
              }}
              className="w-full px-3 py-2 text-xs text-left text-white hover:bg-zinc-700"
            >
              {otherLabel}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
