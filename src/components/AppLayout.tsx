import { Navigate } from '@tanstack/react-router'
import BottomNav from './BottomNav'
import { NotificationBell } from './notifications/NotificationBell'
import type { ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'

interface AppLayoutProps {
  children: ReactNode
  title?: string
  showNav?: boolean
  showNotifications?: boolean
}

export default function AppLayout({
  children,
  title,
  showNav = true,
  showNotifications = true,
}: AppLayoutProps) {
  const { user, isInitializing } = useAuth()

  // Show loading state while checking auth
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" />
  }

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col">
      {/* Header */}
      {title && (
        <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 safe-area-pt">
          <div className="px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">{title}</h1>
            {showNotifications && <NotificationBell />}
          </div>
        </header>
      )}

      {/* Main content */}
      <main className={`flex-1 ${showNav ? 'pb-20' : ''}`}>{children}</main>

      {/* Bottom Navigation */}
      {showNav && <BottomNav />}
    </div>
  )
}
