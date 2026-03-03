-- CreateEnum
CREATE TYPE "XpSource" AS ENUM ('WORKOUT_COMPLETE', 'SET_LOGGED', 'PR_ACHIEVED', 'RPE_LOGGED', 'STREAK_BONUS', 'CHALLENGE_COMPLETE', 'ACHIEVEMENT_EARNED', 'FIRST_WORKOUT_OF_WEEK', 'NEW_EXERCISE');

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'LEVEL_UP';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "total_xp" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "xp_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" "XpSource" NOT NULL,
    "source_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "xp_events_user_id_idx" ON "xp_events"("user_id");

-- CreateIndex
CREATE INDEX "xp_events_user_id_created_at_idx" ON "xp_events"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
