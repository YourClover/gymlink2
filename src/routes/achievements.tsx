import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { AchievementCategory, AchievementRarity } from '@prisma/client'
import { useAuth } from '@/context/AuthContext'
import { AchievementGrid } from '@/components/achievements'
import { getUserAchievements } from '@/lib/achievements.server'

export const Route = createFileRoute('/achievements')({
  component: AchievementsPage,
})

interface Achievement {
  id: string
  code: string
  name: string
  description: string
  category: AchievementCategory
  rarity: AchievementRarity
  icon: string
  threshold: number
  sortOrder: number
  isHidden: boolean
}

interface UserAchievement {
  id: string
  achievementId: string
  earnedAt: Date
  achievement: Achievement
}

function AchievementsPage() {
  const { user } = useAuth()
  const [achievements, setAchievements] = useState<Array<Achievement>>([])
  const [earnedAchievements, setEarnedAchievements] = useState<
    Array<UserAchievement>
  >([])
  const [earnedSet, setEarnedSet] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAchievements() {
      if (!user?.id) return

      try {
        const result = await getUserAchievements({ data: { userId: user.id } })
        setAchievements(result.all)
        setEarnedAchievements(result.earned)
        setEarnedSet(new Set(result.earnedSet))
      } catch (error) {
        console.error('Failed to load achievements:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAchievements()
  }, [user?.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex flex-col">
        <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 safe-area-pt">
          <div className="flex items-center gap-3 px-4 py-4">
            <Link
              to="/profile"
              className="p-1 -ml-1 text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold text-white">Achievements</h1>
          </div>
        </header>
        <div className="px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-zinc-800 rounded-full w-full" />
            <div className="h-24 bg-zinc-800 rounded-xl" />
            <div className="h-24 bg-zinc-800 rounded-xl" />
            <div className="h-24 bg-zinc-800 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col">
      <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 safe-area-pt">
        <div className="flex items-center gap-3 px-4 py-4">
          <Link
            to="/profile"
            className="p-1 -ml-1 text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-white">Achievements</h1>
        </div>
      </header>
      <div className="px-4 py-6">
        {/* Summary */}
        <div className="mb-6 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Total Earned</p>
              <p className="text-2xl font-bold text-white">
                {earnedSet.size}
                <span className="text-zinc-500 text-lg font-normal">
                  /{achievements.length}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-zinc-400">Progress</p>
              <p className="text-2xl font-bold text-blue-400">
                {achievements.length > 0
                  ? Math.round((earnedSet.size / achievements.length) * 100)
                  : 0}
                %
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{
                width: `${achievements.length > 0 ? (earnedSet.size / achievements.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Achievement grid */}
        <AchievementGrid
          allAchievements={achievements}
          earnedAchievements={earnedAchievements}
          earnedSet={earnedSet}
        />
      </div>
    </div>
  )
}
