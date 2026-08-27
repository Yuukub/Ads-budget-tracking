import type { Prisma } from '@prisma/client';
import type { BudgetMonthRange } from './budgetPeriod.js';

export type BudgetFilterBasis = 'budget' | 'transaction';

export class BudgetLogValidationError extends Error {}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const VALID_TYPES = new Set(['RECEIVED', 'TOPUP']);
const VALID_PLATFORMS = new Set(['google_ads', 'facebook_ads', 'tiktok_ads', 'line_ads']);

function parseDateOnly(value: unknown, label: string): Date {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new BudgetLogValidationError(`${label}ไม่ถูกต้อง`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new BudgetLogValidationError(`${label}ไม่ถูกต้อง`);
  }
  return parsed;
}

export function monthFromDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function parseBudgetMonth(value: unknown, fallbackDate: Date): Date {
  if (value === undefined || value === null || value === '') return monthFromDate(fallbackDate);
  if (typeof value !== 'string') throw new BudgetLogValidationError('เดือนงบไม่ถูกต้อง');
  const match = MONTH_PATTERN.exec(value);
  if (!match) throw new BudgetLogValidationError('เดือนงบไม่ถูกต้อง');
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
}

export function parseBudgetFilterBasis(value: unknown): BudgetFilterBasis {
  if (value === undefined || value === '') return 'budget';
  if (value === 'budget' || value === 'transaction') return value;
  throw new BudgetLogValidationError('รูปแบบการกรองบัญชีไม่ถูกต้อง');
}

export function budgetLogWhere(
  userId: number,
  range: BudgetMonthRange | null,
  basis: BudgetFilterBasis,
): Prisma.BudgetLogWhereInput {
  if (!range) return { userId };
  return {
    userId,
    [basis === 'budget' ? 'budgetMonth' : 'date']: { gte: range.start, lt: range.end },
  };
}

export function parseBudgetLogPayload(body: Record<string, unknown>) {
  const clientName = typeof body.clientName === 'string' ? body.clientName.trim() : '';
  if (!clientName || clientName.length > 200) throw new BudgetLogValidationError('ชื่อลูกค้าไม่ถูกต้อง');

  const date = parseDateOnly(body.date, 'วันที่รับ/จ่ายจริง');
  const budgetMonth = parseBudgetMonth(body.budgetMonth, date);
  const type = typeof body.type === 'string' ? body.type : '';
  if (!VALID_TYPES.has(type)) throw new BudgetLogValidationError('ประเภทรายการไม่ถูกต้อง');

  if (body.amount === undefined || body.amount === null || body.amount === '') throw new BudgetLogValidationError('จำนวนเงินไม่ถูกต้อง');
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 0) throw new BudgetLogValidationError('จำนวนเงินไม่ถูกต้อง');

  let usableAmount: number | null = null;
  if (type === 'RECEIVED' && body.usableAmount !== undefined && body.usableAmount !== null && body.usableAmount !== '') {
    usableAmount = Number(body.usableAmount);
    if (!Number.isFinite(usableAmount) || usableAmount < 0) throw new BudgetLogValidationError('ยอด Ads ที่ใช้ได้ไม่ถูกต้อง');
  }

  let platform: string | null = null;
  if (type === 'TOPUP') {
    platform = typeof body.platform === 'string' ? body.platform : '';
    if (!VALID_PLATFORMS.has(platform)) throw new BudgetLogValidationError('Platform ไม่ถูกต้อง');
  }

  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (note.length > 2000) throw new BudgetLogValidationError('หมายเหตุยาวเกินไป');

  return {
    clientName,
    date,
    budgetMonth,
    type,
    amount,
    usableAmount,
    platform,
    note: note || null,
  };
}
