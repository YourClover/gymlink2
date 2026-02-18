import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ChevronRight,
  Dumbbell,
  LogOut,
  Settings,
  Shield,
  User,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { getUserProfile, updateUserProfile } from '@/lib/profile.server'
import AppLayout from '@/components/AppLayout'
import { Skeleton } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import StatsSection from '@/components/stats/StatsSection'

export const Route = createFileRoute('/profile/settings')({
  component: SettingsPage,
})

interface ProfileData {
  isPrivate: boolean
  showAchievements: boolean
  showStats: boolean
}

function SettingsPage() {
  const { user, logout, isLoading: isAuthLoading } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getUserProfile({ data: { userId: user.id } }).then((result) => {
      if (result.profile) {
        setProfile({
          isPrivate: result.profile.isPrivate,
          showAchievements: result.profile.showAchievements,
          showStats: result.profile.showStats,
        })
      }
      setLoading(false)
    })
  }, [user])

  const toggleSetting = async (
    field: 'isPrivate' | 'showAchievements' | 'showStats',
    newValue: boolean,
  ) => {
    if (!user || !profile) return

    const previous = profile[field]
    setProfile({ ...profile, [field]: newValue })

    try {
      await updateUserProfile({
        data: { userId: user.id, [field]: newValue },
      })
    } catch {
      setProfile((p) => (p ? { ...p, [field]: previous } : p))
      showToast('Failed to update setting', 'error')
    }
  }

  if (loading) {
    return (
      <AppLayout title="Settings" showNav={false}>
        <div className="p-4 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="w-9 h-9 rounded-lg" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </AppLayout>
    )
  }

  if (!profile) {
    return (
      <AppLayout title="Settings" showNav={false}>
        <EmptyState
          icon={<Settings className="w-8 h-8" />}
          title="Set up your profile first"
          description="Create your profile to access settings."
          action={{
            label: 'Set Up Profile',
            onClick: () => navigate({ to: '/profile/setup' }),
          }}
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout showNav={false}>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: '/profile' })}
            className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <h1 className="text-lg font-semibold text-white">Settings</h1>
        </div>

        {/* Privacy */}
        <StatsSection icon={<Shield />} title="Privacy">
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 divide-y divide-zinc-700/50">
            <label className="flex items-center justify-between p-4 cursor-pointer">
              <div>
                <p className="text-white font-medium">Private Profile</p>
                <p className="text-sm text-zinc-500">
                  Only followers can see your activity
                </p>
              </div>
              <input
                type="checkbox"
                checked={profile.isPrivate}
                onChange={(e) => toggleSetting('isPrivate', e.target.checked)}
                className="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
              />
            </label>
            <label className="flex items-center justify-between p-4 cursor-pointer">
              <div>
                <p className="text-white font-medium">Show Achievements</p>
                <p className="text-sm text-zinc-500">
                  Display earned badges on your profile
                </p>
              </div>
              <input
                type="checkbox"
                checked={profile.showAchievements}
                onChange={(e) =>
                  toggleSetting('showAchievements', e.target.checked)
                }
                className="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
              />
            </label>
            <label className="flex items-center justify-between p-4 cursor-pointer">
              <div>
                <p className="text-white font-medium">Show Stats</p>
                <p className="text-sm text-zinc-500">
                  Display workout statistics on your profile
                </p>
              </div>
              <input
                type="checkbox"
                checked={profile.showStats}
                onChange={(e) => toggleSetting('showStats', e.target.checked)}
                className="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
              />
            </label>
          </div>
        </StatsSection>

        {/* General */}
        <StatsSection icon={<Settings />} title="General">
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 divide-y divide-zinc-700/50">
            <Link
              to="/exercises"
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-700/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Dumbbell className="w-5 h-5 text-zinc-400" />
                <span className="text-white">Exercise Library</span>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-500" />
            </Link>
            {user?.isAdmin && (
              <Link
                to="/profile/achievements-admin"
                className="w-full flex items-center justify-between p-4 hover:bg-zinc-700/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-amber-400" />
                  <span className="text-white">Manage Achievements</span>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-500" />
              </Link>
            )}
          </div>
        </StatsSection>

        {/* Account */}
        <StatsSection icon={<User />} title="Account">
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <button
              onClick={logout}
              disabled={isAuthLoading}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-700/30 transition-colors text-red-400 disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-5 h-5" />
                <span>{isAuthLoading ? 'Signing out...' : 'Sign Out'}</span>
              </div>
            </button>
          </div>
        </StatsSection>
      </div>
    </AppLayout>
  )
}
