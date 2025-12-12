-- Add is_admin column to users table
ALTER TABLE "users" ADD COLUMN "is_admin" BOOLEAN NOT NULL DEFAULT false;

-- Add EXERCISE_SPECIFIC to AchievementCategory enum
ALTER TYPE "AchievementCategory" ADD VALUE 'EXERCISE_SPECIFIC';

-- Add exercise_id column to achievements table
ALTER TABLE "achievements" ADD COLUMN "exercise_id" TEXT;

-- Create index on exercise_id
CREATE INDEX "achievements_exercise_id_idx" ON "achievements"("exercise_id");

-- Add foreign key constraint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE SET NULL ON UPDATE CASCADE;
