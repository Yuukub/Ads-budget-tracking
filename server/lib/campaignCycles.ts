import prisma from './prisma.js';

export const CAMPAIGN_CYCLES_ENABLED = process.env.CAMPAIGN_CYCLES_V2_ENABLED === 'true';
const BANGKOK_TIME_ZONE = 'Asia/Bangkok';

export function dateOnly(value: Date | string): Date {
  const source = value instanceof Date ? value : new Date(value);
  return new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth(), source.getUTCDate()));
}

export function bangkokToday(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGKOK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return new Date(Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day)));
}

export function monthStart(value: Date | string): Date {
  const date = dateOnly(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function monthEnd(value: Date | string): Date {
  const month = monthStart(value);
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0));
}

export function initialBudgetPeriodData(
  client: { id: number; totalBudget: number; carryOver: number },
  today = bangkokToday(),
  revision = 0,
) {
  const month = monthStart(today);
  return {
    clientId: client.id,
    month,
    revision,
    baseBudget: client.totalBudget,
    carryIn: client.carryOver,
    startsOn: month,
    endsOn: monthEnd(month),
  };
}

export function nextMonthEnd(value: Date | string): Date {
  const month = monthStart(value);
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 2, 0));
}

export function shiftEndDateToMonth(previousEndDate: Date, targetMonth: Date): Date {
  const previousWasMonthEnd = previousEndDate.getUTCDate() === monthEnd(previousEndDate).getUTCDate();
  if (previousWasMonthEnd) return monthEnd(targetMonth);

  const targetStart = monthStart(targetMonth);
  const day = Math.min(previousEndDate.getUTCDate(), monthEnd(targetStart).getUTCDate());
  return new Date(Date.UTC(targetStart.getUTCFullYear(), targetStart.getUTCMonth(), day));
}

export function parseActiveDays(value: string | null): string[] | null {
  return value ? JSON.parse(value) : null;
}

