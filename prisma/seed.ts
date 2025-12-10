import 'dotenv/config'
import {
  AchievementCategory,
  AchievementRarity,
  PrismaClient,
} from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

const achievements = [
  // === MILESTONE ACHIEVEMENTS ===
  {
    code: 'FIRST_WORKOUT',
    name: 'First Steps',
    description: 'Complete your first workout',
    category: AchievementCategory.MILESTONE,
    rarity: AchievementRarity.COMMON,
    icon: 'dumbbell',
    threshold: 1,
    sortOrder: 1,
  },
  {
    code: 'WORKOUTS_5',
    name: 'Getting Warmed Up',
    description: 'Complete 5 workouts',
    category: AchievementCategory.MILESTONE,
    rarity: AchievementRarity.COMMON,
    icon: 'flame',
    threshold: 5,
    sortOrder: 2,
  },
  {
    code: 'WORKOUTS_10',
    name: 'Double Digits',
    description: 'Complete 10 workouts',
    category: AchievementCategory.MILESTONE,
    rarity: AchievementRarity.UNCOMMON,
    icon: 'target',
    threshold: 10,
    sortOrder: 3,
  },
  {
    code: 'WORKOUTS_50',
    name: 'Dedicated',
    description: 'Complete 50 workouts',
    category: AchievementCategory.MILESTONE,
    rarity: AchievementRarity.RARE,
    icon: 'medal',
    threshold: 50,
    sortOrder: 4,
  },
  {
    code: 'WORKOUTS_100',
    name: 'Centurion',
    description: 'Complete 100 workouts',
    category: AchievementCategory.MILESTONE,
    rarity: AchievementRarity.EPIC,
    icon: 'crown',
    threshold: 100,
    sortOrder: 5,
  },
  {
    code: 'WORKOUTS_365',
    name: 'Year of Iron',
    description: 'Complete 365 workouts',
    category: AchievementCategory.MILESTONE,
    rarity: AchievementRarity.LEGENDARY,
    icon: 'star',
    threshold: 365,
    sortOrder: 6,
  },

  // === STREAK ACHIEVEMENTS ===
  {
    code: 'STREAK_1',
    name: 'Week One',
    description: 'Work out at least once in a week',
    category: AchievementCategory.STREAK,
    rarity: AchievementRarity.COMMON,
    icon: 'calendar-check',
    threshold: 1,
    sortOrder: 10,
  },
  {
    code: 'STREAK_4',
    name: 'Month Strong',
    description: 'Maintain a 4-week workout streak',
    category: AchievementCategory.STREAK,
    rarity: AchievementRarity.UNCOMMON,
    icon: 'fire',
    threshold: 4,
    sortOrder: 11,
  },
  {
    code: 'STREAK_13',
    name: 'Quarter Crusher',
    description: 'Maintain a 13-week workout streak',
    category: AchievementCategory.STREAK,
    rarity: AchievementRarity.RARE,
    icon: 'zap',
    threshold: 13,
    sortOrder: 12,
  },
  {
    code: 'STREAK_26',
    name: 'Half Year Hero',
    description: 'Maintain a 26-week workout streak',
    category: AchievementCategory.STREAK,
    rarity: AchievementRarity.EPIC,
    icon: 'trophy',
    threshold: 26,
    sortOrder: 13,
  },
  {
    code: 'STREAK_52',
    name: 'Iron Will',
    description: 'Maintain a 52-week workout streak',
    category: AchievementCategory.STREAK,
    rarity: AchievementRarity.LEGENDARY,
    icon: 'award',
    threshold: 52,
    sortOrder: 14,
  },

  // === PR ACHIEVEMENTS ===
  {
    code: 'FIRST_PR',
    name: 'Record Breaker',
    description: 'Set your first personal record',
    category: AchievementCategory.PERSONAL_RECORD,
    rarity: AchievementRarity.COMMON,
    icon: 'trending-up',
    threshold: 1,
    sortOrder: 20,
  },
  {
    code: 'PRS_5',
    name: 'PR Hunter',
    description: 'Set 5 personal records',
    category: AchievementCategory.PERSONAL_RECORD,
    rarity: AchievementRarity.UNCOMMON,
    icon: 'trophy',
    threshold: 5,
    sortOrder: 21,
  },
  {
    code: 'PRS_10',
    name: 'PR Machine',
    description: 'Set 10 personal records',
    category: AchievementCategory.PERSONAL_RECORD,
    rarity: AchievementRarity.RARE,
    icon: 'rocket',
    threshold: 10,
    sortOrder: 22,
  },
  {
    code: 'PRS_25',
    name: 'Unstoppable',
    description: 'Set 25 personal records',
    category: AchievementCategory.PERSONAL_RECORD,
    rarity: AchievementRarity.EPIC,
    icon: 'star',
    threshold: 25,
    sortOrder: 23,
  },
  {
    code: 'PRS_50',
    name: 'Legend',
    description: 'Set 50 personal records',
    category: AchievementCategory.PERSONAL_RECORD,
    rarity: AchievementRarity.LEGENDARY,
    icon: 'crown',
    threshold: 50,
    sortOrder: 24,
  },

  // === VOLUME ACHIEVEMENTS ===
  {
    code: 'VOLUME_1000',
    name: 'Ton Lifter',
    description: 'Lift 1,000 kg total volume',
    category: AchievementCategory.VOLUME,
    rarity: AchievementRarity.COMMON,
    icon: 'weight',
    threshold: 1000,
    sortOrder: 30,
  },
  {
    code: 'VOLUME_10000',
    name: 'Heavy Hitter',
    description: 'Lift 10,000 kg total volume',
    category: AchievementCategory.VOLUME,
    rarity: AchievementRarity.UNCOMMON,
    icon: 'weight',
    threshold: 10000,
    sortOrder: 31,
  },
  {
    code: 'VOLUME_100000',
    name: 'Iron Giant',
    description: 'Lift 100,000 kg total volume',
    category: AchievementCategory.VOLUME,
    rarity: AchievementRarity.RARE,
    icon: 'weight',
    threshold: 100000,
    sortOrder: 32,
  },
  {
    code: 'VOLUME_500000',
    name: 'Titan',
    description: 'Lift 500,000 kg total volume',
    category: AchievementCategory.VOLUME,
    rarity: AchievementRarity.EPIC,
    icon: 'weight',
    threshold: 500000,
    sortOrder: 33,
  },
  {
    code: 'VOLUME_1000000',
    name: 'Mythical',
    description: 'Lift 1,000,000 kg total volume',
    category: AchievementCategory.VOLUME,
    rarity: AchievementRarity.LEGENDARY,
    icon: 'weight',
    threshold: 1000000,
    sortOrder: 34,
  },

  // === CONSISTENCY ACHIEVEMENTS ===
  {
    code: 'CONSISTENCY_3X4',
    name: 'Creature of Habit',
    description: 'Complete 3+ workouts per week for 4 consecutive weeks',
    category: AchievementCategory.CONSISTENCY,
    rarity: AchievementRarity.RARE,
    icon: 'repeat',
    threshold: 4,
    sortOrder: 40,
  },
  {
    code: 'CONSISTENCY_3X12',
    name: 'Disciplined',
    description: 'Complete 3+ workouts per week for 12 consecutive weeks',
    category: AchievementCategory.CONSISTENCY,
    rarity: AchievementRarity.EPIC,
    icon: 'shield',
    threshold: 12,
    sortOrder: 41,
  },

  // === MUSCLE GROUP ACHIEVEMENTS ===
  {
    code: 'MUSCLE_CHEST_50',
    name: 'Chest Day Champion',
    description: 'Complete 50 chest sets',
    category: AchievementCategory.MUSCLE_FOCUS,
    rarity: AchievementRarity.UNCOMMON,
    icon: 'heart',
    threshold: 50,
    sortOrder: 50,
  },
  {
    code: 'MUSCLE_BACK_50',
    name: 'Back Attack',
    description: 'Complete 50 back sets',
    category: AchievementCategory.MUSCLE_FOCUS,
    rarity: AchievementRarity.UNCOMMON,
    icon: 'arrow-up',
    threshold: 50,
    sortOrder: 51,
  },
  {
    code: 'MUSCLE_LEGS_50',
    name: 'Leg Day Legend',
    description: 'Complete 50 leg sets',
    category: AchievementCategory.MUSCLE_FOCUS,
    rarity: AchievementRarity.UNCOMMON,
    icon: 'footprints',
    threshold: 50,
    sortOrder: 52,
  },
  {
    code: 'MUSCLE_SHOULDERS_50',
    name: 'Boulder Shoulders',
    description: 'Complete 50 shoulder sets',
    category: AchievementCategory.MUSCLE_FOCUS,
    rarity: AchievementRarity.UNCOMMON,
    icon: 'chevrons-up',
    threshold: 50,
    sortOrder: 53,
  },
  {
    code: 'MUSCLE_ARMS_50',
    name: 'Gun Show',
    description: 'Complete 50 arm sets',
    category: AchievementCategory.MUSCLE_FOCUS,
    rarity: AchievementRarity.UNCOMMON,
    icon: 'zap',
    threshold: 50,
    sortOrder: 54,
  },
  {
    code: 'MUSCLE_CORE_50',
    name: 'Core Crusher',
    description: 'Complete 50 core sets',
    category: AchievementCategory.MUSCLE_FOCUS,
    rarity: AchievementRarity.UNCOMMON,
    icon: 'circle',
    threshold: 50,
    sortOrder: 55,
  },
]

async function main() {
  console.log('Seeding database...')

  // Clear existing achievements and seed new ones
  await prisma.achievement.deleteMany({})

  for (const achievement of achievements) {
    await prisma.achievement.create({
      data: achievement,
    })
  }

  console.log(`Seeded ${achievements.length} achievements`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
