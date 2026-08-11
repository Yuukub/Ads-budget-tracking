import assert from 'node:assert/strict';
import test from 'node:test';
import { countActiveDays } from '../../src/utils/helpers.js';
import { budgetPeriodTotals, monthEnd, pauseState, shiftEndDateToMonth } from './campaignCycles.js';

test('monthEnd covers 28/29/30/31-day months', () => {
  assert.equal(monthEnd('2026-02-01').toISOString().slice(0, 10), '2026-02-28');
  assert.equal(monthEnd('2024-02-01').toISOString().slice(0, 10), '2024-02-29');
  assert.equal(monthEnd('2026-04-01').toISOString().slice(0, 10), '2026-04-30');
  assert.equal(monthEnd('2026-12-01').toISOString().slice(0, 10), '2026-12-31');
});

test('rollover keeps month-end and clamps explicit dates', () => {
  assert.equal(shiftEndDateToMonth(new Date('2026-01-31T00:00:00Z'), new Date('2026-02-01T00:00:00Z')).toISOString().slice(0, 10), '2026-02-28');
  assert.equal(shiftEndDateToMonth(new Date('2024-01-30T00:00:00Z'), new Date('2024-02-01T00:00:00Z')).toISOString().slice(0, 10), '2024-02-29');
  assert.equal(shiftEndDateToMonth(new Date('2026-01-15T00:00:00Z'), new Date('2026-02-01T00:00:00Z')).toISOString().slice(0, 10), '2026-02-15');
});

test('budget period totals include every open allocation even when its profile is inactive', () => {
  const totals = budgetPeriodTotals(11_000, 0, [
    { budget: 11_000, spent: 2_500, campaignProfile: { isActive: false } },
  ]);

  assert.deepEqual(totals, {
    effectiveBudget: 11_000,
    allocated: 11_000,
    totalSpent: 2_500,
    unallocated: 0,
  });
});

test('pause ends when the reopen date begins', () => {
  const startsOn = new Date('2026-08-12T00:00:00.000Z');
  const reopensOn = new Date('2026-08-13T00:00:00.000Z');

  assert.equal(pauseState(startsOn, reopensOn, 'ACTIVE', new Date('2026-08-11T00:00:00.000Z')), 'scheduled');
  assert.equal(pauseState(startsOn, reopensOn, 'ACTIVE', new Date('2026-08-12T00:00:00.000Z')), 'paused');
  assert.equal(pauseState(startsOn, reopensOn, 'ACTIVE', new Date('2026-08-13T00:00:00.000Z')), 'resumed');
});

test('recommended budget counts the reopen date as an active day', () => {
  const activeRunDays = countActiveDays(
    '2026-08-17',
    ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    [{
      id: 'pause-1',
      scope: 'CAMPAIGN',
      startsOn: '2026-08-12T00:00:00.000Z',
      endsOn: '2026-08-13T00:00:00.000Z',
      reason: 'ร้านปิด',
      status: 'scheduled',
    }],
    new Date('2026-08-11T12:00:00'),
  );

  assert.equal(activeRunDays, 5);
});
