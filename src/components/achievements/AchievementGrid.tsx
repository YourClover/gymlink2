import { useState } from 'react'
import AchievementCard from './AchievementCard'
import type { AchievementCategory, AchievementRarity } from '@prisma/client'

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
}

interface UserAchievement {
  id: string
  achievementId: string
  earnedAt: Date
  achievement: Achievement
}

interface AchievementGridProps {
  allAchievements: Array<Achievement>
  earnedAchievements: Array<UserAchievement>
  earnedSet: Set<string>
}

const categoryLabels: Record<AchievementCategory, string> = {
  MILESTONE: 'Milestones',
  STREAK: 'Streaks',
  PERSONAL_RECORD: 'Personal Records',
  VOLUME: 'Volume',
  CONSISTENCY: 'Consistency',
  MUSCLE_FOCUS: 'Muscle Focus',
}

const categoryOrder: Array<AchievementCategory> = [
  'MILESTONE',
  'STREAK',
  'PERSONAL_RECORD',
  'VOLUME',
  'CONSISTENCY',
  'MUSCLE_FOCUS',
]

export default function AchievementGrid({
  allAchievements,
  earnedAchievements,
  earnedSet,
}: AchievementGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    AchievementCategory | 'ALL'
  >('ALL')

  // Create a map for quick lookup of earned dates
  const earnedDates = new Map<string, Date>()
  for (const ua of earnedAchievements) {
    earnedDates.set(ua.achievementId, ua.earnedAt)
  }

  // Group achievements by category
  const grouped = new Map<AchievementCategory, Array<Achievement>>()
  for (const category of categoryOrder) {
    grouped.set(category, [])
  }
  for (const achievement of allAchievements) {
    const arr = grouped.get(achievement.category)
    if (arr) arr.push(achievement)
  }

  // Count earned per category
  const earnedCountByCategory = new Map<AchievementCategory, number>()
  for (const category of categoryOrder) {
    const achievements = grouped.get(category) || []
    const count = achievements.filter((a) => earnedSet.has(a.id)).length
    earnedCountByCategory.set(category, count)
  }

  // Filter based on selected category
  const displayAchievements =
    selectedCategory === 'ALL'
      ? allAchievements
      : allAchievements.filter((a) => a.category === selectedCategory)

  // Sort: earned first, then by sortOrder
  const sortedAchievements = [...displayAchievements].sort((a, b) => {
    const aEarned = earnedSet.has(a.id) ? 0 : 1
    const bEarned = earnedSet.has(b.id) ? 0 : 1
    if (aEarned !== bEarned) return aEarned - bEarned
    return a.sortOrder - b.sortOrder
  })

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            selectedCategory === 'ALL'
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          All ({earnedSet.size}/{allAchievements.length})
        </button>
        {categoryOrder.map((category) => {
          const total = grouped.get(category)?.length || 0
          const earned = earnedCountByCategory.get(category) || 0
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {categoryLabels[category]} ({earned}/{total})
            </button>
          )
        })}
      </div>

      {/* Achievement cards */}
      <div className="space-y-3">
        {sortedAchievements.map((achievement) => (
          <AchievementCard
            key={achievement.id}
            name={achievement.name}
            description={achievement.description}
            icon={achievement.icon}
            rarity={achievement.rarity}
            category={achievement.category}
            earned={earnedSet.has(achievement.id)}
            earnedAt={earnedDates.get(achievement.id)}
          />
        ))}
      </div>
    </div>
  )
}
