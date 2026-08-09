export class BudgetMonthRangeError extends Error {}

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export interface BudgetMonthRange {
  start: Date;
  end: Date;
}

function toMonthStart(value: string): Date | null {
  const match = MONTH_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  return new Date(Date.UTC(year, month, 1));
}

export function parseBudgetMonthRange(startMonth: unknown, endMonth: unknown): BudgetMonthRange | null {
  if (startMonth === undefined && endMonth === undefined) return null;

  if (typeof startMonth !== 'string' || typeof endMonth !== 'string') {
    throw new BudgetMonthRangeError('startMonth and endMonth must be supplied together as YYYY-MM');
  }

  const start = toMonthStart(startMonth);
  const endMonthStart = toMonthStart(endMonth);

  if (!start || !endMonthStart || start > endMonthStart) {
    throw new BudgetMonthRangeError('Invalid budget month range');
  }

  return {
    start,
    end: new Date(Date.UTC(endMonthStart.getUTCFullYear(), endMonthStart.getUTCMonth() + 1, 1)),
  };
}
