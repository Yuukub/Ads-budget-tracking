-- Campaign Cycles V2 was originally backfilled from legacy campaigns, so a
-- client with no legacy campaign could be left without an OPEN budget period.
WITH current_cycle AS (
  SELECT
    DATE_TRUNC('month', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date AS "month",
    (DATE_TRUNC('month', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok') + INTERVAL '1 month - 1 day')::date AS "ends_on"
)
INSERT INTO "client_budget_periods" (
  "client_id",
  "month",
  "revision",
  "base_budget",
  "carry_in",
  "status",
  "starts_on",
  "ends_on",
  "created_at",
  "updated_at"
)
SELECT
  client."id",
  current_cycle."month",
  COALESCE((
    SELECT MAX(existing."revision") + 1
    FROM "client_budget_periods" AS existing
    WHERE existing."client_id" = client."id"
      AND existing."month" = current_cycle."month"
  ), 0),
  client."total_budget",
  client."carry_over",
  'OPEN',
  current_cycle."month",
  current_cycle."ends_on",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "clients" AS client
CROSS JOIN current_cycle
WHERE NOT EXISTS (
  SELECT 1
  FROM "client_budget_periods" AS open_period
  WHERE open_period."client_id" = client."id"
    AND open_period."status" = 'OPEN'
);
