-- CreateEnum
CREATE TYPE "FollowStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ChallengeType" AS ENUM ('TOTAL_WORKOUTS', 'TOTAL_VOLUME', 'WORKOUT_STREAK', 'SPECIFIC_EXERCISE', 'TOTAL_SETS');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('WORKOUT_COMPLETED', 'PR_ACHIEVED', 'ACHIEVEMENT_EARNED', 'CHALLENGE_JOINED', 'CHALLENGE_COMPLETED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FOLLOW_REQUEST', 'FOLLOW_ACCEPTED', 'CHALLENGE_INVITE', 'CHALLENGE_STARTED', 'CHALLENGE_ENDED', 'ACHIEVEMENT_EARNED');

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "bio" TEXT,
    "avatar_url" TEXT,
    "is_private" BOOLEAN NOT NULL DEFAULT true,
    "show_achievements" BOOLEAN NOT NULL DEFAULT true,
    "show_stats" BOOLEAN NOT NULL DEFAULT true,
    "profile_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,
    "status" "FollowStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_feed_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "activity_type" "ActivityType" NOT NULL,
    "reference_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_feed_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "challenge_type" "ChallengeType" NOT NULL,
    "target_value" DOUBLE PRECISION NOT NULL,
    "exercise_id" TEXT,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'UPCOMING',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "invite_code" TEXT,
    "max_participants" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_participants" (
    "id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "reference_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_username_key" ON "user_profiles"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_profile_code_key" ON "user_profiles"("profile_code");

-- CreateIndex
CREATE INDEX "user_profiles_username_idx" ON "user_profiles"("username");

-- CreateIndex
CREATE INDEX "user_profiles_profile_code_idx" ON "user_profiles"("profile_code");

-- CreateIndex
CREATE INDEX "follows_follower_id_idx" ON "follows"("follower_id");

-- CreateIndex
CREATE INDEX "follows_following_id_idx" ON "follows"("following_id");

-- CreateIndex
CREATE INDEX "follows_status_idx" ON "follows"("status");

-- CreateIndex
CREATE UNIQUE INDEX "follows_follower_id_following_id_key" ON "follows"("follower_id", "following_id");

-- CreateIndex
CREATE INDEX "activity_feed_items_user_id_idx" ON "activity_feed_items"("user_id");

-- CreateIndex
CREATE INDEX "activity_feed_items_created_at_idx" ON "activity_feed_items"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "challenges_invite_code_key" ON "challenges"("invite_code");

-- CreateIndex
CREATE INDEX "challenges_creator_id_idx" ON "challenges"("creator_id");

-- CreateIndex
CREATE INDEX "challenges_status_idx" ON "challenges"("status");

-- CreateIndex
CREATE INDEX "challenges_invite_code_idx" ON "challenges"("invite_code");

-- CreateIndex
CREATE INDEX "challenge_participants_challenge_id_idx" ON "challenge_participants"("challenge_id");

-- CreateIndex
CREATE INDEX "challenge_participants_user_id_idx" ON "challenge_participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_participants_challenge_id_user_id_key" ON "challenge_participants"("challenge_id", "user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_feed_items" ADD CONSTRAINT "activity_feed_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
