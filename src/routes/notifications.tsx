import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Award,
  Bell,
  Check,
  Target,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import type { NotificationType } from '@prisma/client'
import { useAuth } from '@/context/AuthContext'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notifications.server'
import AppLayout from '@/components/AppLayout'
import { SkeletonNotificationItem } from '@/components/ui/SocialSkeletons'
import EmptyState from '@/components/ui/EmptyState'

export const Route = createFileRoute('/notifications')({
  component: NotificationsPage,
})

interface NotificationData {
  id: string
  type: NotificationType
  title: string
  message: string
  referenceId: string | null
  isRead: boolean
  createdAt: Date
}

function NotificationsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Array<NotificationData>>(
    [],
  )
  const [isLoading, setIsLoading] = useState(true)

  const loadNotifications = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const result = await getNotifications({
        data: { userId: user.id, limit: 50 },
      })
      setNotifications(result.notifications as Array<NotificationData>)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [user])

  const handleMarkRead = async (notificationId: string) => {
    if (!user) return
    try {
      await markNotificationRead({
        data: { notificationId, userId: user.id },
      })
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
      )
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const handleMarkAllRead = async () => {
    if (!user) return
    try {
      await markAllNotificationsRead({ data: { userId: user.id } })
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const getIconWithBackground = (type: NotificationType) => {
    switch (type) {
      case 'FOLLOW_REQUEST':
        return (
          <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-5 h-5 text-blue-400" />
          </div>
        )
      case 'FOLLOW_ACCEPTED':
        return (
          <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-5 h-5 text-green-400" />
          </div>
        )
      case 'CHALLENGE_INVITE':
        return (
          <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5 text-purple-400" />
          </div>
        )
      case 'CHALLENGE_STARTED':
        return (
          <div className="w-9 h-9 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5 text-orange-400" />
          </div>
        )
      case 'CHALLENGE_ENDED':
        return (
          <div className="w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
        )
      case 'ACHIEVEMENT_EARNED':
        return (
          <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5 text-amber-400" />
          </div>
        )
      case 'PLAN_INVITE':
        return (
          <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
        )
      default:
        return (
          <div className="w-9 h-9 rounded-full bg-zinc-700/50 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-zinc-400" />
          </div>
        )
    }
  }

  const getNotificationLink = (
    notification: NotificationData,
  ): string | null => {
    switch (notification.type) {
      case 'FOLLOW_REQUEST':
        return '/followers'
      case 'FOLLOW_ACCEPTED':
        return notification.referenceId
          ? `/u/${notification.referenceId}`
          : null
      case 'CHALLENGE_INVITE':
      case 'CHALLENGE_STARTED':
      case 'CHALLENGE_ENDED':
        return notification.referenceId
          ? `/challenges/${notification.referenceId}`
          : null
      case 'ACHIEVEMENT_EARNED':
        return '/achievements'
      case 'PLAN_INVITE':
        return notification.referenceId
          ? `/plans/${notification.referenceId}`
          : null
      default:
        return null
    }
  }

  const formatDate = (date: Date) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const getDateGroup = (date: Date): string => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(hours / 24)

    if (days === 0) return 'Today'
    if (days <= 7) return 'This Week'
    return 'Earlier'
  }

  const groupedNotifications = useMemo(() => {
    const groups: Array<{ label: string; items: Array<NotificationData> }> = []
    const groupMap = new Map<string, Array<NotificationData>>()

    for (const n of notifications) {
      const group = getDateGroup(n.createdAt)
      if (!groupMap.has(group)) {
        groupMap.set(group, [])
      }
      groupMap.get(group)!.push(n)
    }

    // Maintain order: Today, This Week, Earlier
    for (const label of ['Today', 'This Week', 'Earlier']) {
      const items = groupMap.get(label)
      if (items && items.length > 0) {
        groups.push({ label, items })
      }
    }

    return groups
  }, [notifications])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  let globalIndex = 0

  return (
    <AppLayout showNav={false}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: '/dashboard' })}
              className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </button>
            <h1 className="text-lg font-semibold text-white">Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-blue-500 hover:text-blue-400"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonNotificationItem key={i} />
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-6">
            {groupedNotifications.map((group) => (
              <div key={group.label}>
                <h2 className="text-sm font-medium text-zinc-400 mb-2 px-1">
                  {group.label}
                </h2>
                <div className="space-y-2">
                  {group.items.map((notification) => {
                    const link = getNotificationLink(notification)
                    const idx = globalIndex++
                    const content = (
                      <div
                        className={`flex items-start gap-3 p-3 rounded-xl border border-zinc-700/50 transition-colors animate-fade-in ${
                          notification.isRead
                            ? 'bg-zinc-800/30'
                            : 'bg-zinc-800/50 border-l-2 border-l-blue-500'
                        } ${link ? 'hover:bg-zinc-700/50 cursor-pointer' : ''}`}
                        style={{
                          animationDelay: `${idx * 50}ms`,
                          animationFillMode: 'backwards',
                        }}
                        onClick={() => {
                          if (!notification.isRead) {
                            handleMarkRead(notification.id)
                          }
                        }}
                      >
                        {getIconWithBackground(notification.type)}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-medium ${
                              notification.isRead
                                ? 'text-zinc-400'
                                : 'text-white'
                            }`}
                          >
                            {notification.title}
                          </p>
                          <p className="text-sm text-zinc-500 truncate">
                            {notification.message}
                          </p>
                          <p className="text-xs text-zinc-600 mt-1">
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkRead(notification.id)
                            }}
                            className="p-1 hover:bg-zinc-600 rounded"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4 text-zinc-500" />
                          </button>
                        )}
                      </div>
                    )

                    if (link) {
                      return (
                        <Link key={notification.id} to={link as '/'}>
                          {content}
                        </Link>
                      )
                    }

                    return <div key={notification.id}>{content}</div>
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Bell className="w-8 h-8" />}
            title="No notifications yet"
            description="You'll see updates about follows, achievements, and challenges here."
          />
        )}
      </div>
    </AppLayout>
  )
}
