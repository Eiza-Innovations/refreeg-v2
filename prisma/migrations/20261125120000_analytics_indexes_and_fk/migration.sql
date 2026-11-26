-- Add missing indexes for campaign-risk, audit, and funnel queries, plus FK and step constraint.
CREATE INDEX "idx_causes_image" ON "public"."causes"("image");

CREATE INDEX "admin_audit_entries_action_created_at_idx" ON "public"."admin_audit_entries"("action", "created_at");
CREATE INDEX "admin_audit_entries_target_id_idx" ON "public"."admin_audit_entries"("target_id");

CREATE INDEX "campaign_funnel_events_cause_id_idx" ON "public"."campaign_funnel_events"("cause_id");

ALTER TABLE "public"."campaign_funnel_events"
  ADD CONSTRAINT "campaign_funnel_events_cause_id_fkey"
  FOREIGN KEY ("cause_id") REFERENCES "public"."causes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."campaign_funnel_events"
  ADD CONSTRAINT "campaign_funnel_events_step_check"
  CHECK ("step" IN ('view', 'give', 'amount', 'payment', 'paid', 'failed'));
