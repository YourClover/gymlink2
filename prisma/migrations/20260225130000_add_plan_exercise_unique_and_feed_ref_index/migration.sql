-- CreateIndex
CREATE INDEX "activity_feed_items_reference_id_idx" ON "activity_feed_items"("reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_exercises_plan_day_id_exercise_order_key" ON "plan_exercises"("plan_day_id", "exercise_order");
