-- CreateIndex
CREATE INDEX "exercises_user_id_is_custom_idx" ON "exercises"("user_id", "is_custom");

-- CreateIndex
CREATE INDEX "workout_sessions_user_id_completed_at_workout_plan_id_idx" ON "workout_sessions"("user_id", "completed_at", "workout_plan_id");
