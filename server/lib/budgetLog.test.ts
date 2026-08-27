import assert from 'node:assert/strict';
import test from 'node:test';
import { budgetLogWhere, parseBudgetFilterBasis, parseBudgetLogPayload } from './budgetLog.js';

test('budget log defaults its budget month from the real transaction date', () => {
  const payload = parseBudgetLogPayload({
    clientName: 'นำแสง', date: '2026-08-27', type: 'RECEIVED', amount: 13_912, usableAmount: 13_000,
  });
  assert.equal(payload.date.toISOString().slice(0, 10), '2026-08-27');
  assert.equal(payload.budgetMonth.toISOString().slice(0, 10), '2026-08-01');
});

test('budget log accepts a different reporting month without changing its real date', () => {
  const payload = parseBudgetLogPayload({
    clientName: 'นำแสง', date: '2026-08-27', budgetMonth: '2026-09', type: 'RECEIVED', amount: 13_912, usableAmount: 13_000,
  });
  assert.equal(payload.date.toISOString().slice(0, 10), '2026-08-27');
  assert.equal(payload.budgetMonth.toISOString().slice(0, 10), '2026-09-01');
});

test('budget range selects the correct date field and defaults to budget basis', () => {
  const range = { start: new Date('2026-09-01T00:00:00.000Z'), end: new Date('2026-10-01T00:00:00.000Z') };
  assert.equal(parseBudgetFilterBasis(undefined), 'budget');
  assert.ok('budgetMonth' in budgetLogWhere(1, range, 'budget'));
  assert.ok('date' in budgetLogWhere(1, range, 'transaction'));
  assert.throws(() => parseBudgetFilterBasis('invalid'));
});

test('budget log rejects malformed dates, months and unsafe values', () => {
  const base = { clientName: 'นำแสง', date: '2026-08-27', type: 'RECEIVED', amount: 13_912 };
  assert.throws(() => parseBudgetLogPayload({ ...base, date: '2026-02-31' }));
  assert.throws(() => parseBudgetLogPayload({ ...base, budgetMonth: '2026-13' }));
  assert.throws(() => parseBudgetLogPayload({ ...base, amount: -1 }));
});
