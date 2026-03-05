-- DropIndex
DROP INDEX "activity_feed_items_created_at_idx";

-- DropIndex
DROP INDEX "activity_feed_items_user_id_idx";

-- DropIndex
DROP INDEX "follows_follower_id_idx";

-- DropIndex
DROP INDEX "follows_following_id_idx";

-- DropIndex
DROP INDEX "follows_status_idx";

-- DropIndex
DROP INDEX "notifications_created_at_idx";

-- DropIndex
DROP INDEX "notifications_is_read_idx";

-- DropIndex
DROP INDEX "notifications_user_id_idx";

-- CreateIndex
CREATE INDEX "activity_feed_items_user_id_created_at_idx" ON "activity_feed_items"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "challenges_status_start_date_end_date_idx" ON "challenges"("status", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "follows_follower_id_status_idx" ON "follows"("follower_id", "status");

-- CreateIndex
CREATE INDEX "follows_following_id_status_idx" ON "follows"("following_id", "status");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "personal_records_user_id_achieved_at_idx" ON "personal_records"("user_id", "achieved_at");

-- CreateIndex
CREATE INDEX "workout_plans_user_id_is_active_idx" ON "workout_plans"("user_id", "is_active");
