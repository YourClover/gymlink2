-- CreateIndex
CREATE INDEX "challenge_participants_user_id_completed_at_idx" ON "challenge_participants"("user_id", "completed_at");

-- CreateIndex
CREATE INDEX "workout_sets_workout_session_id_is_warmup_is_dropset_idx" ON "workout_sets"("workout_session_id", "is_warmup", "is_dropset");
