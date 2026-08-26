import assert from 'node:assert/strict';
import test from 'node:test';
import { countActiveDays, enrichCampaign } from '../../src/utils/helpers.js';
import type { Campaign } from '../../src/types/index.js';
import { budgetPeriodTotals, campaignStartIsWithinPeriodEnd, initialBudgetPeriodData, monthEnd, pauseState, shiftEndDateToMonth, toClientCampaign } from './campaignCycles.js';
import { normalizeWebsiteUrl } from './clientWebsite.js';

function campaignFixture(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 1,
    clientId: 1,
    name: 'Search',
    budget: 3_000,
    spent: 0,
    startsOn: '2026-08-12T00:00:00.000Z',
    endDate: '2026-08-14T00:00:00.000Z',
    platform: 'google_ads',
    googleAdsType: 'search',
    activeDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    isArchived: false,
    archivedAt: null,
    clientName: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

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

test('resumed pause banner only appears on the reopen date', () => {
  const profile = {
    id: 1,
    clientId: 1,
    name: 'Search',
    platform: 'google_ads',
    googleAdsType: 'search',
    activeDays: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
  };
  const period = {
    id: 1,
    budget: 2_750,
    spent: 1_000,
    startsOn: new Date('2026-08-01T00:00:00.000Z'),
    endDate: new Date('2026-08-31T00:00:00.000Z'),
    status: 'OPEN',
    closedAt: null,
    updatedAt: new Date('2026-08-12T00:00:00.000Z'),
  };
  const pauseEvents = [{
    id: 'pause-1',
    startsOn: new Date('2026-08-12T00:00:00.000Z'),
    endsOn: new Date('2026-08-13T00:00:00.000Z'),
    reason: 'ร้านปิด',
    status: 'ACTIVE',
    scope: 'CAMPAIGN',
    cancelledAt: null,
  }];

  const onReopenDate = toClientCampaign(profile, period, pauseEvents, new Date('2026-08-13T00:00:00.000Z'));
  assert.equal(onReopenDate.pauseStatus, 'resumed');

  const afterReopenDate = toClientCampaign(profile, period, pauseEvents, new Date('2026-08-14T00:00:00.000Z'));
  assert.equal(afterReopenDate.pauseStatus, null);
  assert.equal(afterReopenDate.pauseEvents[0].status, 'resumed', 'pause history must remain intact');
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

test('missing cycle is bootstrapped from the client current budget', () => {
  const data = initialBudgetPeriodData(
    { id: 42, totalBudget: 12_500, carryOver: 0 },
    new Date('2026-08-11T00:00:00.000Z'),
    0,
  );

  assert.equal(data.clientId, 42);
  assert.equal(data.baseBudget, 12_500);
  assert.equal(data.carryIn, 0);
  assert.equal(data.revision, 0);
  assert.equal(data.month.toISOString().slice(0, 10), '2026-08-01');
  assert.equal(data.startsOn.toISOString().slice(0, 10), '2026-08-01');
  assert.equal(data.endsOn.toISOString().slice(0, 10), '2026-08-31');
});

test('campaign start may precede the current budget month', () => {
  const period = { endsOn: new Date('2026-09-30T00:00:00.000Z') };
  const actualCampaignStart = new Date('2026-08-18T00:00:00.000Z');

  assert.equal(campaignStartIsWithinPeriodEnd(actualCampaignStart, period), true);
  assert.equal(campaignStartIsWithinPeriodEnd(new Date('2026-10-01T00:00:00.000Z'), period), false);
});

test('campaign does not count days before its start date and is scheduled', () => {
  const campaign = enrichCampaign(campaignFixture(), new Date('2026-08-10T12:00:00'));
  assert.equal(campaign.status, 'scheduled');
  assert.equal(campaign.activeRunDays, 3);
  assert.equal(campaign.recommendedDailyBudget, 1_000);
});

test('campaign starts counting on its start date and respects pauses', () => {
  const campaign = enrichCampaign(campaignFixture({
    pauseEvents: [{
      id: 'pause-start',
      scope: 'CAMPAIGN',
      startsOn: '2026-08-13T00:00:00.000Z',
      endsOn: '2026-08-14T00:00:00.000Z',
      reason: 'ปิดร้าน',
      status: 'scheduled',
    }],
  }), new Date('2026-08-12T09:00:00'));

  assert.equal(campaign.status, 'expiring_soon');
  assert.equal(campaign.activeRunDays, 2, 'start and reopen dates are counted, paused date is not');
});

test('past start date calculates from today instead of retroactively', () => {
  const campaign = enrichCampaign(campaignFixture({ startsOn: '2026-08-01T00:00:00.000Z' }), new Date('2026-08-12T09:00:00'));
  assert.equal(campaign.activeRunDays, 3);
});

test('client website normalization accepts web URLs and rejects unsafe protocols', () => {
  assert.equal(normalizeWebsiteUrl('example.com/path'), 'https://example.com/path');
  assert.equal(normalizeWebsiteUrl(' http://example.com '), 'http://example.com/');
  assert.equal(normalizeWebsiteUrl('example.com:8080/path'), 'https://example.com:8080/path');
  assert.equal(normalizeWebsiteUrl('   '), null);
  assert.throws(() => normalizeWebsiteUrl('javascript:alert(1)'), /http หรือ https/);
  assert.throws(() => normalizeWebsiteUrl(`https://example.com/${'a'.repeat(2049)}`), /2,048/);
});
