-- Additive V2 campaign lifecycle schema. The legacy "campaigns" table is retained.
CREATE TABLE "campaign_profiles" (
  "id" SERIAL NOT NULL,
  "client_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "google_ads_type" TEXT,
  "active_days" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "campaign_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "client_budget_periods" (
  "id" SERIAL NOT NULL,
  "client_id" INTEGER NOT NULL,
  "month" DATE NOT NULL,
  "base_budget" DOUBLE PRECISION NOT NULL,
  "carry_in" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "carry_out" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "starts_on" DATE NOT NULL,
  "ends_on" DATE NOT NULL,
  "closed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "client_budget_periods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "campaign_periods" (
  "id" SERIAL NOT NULL,
  "campaign_profile_id" INTEGER NOT NULL,
  "client_budget_period_id" INTEGER NOT NULL,
  "legacy_campaign_id" INTEGER,
  "budget" DOUBLE PRECISION NOT NULL,
  "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "starts_on" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "closed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "campaign_periods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pause_events" (
  "id" TEXT NOT NULL,
  "client_id" INTEGER NOT NULL,
  "created_by_id" INTEGER NOT NULL,
  "scope" TEXT NOT NULL,
  "starts_on" DATE NOT NULL,
  "ends_on" DATE NOT NULL,
  "reason" TEXT NOT NULL DEFAULT 'ร้านปิด',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "cancelled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pause_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pause_event_campaigns" (
  "pause_event_id" TEXT NOT NULL,
  "campaign_profile_id" INTEGER NOT NULL,
  CONSTRAINT "pause_event_campaigns_pkey" PRIMARY KEY ("pause_event_id", "campaign_profile_id")
);

CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "user_id" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "due_on" DATE NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "dedupe_key" TEXT NOT NULL,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "client_budget_periods_client_id_month_key" ON "client_budget_periods"("client_id", "month");
CREATE UNIQUE INDEX "campaign_periods_legacy_campaign_id_key" ON "campaign_periods"("legacy_campaign_id");
CREATE UNIQUE INDEX "campaign_periods_campaign_profile_id_client_budget_period_id_key" ON "campaign_periods"("campaign_profile_id", "client_budget_period_id");
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");
CREATE INDEX "campaign_profiles_client_id_is_active_idx" ON "campaign_profiles"("client_id", "is_active");
CREATE INDEX "client_budget_periods_client_id_status_idx" ON "client_budget_periods"("client_id", "status");
CREATE INDEX "campaign_periods_campaign_profile_id_status_idx" ON "campaign_periods"("campaign_profile_id", "status");
CREATE INDEX "campaign_periods_client_budget_period_id_status_idx" ON "campaign_periods"("client_budget_period_id", "status");
CREATE INDEX "pause_events_client_id_status_starts_on_ends_on_idx" ON "pause_events"("client_id", "status", "starts_on", "ends_on");
CREATE INDEX "pause_event_campaigns_campaign_profile_id_idx" ON "pause_event_campaigns"("campaign_profile_id");
CREATE INDEX "notifications_user_id_is_read_due_on_idx" ON "notifications"("user_id", "is_read", "due_on");

ALTER TABLE "campaign_profiles" ADD CONSTRAINT "campaign_profiles_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_budget_periods" ADD CONSTRAINT "client_budget_periods_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_periods" ADD CONSTRAINT "campaign_periods_campaign_profile_id_fkey" FOREIGN KEY ("campaign_profile_id") REFERENCES "campaign_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_periods" ADD CONSTRAINT "campaign_periods_client_budget_period_id_fkey" FOREIGN KEY ("client_budget_period_id") REFERENCES "client_budget_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_periods" ADD CONSTRAINT "campaign_periods_legacy_campaign_id_fkey" FOREIGN KEY ("legacy_campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pause_events" ADD CONSTRAINT "pause_events_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pause_events" ADD CONSTRAINT "pause_events_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pause_event_campaigns" ADD CONSTRAINT "pause_event_campaigns_pause_event_id_fkey" FOREIGN KEY ("pause_event_id") REFERENCES "pause_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pause_event_campaigns" ADD CONSTRAINT "pause_event_campaigns_campaign_profile_id_fkey" FOREIGN KEY ("campaign_profile_id") REFERENCES "campaign_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
