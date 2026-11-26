-- 20261024120000_admin_workspace_backend was marked applied without running on
-- some databases. Analytics needs only the audit table, so create it if missing.
CREATE TABLE IF NOT EXISTS "public"."admin_audit_entries" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "admin_audit_entries_actor_id_created_at_idx" ON "public"."admin_audit_entries"("actor_id", "created_at");
CREATE INDEX IF NOT EXISTS "admin_audit_entries_kind_target_id_idx" ON "public"."admin_audit_entries"("kind", "target_id");
