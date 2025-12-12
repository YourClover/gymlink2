import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Award,
  Bell,
  Check,
  Loader2,
  Target,
  Trophy,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import type { NotificationType } from '@prisma/client'
import { useAuth } from '@/context/AuthContext'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notifications.server'
import AppLayout from '@/components/AppLayout'

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
  const [notifications, setNotifications] = useState<Array<NotificationData>>([])
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

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'FOLLOW_REQUEST':
        return <UserPlus className="w-5 h-5 text-blue-400" />
      case 'FOLLOW_ACCEPTED':
        return <UserCheck className="w-5 h-5 text-green-400" />
      case 'CHALLENGE_INVITE':
        return <Target className="w-5 h-5 text-purple-400" />
      case 'CHALLENGE_STARTED':
        return <Target className="w-5 h-5 text-orange-400" />
      case 'CHALLENGE_ENDED':
        return <Trophy className="w-5 h-5 text-yellow-400" />
      case 'ACHIEVEMENT_EARNED':
        return <Award className="w-5 h-5 text-amber-400" />
      default:
        return <Bell className="w-5 h-5 text-zinc-400" />
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

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <AppLayout showNav={false}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: '/dashboard' })}
              className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg"
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
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((notification) => {
              const link = getNotificationLink(notification)
              const content = (
                <div
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    notification.isRead
                      ? 'bg-zinc-800/30'
                      : 'bg-zinc-800/50 border-l-2 border-blue-500'
                  } ${link ? 'hover:bg-zinc-700/50 cursor-pointer' : ''}`}
                  onClick={() => {
                    if (!notification.isRead) {
                      handleMarkRead(notification.id)
                    }
                  }}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium ${
                        notification.isRead ? 'text-zinc-400' : 'text-white'
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
        ) : (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500">No notifications yet</p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
