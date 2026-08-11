-- Baseline for the legacy schema that existed before Prisma Migrate was adopted.
-- Existing production databases must mark this migration as applied; new databases
-- will execute it before the additive Campaign Cycles migrations.
CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "app_name" TEXT NOT NULL DEFAULT 'Ad Budget Tracker',
    "app_logo" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#3b82f6',
    "footer_text" TEXT NOT NULL DEFAULT '',
    "turnstile_enabled" BOOLEAN NOT NULL DEFAULT false,
    "turnstile_site_key" TEXT,
    "turnstile_secret_key" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clients" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "total_budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carry_over" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "campaigns" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER,
    "name" TEXT NOT NULL,
    "budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "end_date" TIMESTAMP(3) NOT NULL,
    "platform" TEXT NOT NULL,
    "google_ads_type" TEXT,
    "active_days" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "client_name" TEXT,
    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "budget_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "client_name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "usable_amount" DOUBLE PRECISION,
    "platform" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "budget_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "share_links" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT,
    "page_type" TEXT NOT NULL DEFAULT 'all',
    "expires_at" TIMESTAMP(3),
    "password" TEXT,
    "max_views" INTEGER,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "share_access_logs" (
    "id" TEXT NOT NULL,
    "share_link_id" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "share_access_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "share_links_token_key" ON "share_links"("token");
CREATE INDEX "share_links_token_idx" ON "share_links"("token");
CREATE INDEX "share_links_user_id_idx" ON "share_links"("user_id");
CREATE INDEX "share_access_logs_share_link_id_idx" ON "share_access_logs"("share_link_id");

ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "budget_logs" ADD CONSTRAINT "budget_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "share_access_logs" ADD CONSTRAINT "share_access_logs_share_link_id_fkey" FOREIGN KEY ("share_link_id") REFERENCES "share_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
