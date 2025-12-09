-- CreateTable
CREATE TABLE "plan_share_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "workout_plan_id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_share_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_share_codes_code_key" ON "plan_share_codes"("code");

-- CreateIndex
CREATE INDEX "plan_share_codes_code_idx" ON "plan_share_codes"("code");

-- CreateIndex
CREATE INDEX "plan_share_codes_workout_plan_id_idx" ON "plan_share_codes"("workout_plan_id");

-- CreateIndex
CREATE INDEX "exercises_user_id_idx" ON "exercises"("user_id");

-- CreateIndex
CREATE INDEX "personal_records_user_id_idx" ON "personal_records"("user_id");

-- CreateIndex
CREATE INDEX "personal_records_exercise_id_idx" ON "personal_records"("exercise_id");

-- CreateIndex
CREATE INDEX "plan_days_workout_plan_id_idx" ON "plan_days"("workout_plan_id");

-- CreateIndex
CREATE INDEX "workout_plans_user_id_idx" ON "workout_plans"("user_id");

-- CreateIndex
CREATE INDEX "workout_sessions_user_id_idx" ON "workout_sessions"("user_id");

-- CreateIndex
CREATE INDEX "workout_sessions_workout_plan_id_idx" ON "workout_sessions"("workout_plan_id");

-- CreateIndex
CREATE INDEX "workout_sets_workout_session_id_idx" ON "workout_sets"("workout_session_id");

-- CreateIndex
CREATE INDEX "workout_sets_exercise_id_idx" ON "workout_sets"("exercise_id");

-- AddForeignKey
ALTER TABLE "plan_share_codes" ADD CONSTRAINT "plan_share_codes_workout_plan_id_fkey" FOREIGN KEY ("workout_plan_id") REFERENCES "workout_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_share_codes" ADD CONSTRAINT "plan_share_codes_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
