-- Wishlist gift registry (share-link v1): the registry header, its items,
-- and the per-item contribution ledger the verified charge path writes into.
-- Idempotent: safe if the tables were previously created manually or via db push.

CREATE TABLE IF NOT EXISTS "public"."wishlists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "message" VARCHAR(500),
    "status" TEXT NOT NULL DEFAULT 'active',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."wishlist_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wishlist_id" UUID NOT NULL,
    "name" VARCHAR(140) NOT NULL,
    "price" DECIMAL NOT NULL,
    "contributed" DECIMAL NOT NULL DEFAULT 0,
    "note" VARCHAR(280),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "funded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."wishlist_contributions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_id" UUID NOT NULL,
    "user_id" UUID,
    "amount" DECIMAL NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "message" VARCHAR(280),
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "paystack_reference" VARCHAR,
    "payment_provider" VARCHAR NOT NULL DEFAULT 'paystack',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_contributions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "wishlists_slug_key" ON "public"."wishlists"("slug");
CREATE INDEX IF NOT EXISTS "idx_wishlists_user_id" ON "public"."wishlists"("user_id");
CREATE INDEX IF NOT EXISTS "idx_wishlists_status" ON "public"."wishlists"("status");
CREATE INDEX IF NOT EXISTS "idx_wishlist_items_wishlist_id" ON "public"."wishlist_items"("wishlist_id");
CREATE UNIQUE INDEX IF NOT EXISTS "wishlist_contributions_paystack_reference_key" ON "public"."wishlist_contributions"("paystack_reference");
CREATE INDEX IF NOT EXISTS "idx_wishlist_contributions_item_id" ON "public"."wishlist_contributions"("item_id");
CREATE INDEX IF NOT EXISTS "idx_wishlist_contributions_user_id" ON "public"."wishlist_contributions"("user_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'wishlists_user_id_fkey'
    ) THEN
        ALTER TABLE "public"."wishlists"
            ADD CONSTRAINT "wishlists_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'wishlist_items_wishlist_id_fkey'
    ) THEN
        ALTER TABLE "public"."wishlist_items"
            ADD CONSTRAINT "wishlist_items_wishlist_id_fkey"
            FOREIGN KEY ("wishlist_id") REFERENCES "public"."wishlists"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'wishlist_contributions_item_id_fkey'
    ) THEN
        ALTER TABLE "public"."wishlist_contributions"
            ADD CONSTRAINT "wishlist_contributions_item_id_fkey"
            FOREIGN KEY ("item_id") REFERENCES "public"."wishlist_items"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'wishlist_contributions_user_id_fkey'
    ) THEN
        ALTER TABLE "public"."wishlist_contributions"
            ADD CONSTRAINT "wishlist_contributions_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
