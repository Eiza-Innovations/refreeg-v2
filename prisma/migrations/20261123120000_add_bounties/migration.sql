-- This table was created directly against the database (outside the
-- migration chain) before this migration was committed. The migration name
-- matches what the database's own migration history already records as
-- applied, so `prisma migrate deploy` recognizes it as satisfied by name and
-- will not try to run this SQL again on that database. On a fresh database,
-- this SQL recreates the table exactly as introspected.

-- CreateTable
CREATE TABLE "public"."bounties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "cause_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "deliverable" TEXT NOT NULL,
    "reward" DECIMAL NOT NULL,
    "available_spots" INTEGER NOT NULL,
    "deadline" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "changes_requested" TEXT,
    "submitted_at" TIMESTAMPTZ(6),
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bounties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_bounties_cause_id" ON "public"."bounties"("cause_id" ASC);

-- CreateIndex
CREATE INDEX "idx_bounties_owner_created" ON "public"."bounties"("owner_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "idx_bounties_status_submitted" ON "public"."bounties"("status" ASC, "submitted_at" ASC);

-- AddForeignKey
ALTER TABLE "public"."bounties" ADD CONSTRAINT "bounties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bounties" ADD CONSTRAINT "bounties_cause_id_fkey" FOREIGN KEY ("cause_id") REFERENCES "public"."causes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
