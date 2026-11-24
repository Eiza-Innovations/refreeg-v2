-- Idempotent migration: safe if moderation tables were previously created manually or via db push
CREATE TABLE IF NOT EXISTS "public"."content_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reporter_id" UUID,
    "target_type" VARCHAR(32) NOT NULL,
    "target_id" VARCHAR(128) NOT NULL,
    "reported_user_id" UUID,
    "reason" VARCHAR(255) NOT NULL,
    "details" TEXT,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "resolution_note" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "due_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() + '48:00:00'::interval),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."user_blocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "blocker_user_id" UUID NOT NULL,
    "blocked_user_id" UUID NOT NULL,
    "reason" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_content_reports_status_due" ON "public"."content_reports"("status", "due_at");
CREATE INDEX IF NOT EXISTS "idx_content_reports_target" ON "public"."content_reports"("target_type", "target_id");
CREATE INDEX IF NOT EXISTS "idx_content_reports_reporter" ON "public"."content_reports"("reporter_id");
CREATE INDEX IF NOT EXISTS "idx_content_reports_reported_user" ON "public"."content_reports"("reported_user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_user_blocks_pair" ON "public"."user_blocks"("blocker_user_id", "blocked_user_id");
CREATE INDEX IF NOT EXISTS "idx_user_blocks_blocker" ON "public"."user_blocks"("blocker_user_id");
CREATE INDEX IF NOT EXISTS "idx_user_blocks_blocked" ON "public"."user_blocks"("blocked_user_id");
CREATE INDEX IF NOT EXISTS "idx_profiles_is_blocked" ON "public"."profiles"("is_blocked");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'content_reports_reporter_id_fkey'
    ) THEN
        ALTER TABLE "public"."content_reports"
            ADD CONSTRAINT "content_reports_reporter_id_fkey"
            FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'content_reports_reported_user_id_fkey'
    ) THEN
        ALTER TABLE "public"."content_reports"
            ADD CONSTRAINT "content_reports_reported_user_id_fkey"
            FOREIGN KEY ("reported_user_id") REFERENCES "public"."profiles"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'content_reports_reviewed_by_fkey'
    ) THEN
        ALTER TABLE "public"."content_reports"
            ADD CONSTRAINT "content_reports_reviewed_by_fkey"
            FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_blocks_blocker_user_id_fkey'
    ) THEN
        ALTER TABLE "public"."user_blocks"
            ADD CONSTRAINT "user_blocks_blocker_user_id_fkey"
            FOREIGN KEY ("blocker_user_id") REFERENCES "public"."profiles"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_blocks_blocked_user_id_fkey'
    ) THEN
        ALTER TABLE "public"."user_blocks"
            ADD CONSTRAINT "user_blocks_blocked_user_id_fkey"
            FOREIGN KEY ("blocked_user_id") REFERENCES "public"."profiles"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_blocks_no_self'
    ) THEN
        ALTER TABLE "public"."user_blocks"
            ADD CONSTRAINT "chk_user_blocks_no_self"
            CHECK ("blocker_user_id" <> "blocked_user_id");
    END IF;
END $$;
