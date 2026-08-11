-- Allow a client to restart its budget baseline within the same calendar month
-- while preserving the previous period and campaign records as history.
DROP INDEX IF EXISTS "client_budget_periods_client_id_month_key";

ALTER TABLE "client_budget_periods"
ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "close_reason" TEXT;

CREATE UNIQUE INDEX "client_budget_periods_client_id_month_revision_key"
ON "client_budget_periods"("client_id", "month", "revision");
