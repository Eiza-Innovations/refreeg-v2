-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."campaign_funnel_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cause_id" UUID NOT NULL,
    "session_id" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "reason" TEXT,
    "device" TEXT,
    "amount" DECIMAL(18,2),
    "reference" TEXT,
    "user_id" UUID,
    "first_time" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_funnel_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_funnel_events_session_id_cause_id_step_key" ON "public"."campaign_funnel_events"("session_id", "cause_id", "step");
CREATE INDEX IF NOT EXISTS "campaign_funnel_events_created_at_idx" ON "public"."campaign_funnel_events"("created_at");
CREATE INDEX IF NOT EXISTS "campaign_funnel_events_reference_idx" ON "public"."campaign_funnel_events"("reference");
