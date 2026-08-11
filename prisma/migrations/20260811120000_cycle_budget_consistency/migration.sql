-- Keep exactly one canonical OPEN budget period per client. Older duplicate
-- periods are preserved as history and their allocations are closed.
WITH ranked_open_periods AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "client_id"
      ORDER BY "month" DESC, "revision" DESC, "id" DESC
    ) AS "position"
  FROM "client_budget_periods"
  WHERE "status" = 'OPEN'
), duplicate_open_periods AS (
  SELECT "id"
  FROM ranked_open_periods
  WHERE "position" > 1
)
UPDATE "campaign_periods"
SET
  "status" = 'CLOSED',
  "closed_at" = COALESCE("closed_at", CURRENT_TIMESTAMP),
  "updated_at" = CURRENT_TIMESTAMP
WHERE "status" = 'OPEN'
  AND "client_budget_period_id" IN (SELECT "id" FROM duplicate_open_periods);

WITH ranked_open_periods AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "client_id"
      ORDER BY "month" DESC, "revision" DESC, "id" DESC
    ) AS "position"
  FROM "client_budget_periods"
  WHERE "status" = 'OPEN'
)
UPDATE "client_budget_periods"
SET
  "status" = 'CLOSED',
  "carry_out" = COALESCE("carry_out", 0),
  "close_reason" = COALESCE("close_reason", 'DUPLICATE_OPEN_REPAIR'),
  "closed_at" = COALESCE("closed_at", CURRENT_TIMESTAMP),
  "updated_at" = CURRENT_TIMESTAMP
WHERE "id" IN (
  SELECT "id"
  FROM ranked_open_periods
  WHERE "position" > 1
);

-- An OPEN allocation must always be visible to the UI and budget accounting.
UPDATE "campaign_profiles" AS profile
SET
  "is_active" = true,
  "updated_at" = CURRENT_TIMESTAMP
WHERE profile."is_active" = false
  AND EXISTS (
    SELECT 1
    FROM "campaign_periods" AS campaign_period
    INNER JOIN "client_budget_periods" AS budget_period
      ON budget_period."id" = campaign_period."client_budget_period_id"
    WHERE campaign_period."campaign_profile_id" = profile."id"
      AND campaign_period."status" = 'OPEN'
      AND budget_period."status" = 'OPEN'
  );

CREATE UNIQUE INDEX "client_budget_periods_one_open_per_client_key"
ON "client_budget_periods"("client_id")
WHERE "status" = 'OPEN';
