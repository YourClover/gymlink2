import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  Award,
  Check,
  ChevronRight,
  Dumbbell,
  Edit,
  History,
  LogOut,
  Mail,
  Settings,
  Share2,
  Shield,
  Trophy,
  User,
  Users,
} from 'lucide-react'
import type { AchievementRarity } from '@prisma/client'
import { useAuth } from '@/context/AuthContext'
import AppLayout from '@/components/AppLayout'
import { AchievementBadge } from '@/components/achievements'
import { getUserAchievements } from '@/lib/achievements.server'
import { getUserProfile } from '@/lib/profile.server'
import StatsSection from '@/components/stats/StatsSection'

export const Route = createFileRoute('/profile/')({
  component: ProfilePage,
})

interface RecentAchievement {
  id: string
  icon: string
  rarity: AchievementRarity
  name: string
}

interface ProfileData {
  username: string
  profileCode: string
  bio: string | null
  isPrivate: boolean
}

function ProfilePage() {
  const { user, logout, isLoading } = useAuth()
  const [recentAchievements, setRecentAchievements] = useState<
    Array<RecentAchievement>
  >([])
  const [achievementStats, setAchievementStats] = useState({
    earned: 0,
    total: 0,
  })
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (!user?.id) return

      try {
        // Load achievements
        const achievementResult = await getUserAchievements({
          data: { userId: user.id },
        })
        setAchievementStats({
          earned: achievementResult.earnedCount,
          total: achievementResult.totalCount,
        })
        const recent = achievementResult.earned.slice(0, 4).map((ua) => ({
          id: ua.achievement.id,
          icon: ua.achievement.icon,
          rarity: ua.achievement.rarity,
          name: ua.achievement.name,
        }))
        setRecentAchievements(recent)

        // Load profile
        const profileResult = await getUserProfile({
          data: { userId: user.id },
        })
        if (profileResult.profile) {
          setProfile({
            username: profileResult.profile.username,
            profileCode: profileResult.profile.profileCode,
            bio: profileResult.profile.bio,
            isPrivate: profileResult.profile.isPrivate,
          })
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      }
    }

    loadData()
  }, [user?.id])

  const copyProfileLink = async () => {
    if (!profile) return
    const url = `${window.location.origin}/u/${profile.username}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AppLayout title="Profile">
      <div className="px-4 py-6 space-y-6">
        {/* Profile Header */}
        <div
          className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 animate-fade-in"
          style={{ animationFillMode: 'backwards' }}
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-white truncate">
                {user?.name}
              </h2>
              {profile ? (
                <>
                  <p className="text-zinc-400 text-sm">@{profile.username}</p>
                  <span className="inline-block bg-zinc-700/50 px-2 py-0.5 rounded-md text-xs font-mono text-zinc-400 mt-1">
                    {profile.profileCode}
                  </span>
                </>
              ) : (
                <div className="flex items-center gap-1 text-zinc-400 text-sm">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{user?.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Profile Actions */}
          {profile ? (
            <div className="flex gap-2 mt-4">
              <Link
                to="/profile/edit"
                className="flex-1 flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white py-2 rounded-lg text-sm transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit Profile
              </Link>
              <button
                onClick={copyProfileLink}
                className="flex-1 flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white py-2 rounded-lg text-sm transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Share Profile
                  </>
                )}
              </button>
            </div>
          ) : (
            <Link
              to="/profile/setup"
              className="mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Set Up Public Profile
            </Link>
          )}
        </div>

        {/* Social Stats */}
        {profile && (
          <StatsSection
            icon={<Users />}
            title="Social"
            style={{
              animationDelay: '50ms',
              animationFillMode: 'backwards',
            }}
          >
            <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 divide-y divide-zinc-700/50 animate-fade-in">
              <Link
                to="/followers"
                className="w-full flex items-center justify-between p-4 hover:bg-zinc-700/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-zinc-400" />
                  <span className="text-white">Followers & Following</span>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-500" />
              </Link>
              <Link
                to="/users/search"
                className="w-full flex items-center justify-between p-4 hover:bg-zinc-700/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-zinc-400" />
                  <span className="text-white">Find People</span>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-500" />
              </Link>
            </div>
          </StatsSection>
        )}

        {/* Achievements Section */}
        <StatsSection
          icon={<Award />}
          title="Achievements"
          style={{
            animationDelay: '100ms',
            animationFillMode: 'backwards',
          }}
        >
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4 animate-fade-in">
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
                  <div
                    key={achievement.id}
                    className="flex flex-col items-center gap-1"
                  >
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
        </StatsSection>

        {/* Activity Section */}
        <StatsSection
          icon={<History />}
          title="Activity"
          style={{
            animationDelay: '150ms',
            animationFillMode: 'backwards',
          }}
        >
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 divide-y divide-zinc-700/50 animate-fade-in">
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
        </StatsSection>

        {/* Settings Section */}
        <StatsSection
          icon={<Settings />}
          title="Settings"
          style={{
            animationDelay: '200ms',
            animationFillMode: 'backwards',
          }}
        >
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 divide-y divide-zinc-700/50 animate-fade-in">
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

        {/* Account Section */}
        <StatsSection
          icon={<User />}
          title="Account"
          style={{
            animationDelay: '250ms',
            animationFillMode: 'backwards',
          }}
        >
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 animate-fade-in">
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
        </StatsSection>

        {/* App Info */}
        <div className="text-center text-sm text-zinc-500 pt-4">
          <p>GymLink v1.0.0</p>
        </div>
      </div>
    </AppLayout>
  )
}
