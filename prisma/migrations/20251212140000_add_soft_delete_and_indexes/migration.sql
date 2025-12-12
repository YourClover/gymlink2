-- Add soft delete column to users table
ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- Add index on deleted_at for efficient filtering of active users
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- Add unique constraint on personal_records to prevent duplicates
-- First, remove any duplicates (keeping the most recent one)
DELETE FROM "personal_records" pr1
WHERE EXISTS (
  SELECT 1 FROM "personal_records" pr2
  WHERE pr2."user_id" = pr1."user_id"
    AND pr2."exercise_id" = pr1."exercise_id"
    AND pr2."record_type" = pr1."record_type"
    AND pr2."achieved_at" > pr1."achieved_at"
);

-- Now add the unique constraint
CREATE UNIQUE INDEX "personal_records_user_id_exercise_id_record_type_key"
ON "personal_records"("user_id", "exercise_id", "record_type");

-- Add composite index on user_achievements for efficient history queries
CREATE INDEX "user_achievements_user_id_earned_at_idx"
ON "user_achievements"("user_id", "earned_at");
