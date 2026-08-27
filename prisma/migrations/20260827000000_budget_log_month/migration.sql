-- Keep the real transaction date while assigning each ledger entry to one
-- reporting month. Existing entries remain in the month of their real date.
ALTER TABLE "budget_logs" ADD COLUMN "budget_month" DATE;

UPDATE "budget_logs"
SET "budget_month" = DATE_TRUNC('month', "date")::date
WHERE "budget_month" IS NULL;

-- Keep inserts from the currently deployed app compatible during rollout.
-- New code sends budget_month explicitly; older code receives the date month.
CREATE FUNCTION "set_budget_log_month_from_date"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."budget_month" IS NULL THEN
    NEW."budget_month" := DATE_TRUNC('month', NEW."date")::date;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "budget_logs_set_budget_month"
BEFORE INSERT OR UPDATE OF "date", "budget_month" ON "budget_logs"
FOR EACH ROW
EXECUTE FUNCTION "set_budget_log_month_from_date"();

ALTER TABLE "budget_logs" ALTER COLUMN "budget_month" SET NOT NULL;

CREATE INDEX "budget_logs_user_id_budget_month_idx"
ON "budget_logs"("user_id", "budget_month");

CREATE INDEX "budget_logs_user_id_date_idx"
ON "budget_logs"("user_id", "date");
