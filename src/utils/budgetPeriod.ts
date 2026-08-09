import type { BudgetMonthRange, BudgetPeriod, BudgetPeriodMode } from '../types';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function isValidMonth(value: string | null | undefined): value is string {
  return !!value && MONTH_PATTERN.test(value);
}

export function getBudgetPeriodFromSearchParams(searchParams: URLSearchParams): BudgetPeriod {
  const mode = searchParams.get('period') as BudgetPeriodMode | null;
  const month = searchParams.get('month');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (mode === 'month' && isValidMonth(month)) {
    return { mode, month };
  }

  if (mode === 'range' && isValidMonth(from) && isValidMonth(to) && from <= to) {
    return { mode, from, to };
  }

  return { mode: 'all' };
}

export function getBudgetMonthRange(period: BudgetPeriod): BudgetMonthRange | undefined {
  if (period.mode === 'month') {
    return { startMonth: period.month, endMonth: period.month };
  }

  if (period.mode === 'range') {
    return { startMonth: period.from, endMonth: period.to };
  }

  return undefined;
}

export function getBudgetPeriodSearchParams(period: BudgetPeriod): URLSearchParams {
  const params = new URLSearchParams();

  if (period.mode === 'month') {
    params.set('period', 'month');
    params.set('month', period.month);
  } else if (period.mode === 'range') {
    params.set('period', 'range');
    params.set('from', period.from);
    params.set('to', period.to);
  }

  return params;
}

export function getBudgetPeriodLabel(period: BudgetPeriod): string {
  if (period.mode === 'month') return `เดือน ${period.month}`;
  if (period.mode === 'range') return `${period.from} ถึง ${period.to}`;
  return 'ทั้งหมด';
}
