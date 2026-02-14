import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Bell } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getUnreadNotificationCount } from '@/lib/notifications.server'

export function NotificationBell() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return

    const fetchCount = async () => {
      try {
        const result = await getUnreadNotificationCount({
          data: { userId: user.id },
        })
        setUnreadCount(result.count)
      } catch (error) {
        console.error('Failed to fetch notification count:', error)
      }
    }

    fetchCount()
    // Poll every 30 seconds
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [user])

  return (
    <Link
      to="/notifications"
      className="relative p-2 hover:bg-zinc-800 rounded-lg"
    >
      <Bell className="w-6 h-6 text-zinc-400" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-medium animate-fade-in animate-pulse">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
