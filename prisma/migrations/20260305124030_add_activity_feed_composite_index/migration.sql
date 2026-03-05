-- CreateIndex
CREATE INDEX "activity_feed_items_activity_type_reference_id_idx" ON "activity_feed_items"("activity_type", "reference_id");
