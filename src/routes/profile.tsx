import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  Award,
  ChevronRight,
  Dumbbell,
  History,
  LogOut,
  Mail,
  Settings,
  Trophy,
  User,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import AppLayout from '@/components/AppLayout'
import { AchievementBadge } from '@/components/achievements'
import { getUserAchievements } from '@/lib/achievements.server'
import type { AchievementRarity } from '@prisma/client'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

interface RecentAchievement {
  id: string
  icon: string
  rarity: AchievementRarity
  name: string
}

function ProfilePage() {
  const { user, logout, isLoading } = useAuth()
  const [recentAchievements, setRecentAchievements] = useState<RecentAchievement[]>([])
  const [achievementStats, setAchievementStats] = useState({ earned: 0, total: 0 })

  useEffect(() => {
    async function loadAchievements() {
      if (!user?.id) return

      try {
        const result = await getUserAchievements({ data: { userId: user.id } })
        setAchievementStats({
          earned: result.earnedCount,
          total: result.totalCount,
        })
        // Get the 4 most recent earned achievements
        const recent = result.earned.slice(0, 4).map((ua) => ({
          id: ua.achievement.id,
          icon: ua.achievement.icon,
          rarity: ua.achievement.rarity,
          name: ua.achievement.name,
        }))
        setRecentAchievements(recent)
      } catch (error) {
        console.error('Failed to load achievements:', error)
      }
    }

    loadAchievements()
  }, [user?.id])

  return (
    <AppLayout title="Profile">
      <div className="px-4 py-6 space-y-6">
        {/* Profile Header */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-white truncate">
              {user?.name}
            </h2>
            <div className="flex items-center gap-1 text-zinc-400 text-sm">
              <Mail className="w-4 h-4" />
              <span className="truncate">{user?.email}</span>
            </div>
          </div>
        </div>

        {/* Achievements Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-400 px-1">Achievements</h3>
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4">
            <Link
              to="/achievements"
              className="flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-amber-400" />
                <span className="text-white font-medium">
                  {achievementStats.earned} badges earned
                </span>
                <span className="text-zinc-500 text-sm">
                  / {achievementStats.total}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-500" />
            </Link>

            {recentAchievements.length > 0 ? (
              <div className="flex gap-3">
                {recentAchievements.map((achievement) => (
                  <div key={achievement.id} className="flex flex-col items-center gap-1">
                    <AchievementBadge
                      icon={achievement.icon}
                      rarity={achievement.rarity}
                      earned={true}
                      size="md"
                    />
                    <span className="text-xs text-zinc-500 text-center truncate w-14">
                      {achievement.name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Complete workouts to earn badges!
              </p>
            )}
          </div>
        </div>

        {/* Activity Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-400 px-1">Activity</h3>
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 divide-y divide-zinc-700/50">
            <Link
              to="/history"
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-700/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-zinc-400" />
                <span className="text-white">Workout History</span>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-500" />
            </Link>
            <Link
              to="/prs"
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-700/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5 text-zinc-400" />
                <span className="text-white">My PRs</span>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-500" />
            </Link>
          </div>
        </div>

        {/* Settings Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-400 px-1">Settings</h3>
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
            <div className="w-full flex items-center justify-between p-4 opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-zinc-400" />
                <span className="text-white">Preferences</span>
              </div>
              <span className="text-xs text-zinc-500">Coming soon</span>
            </div>
          </div>
        </div>

        {/* Account Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-400 px-1">Account</h3>
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <button
              onClick={logout}
              disabled={isLoading}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-700/30 transition-colors text-red-400 disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-5 h-5" />
                <span>{isLoading ? 'Signing out...' : 'Sign Out'}</span>
              </div>
            </button>
          </div>
        </div>

        {/* App Info */}
        <div className="text-center text-sm text-zinc-500 pt-4">
          <p>GymLink v1.0.0</p>
        </div>
      </div>
    </AppLayout>
  )
}
