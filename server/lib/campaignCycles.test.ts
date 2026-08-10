import assert from 'node:assert/strict';
import test from 'node:test';
import { monthEnd, shiftEndDateToMonth } from './campaignCycles.js';

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
