import { Navigate } from '@tanstack/react-router'
import BottomNav from './BottomNav'
import type { ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'

interface AppLayoutProps {
  children: ReactNode
  title?: string
  showNav?: boolean
}

export default function AppLayout({
  children,
  title,
  showNav = true,
}: AppLayoutProps) {
  const { user } = useAuth()

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" />
  }

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col">
      {/* Header */}
      {title && (
        <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 safe-area-pt">
          <div className="px-4 py-4">
            <h1 className="text-xl font-bold text-white">{title}</h1>
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
