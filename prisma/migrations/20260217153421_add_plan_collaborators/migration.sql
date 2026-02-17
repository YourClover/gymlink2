-- CreateEnum
CREATE TYPE "CollaboratorInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "PlanCollaboratorRole" AS ENUM ('EDITOR', 'VIEWER');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PLAN_INVITE';

-- CreateTable
CREATE TABLE "plan_collaborators" (
    "id" TEXT NOT NULL,
    "workout_plan_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "PlanCollaboratorRole" NOT NULL DEFAULT 'EDITOR',
    "invite_status" "CollaboratorInviteStatus" NOT NULL DEFAULT 'PENDING',
    "invited_by" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_collaborators_workout_plan_id_idx" ON "plan_collaborators"("workout_plan_id");

-- CreateIndex
CREATE INDEX "plan_collaborators_user_id_idx" ON "plan_collaborators"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_collaborators_workout_plan_id_user_id_key" ON "plan_collaborators"("workout_plan_id", "user_id");

-- CreateIndex
CREATE INDEX "workout_sessions_user_id_completed_at_idx" ON "workout_sessions"("user_id", "completed_at");

-- AddForeignKey
ALTER TABLE "plan_collaborators" ADD CONSTRAINT "plan_collaborators_workout_plan_id_fkey" FOREIGN KEY ("workout_plan_id") REFERENCES "workout_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_collaborators" ADD CONSTRAINT "plan_collaborators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_collaborators" ADD CONSTRAINT "plan_collaborators_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