type BudgetAllocation = {
  budget: number;
  spent: number;
  campaignProfile?: { isActive: boolean };
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function budgetPeriodTotals(baseBudget: number, carryIn: number, campaigns: BudgetAllocation[]) {
  const effectiveBudget = roundCurrency(baseBudget + carryIn);
  const allocated = roundCurrency(campaigns.reduce((sum, campaign) => sum + campaign.budget, 0));
  const totalSpent = roundCurrency(campaigns.reduce((sum, campaign) => sum + campaign.spent, 0));

  return {
    effectiveBudget,
    allocated,
    totalSpent,
    unallocated: roundCurrency(effectiveBudget - allocated),
  };
}

export function pauseState(startsOn: Date, endsOn: Date, status: string, today = bangkokToday()): 'scheduled' | 'paused' | 'resumed' | 'cancelled' {
  if (status === 'CANCELLED') return 'cancelled';
  if (today < startsOn) return 'scheduled';
  if (today >= endsOn) return 'resumed';
  return 'paused';
}

export function toClientCampaign(profile: any, period: any, pauseEvents: any[], today = bangkokToday()) {
  const pauses = pauseEvents.map(event => ({
    id: event.id,
    startsOn: event.startsOn,
    endsOn: event.endsOn,
    reason: event.reason,
    status: pauseState(event.startsOn, event.endsOn, event.status, today),
    scope: event.scope,
    cancelledAt: event.cancelledAt,
  }));
  const activePause = pauses.find(pause => pause.status === 'paused');
  const scheduledPause = pauses.find(pause => pause.status === 'scheduled');
  const resumedPause = pauses.find(pause =>
    pause.status === 'resumed' && dateOnly(pause.endsOn).getTime() === dateOnly(today).getTime()
  );

  return {
    id: profile.id,
    periodId: period.id,
    clientId: profile.clientId,
    name: profile.name,
    budget: period.budget,
    spent: period.spent,
    startsOn: period.startsOn,
    endDate: period.endDate,
    platform: profile.platform,
    googleAdsType: profile.googleAdsType,
    activeDays: parseActiveDays(profile.activeDays),
    isArchived: period.status === 'CLOSED',
    archivedAt: period.closedAt,
    clientName: null,
    createdAt: profile.createdAt,
    updatedAt: period.updatedAt,
    pauseEvents: pauses,
    pauseStatus: activePause?.status || scheduledPause?.status || resumedPause?.status || null,
    pauseReason: activePause?.reason || scheduledPause?.reason || resumedPause?.reason || null,
  };
}

export async function getCycleClients(userId: number) {
  const clients = await prisma.client.findMany({
    where: { userId },
    include: {
      budgetPeriods: {
        where: { status: 'OPEN' },
        orderBy: [{ month: 'desc' }, { revision: 'desc' }, { id: 'desc' }],
        take: 1,
        include: {
          campaigns: {
            where: { status: 'OPEN' },
            orderBy: { createdAt: 'asc' },
            include: {
              campaignProfile: {
                include: { pauseCampaigns: { include: { pauseEvent: true } } },
              },
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const today = bangkokToday();
  return clients.map(client => {
    const budgetPeriod = client.budgetPeriods[0];
    const campaigns = (budgetPeriod?.campaigns ?? []).map(period => toClientCampaign(
      period.campaignProfile,
      period,
      period.campaignProfile.pauseCampaigns.map(link => link.pauseEvent),
    ));
    const baseBudget = budgetPeriod?.baseBudget ?? client.totalBudget;
    const carryIn = budgetPeriod?.carryIn ?? client.carryOver;
    const totals = budgetPeriodTotals(baseBudget, carryIn, budgetPeriod?.campaigns ?? []);

    return {
      ...client,
      totalBudget: baseBudget,
      carryOver: carryIn,
      campaigns,
      ...totals,
      budgetPeriodId: budgetPeriod?.id ?? null,
      budgetPeriodMonth: budgetPeriod?.month ?? null,
      budgetPeriodStartsOn: budgetPeriod?.startsOn ?? null,
      budgetPeriodEndsOn: budgetPeriod?.endsOn ?? null,
      isRolloverDue: !!budgetPeriod && budgetPeriod.endsOn <= new Date(today.getTime() + 7 * 86400000),
    };
  });
}

export async function createNotification(input: {
  userId: number;
  type: string;
  title: string;
  message: string;
  dueOn: Date;
  entityType: string;
  entityId: string;
  dedupeKey: string;
}) {
  return prisma.notification.upsert({
    where: { dedupeKey: input.dedupeKey },
    create: { ...input, dueOn: dateOnly(input.dueOn) },
    update: { dueOn: dateOnly(input.dueOn), title: input.title, message: input.message },
  });
}

export async function createPauseNotifications(userId: number, pause: { id: string; startsOn: Date; endsOn: Date; reason: string }) {
  await Promise.all([
    createNotification({
      userId, type: 'PAUSE_START', title: 'ถึงกำหนดพักแอด', message: pause.reason,
      dueOn: pause.startsOn, entityType: 'PAUSE_EVENT', entityId: pause.id, dedupeKey: `pause-start:${pause.id}`,
    }),
    createNotification({
      userId, type: 'PAUSE_END', title: 'ถึงกำหนดเปิดแอดกลับ', message: pause.reason,
      dueOn: pause.endsOn, entityType: 'PAUSE_EVENT', entityId: pause.id, dedupeKey: `pause-end:${pause.id}`,
    }),
  ]);
}

export async function createRolloverNotification(userId: number, period: { id: number; endsOn: Date }) {
  await createNotification({
    userId,
    type: 'ROLLOVER_REVIEW',
    title: 'ตรวจและเปิดรอบงบใหม่',
    message: 'ใกล้ถึงวันปิดรอบงบประมาณของลูกค้า',
    dueOn: new Date(period.endsOn.getTime() - 3 * 86400000),
    entityType: 'CLIENT_BUDGET_PERIOD',
    entityId: String(period.id),
    dedupeKey: `rollover:${period.id}`,
  });
}
