-- Add an optional public website to each client.
ALTER TABLE "clients" ADD COLUMN "website_url" TEXT;

-- Legacy campaigns did not have an explicit start date. Backfill from the
-- creation date, capped at the end date so every existing row stays valid.
ALTER TABLE "campaigns" ADD COLUMN "starts_on" DATE;

UPDATE "campaigns"
SET "starts_on" = LEAST("created_at"::date, "end_date"::date)
WHERE "starts_on" IS NULL;

ALTER TABLE "campaigns" ALTER COLUMN "starts_on" SET NOT NULL;
