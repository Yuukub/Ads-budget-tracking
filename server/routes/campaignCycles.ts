import { Router, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import {
  CAMPAIGN_CYCLES_ENABLED,
  bangkokToday,
  createPauseNotifications,
  createRolloverNotification,
  monthEnd,
  monthStart,
  shiftEndDateToMonth,
} from '../lib/campaignCycles.js';

const router = Router();
router.use(authMiddleware);

function parseMonth(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  return new Date(Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, 1));
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function getOwnedClient(clientId: number, userId: number) {
  const client = await prisma.client.findUnique({ where: { id: clientId }, include: { user: { select: { id: true, role: true } } } });
  if (!client) return null;
  if (client.userId === userId || (await prisma.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role === 'admin') return client;
  return null;
}

async function getOwnedProfile(profileId: number, userId: number) {
  const profile = await prisma.campaignProfile.findUnique({ include: { client: true }, where: { id: profileId } });
  if (!profile) return null;
  const client = await getOwnedClient(profile.clientId, userId);
  return client ? profile : null;
}

function requireV2(next: NextFunction, res: Response) {
  if (!CAMPAIGN_CYCLES_ENABLED) {
    next();
    return false;
  }
  return true;
}

async function createPause(clientId: number, profileIds: number[], body: Record<string, unknown>, userId: number, scope: 'CLIENT' | 'CAMPAIGN', res: Response) {
  const startsOn = parseDate(body.startsOn) || bangkokToday();
  const endsOn = parseDate(body.endsOn) || startsOn;
  const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : 'ร้านปิด';

  if (endsOn < startsOn) return res.status(400).json({ error: 'วันสิ้นสุดต้องไม่ก่อนวันเริ่ม' });
  if (profileIds.length === 0) return res.status(400).json({ error: 'ไม่มีแคมเปญที่กำลังใช้งานให้พัก' });

  const overlap = await prisma.pauseEvent.findFirst({
    where: {
      status: 'ACTIVE',
      startsOn: { lte: endsOn },
      endsOn: { gte: startsOn },
      campaigns: { some: { campaignProfileId: { in: profileIds } } },
    },
  });
  if (overlap) return res.status(409).json({ error: 'มีช่วงพักแอดซ้อนกับรายการเดิม กรุณาแก้ไขหรือยกเลิกรายการเดิม' });

  const pause = await prisma.pauseEvent.create({
    data: {
      clientId,
      createdById: userId,
      scope,
      startsOn,
      endsOn,
      reason,
      campaigns: { createMany: { data: profileIds.map(campaignProfileId => ({ campaignProfileId })) } },
    },
  });
  await createPauseNotifications(userId, pause);
  return res.status(201).json(pause);
}

router.post('/campaigns', async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!requireV2(next, res)) return;
  try {
    const { clientId, name, budget, endDate, platform, googleAdsType, activeDays } = req.body;
    const client = await getOwnedClient(Number(clientId), req.userId!);
    if (!client || !name || !['google_ads', 'facebook_ads'].includes(platform)) return res.status(400).json({ error: 'ข้อมูลแคมเปญไม่ถูกต้อง' });
    const amount = Number(budget);
    const end = parseDate(endDate) || monthEnd(bangkokToday());
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'งบแคมเปญต้องมากกว่า 0' });
    const cycle = await prisma.clientBudgetPeriod.findFirst({ where: { clientId: client.id, status: 'OPEN' }, orderBy: { month: 'desc' }, include: { campaigns: { where: { status: 'OPEN' } } } });
    if (!cycle) return res.status(400).json({ error: 'กรุณาเปิดรอบงบของลูกค้าก่อนเพิ่มแคมเปญ' });
    const available = cycle.baseBudget + cycle.carryIn - cycle.campaigns.reduce((sum, period) => sum + period.budget, 0);
    if (amount > available) return res.status(400).json({ error: `งบแคมเปญเกินงบที่เหลือ (${available.toFixed(2)})` });
    const created = await prisma.$transaction(async tx => {
      const profile = await tx.campaignProfile.create({ data: { clientId: client.id, name: String(name).trim(), platform, googleAdsType: platform === 'google_ads' ? googleAdsType || null : null, activeDays: activeDays ? JSON.stringify(activeDays) : null } });
      const period = await tx.campaignPeriod.create({ data: { campaignProfileId: profile.id, clientBudgetPeriodId: cycle.id, budget: amount, startsOn: bangkokToday(), endDate: end } });
      return { profile, period };
    });
    return res.status(201).json({ ...created.profile, budget: created.period.budget, spent: created.period.spent, endDate: created.period.endDate, periodId: created.period.id, activeDays });
  } catch (error) {
    console.error('Create V2 campaign error:', error);
    return res.status(500).json({ error: 'Failed to create campaign' });
  }
});

router.put('/campaigns/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!requireV2(next, res)) return;
  try {
    const profile = await getOwnedProfile(Number(req.params.id), req.userId!);
    if (!profile) return res.status(404).json({ error: 'Campaign not found' });
    const current = await prisma.campaignPeriod.findFirst({ where: { campaignProfileId: profile.id, status: 'OPEN' }, include: { clientBudgetPeriod: { include: { campaigns: { where: { status: 'OPEN' } } } } } });
    if (!current) return res.status(400).json({ error: 'ไม่พบรอบแคมเปญที่กำลังใช้งาน' });
    const requestedBudget = req.body.budget === undefined ? current.budget : Number(req.body.budget);
    const allocatedElsewhere = current.clientBudgetPeriod.campaigns.filter(period => period.id !== current.id).reduce((sum, period) => sum + period.budget, 0);
    if (!Number.isFinite(requestedBudget) || requestedBudget < current.spent || requestedBudget + allocatedElsewhere > current.clientBudgetPeriod.baseBudget + current.clientBudgetPeriod.carryIn) {
      return res.status(400).json({ error: 'งบแคมเปญไม่ถูกต้องหรือเกินงบที่ใช้ได้' });
    }
    const endDate = req.body.endDate ? parseDate(req.body.endDate) : current.endDate;
    if (!endDate) return res.status(400).json({ error: 'วันสิ้นสุดไม่ถูกต้อง' });
    const updated = await prisma.$transaction(async tx => {
      const campaign = await tx.campaignProfile.update({ where: { id: profile.id }, data: {
        ...(req.body.name ? { name: String(req.body.name).trim() } : {}),
        ...(req.body.platform ? { platform: req.body.platform, googleAdsType: req.body.platform === 'google_ads' ? req.body.googleAdsType || null : null } : {}),
        ...(req.body.activeDays !== undefined ? { activeDays: req.body.activeDays ? JSON.stringify(req.body.activeDays) : null } : {}),
      } });
      const period = await tx.campaignPeriod.update({ where: { id: current.id }, data: { budget: requestedBudget, endDate } });
      return { campaign, period };
    });
    return res.json({ ...updated.campaign, budget: updated.period.budget, spent: updated.period.spent, endDate: updated.period.endDate, periodId: updated.period.id, activeDays: updated.campaign.activeDays ? JSON.parse(updated.campaign.activeDays) : null });
  } catch (error) {
    console.error('Update V2 campaign error:', error);
    return res.status(500).json({ error: 'Failed to update campaign' });
  }
});

router.patch('/campaigns/:id/spent', async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!requireV2(next, res)) return;
  const profile = await getOwnedProfile(Number(req.params.id), req.userId!);
  if (!profile) return res.status(404).json({ error: 'Campaign not found' });
  const spent = Number(req.body.spent);
  if (!Number.isFinite(spent) || spent < 0) return res.status(400).json({ error: 'ยอดใช้ไม่ถูกต้อง' });
  const period = await prisma.campaignPeriod.findFirst({ where: { campaignProfileId: profile.id, status: 'OPEN' } });
  if (!period) return res.status(400).json({ error: 'ไม่พบรอบแคมเปญที่กำลังใช้งาน' });
  return res.json(await prisma.campaignPeriod.update({ where: { id: period.id }, data: { spent } }));
});

// Canonical V2 endpoint: the amount belongs to a campaign period, not the stable profile.
router.patch('/campaign-periods/:id/spent', async (req: AuthRequest, res: Response) => {
  if (!CAMPAIGN_CYCLES_ENABLED) return res.status(409).json({ error: 'Campaign cycles v2 is not enabled' });
  const periodId = Number(req.params.id);
  const spent = Number(req.body.spent);
  if (!Number.isInteger(periodId) || !Number.isFinite(spent) || spent < 0) return res.status(400).json({ error: 'ยอดใช้ไม่ถูกต้อง' });
  const period = await prisma.campaignPeriod.findUnique({ include: { campaignProfile: true }, where: { id: periodId } });
  if (!period || period.status !== 'OPEN' || !(await getOwnedClient(period.campaignProfile.clientId, req.userId!))) {
    return res.status(404).json({ error: 'Campaign period not found' });
  }
  return res.json(await prisma.campaignPeriod.update({ where: { id: period.id }, data: { spent } }));
});

router.post('/campaigns/:id/archive', async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!requireV2(next, res)) return;
  const profile = await getOwnedProfile(Number(req.params.id), req.userId!);
  if (!profile) return res.status(404).json({ error: 'Campaign not found' });
  const period = await prisma.campaignPeriod.findFirst({ where: { campaignProfileId: profile.id, status: 'OPEN' } });
  if (!period) return res.status(400).json({ error: 'แคมเปญนี้สิ้นสุดแล้ว' });
  await prisma.$transaction([
    prisma.campaignPeriod.update({ where: { id: period.id }, data: { status: 'CLOSED', closedAt: new Date() } }),
    prisma.campaignProfile.update({ where: { id: profile.id }, data: { isActive: false } }),
  ]);
  return res.json({ message: 'สิ้นสุดแคมเปญแล้ว ยอดคงเหลือจะถูกรวมในยอดยกไปรอบใหม่', carryOverChange: period.budget - period.spent });
});

router.delete('/campaigns/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!requireV2(next, res)) return;
  const profile = await getOwnedProfile(Number(req.params.id), req.userId!);
  if (!profile) return res.status(404).json({ error: 'Campaign not found' });
  const period = await prisma.campaignPeriod.findFirst({ where: { campaignProfileId: profile.id, status: 'OPEN' } });
  await prisma.$transaction([
    prisma.campaignProfile.update({ where: { id: profile.id }, data: { isActive: false } }),
    ...(period ? [prisma.campaignPeriod.update({ where: { id: period.id }, data: { status: 'CLOSED', closedAt: new Date() } })] : []),
  ]);
  return res.json({ message: 'ปิดใช้งานแคมเปญแล้ว' });
});

router.post('/clients/:id/periods/rollover', async (req: AuthRequest, res: Response) => {
  if (!CAMPAIGN_CYCLES_ENABLED) return res.status(409).json({ error: 'Campaign cycles v2 is not enabled' });
  try {
    const clientId = Number(req.params.id);
    const client = await getOwnedClient(clientId, req.userId!);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const targetMonth = parseMonth(req.body.month);
    const baseBudget = Number(req.body.baseBudget);
    const entries = Array.isArray(req.body.campaigns) ? req.body.campaigns : [];
    if (!targetMonth || !Number.isFinite(baseBudget) || baseBudget <= 0 || entries.length === 0) {
      return res.status(400).json({ error: 'กรุณาระบุเดือน งบฐาน และแคมเปญที่ทำต่อให้ถูกต้อง' });
    }

    const current = await prisma.clientBudgetPeriod.findFirst({
      where: { clientId, status: 'OPEN' },
      orderBy: { month: 'desc' },
      include: { campaigns: { where: { status: 'OPEN' }, include: { campaignProfile: true } } },
    });
    if (!current) return res.status(400).json({ error: 'ไม่พบรอบงบที่เปิดอยู่' });
    if (targetMonth <= current.month) return res.status(400).json({ error: 'เดือนรอบใหม่ต้องอยู่หลังรอบปัจจุบัน' });

    const continuing = entries.filter((entry: any) => entry.continue !== false);
    const currentProfileIds = new Set(current.campaigns.map(period => period.campaignProfileId));
    if (continuing.some((entry: any) => !currentProfileIds.has(Number(entry.campaignId)))) {
      return res.status(400).json({ error: 'พบแคมเปญที่ไม่ได้อยู่ในรอบปัจจุบัน' });
    }

    const carryOut = Math.round(((current.baseBudget + current.carryIn) - current.campaigns.reduce((sum, period) => sum + period.spent, 0)) * 100) / 100;
    const effectiveBudget = Math.round((baseBudget + carryOut) * 100) / 100;
    const allocations = continuing.reduce((sum: number, entry: any) => sum + Number(entry.budget || 0), 0);
    if (effectiveBudget <= 0 || allocations > effectiveBudget || continuing.some((entry: any) => !Number.isFinite(Number(entry.budget)) || Number(entry.budget) <= 0)) {
      return res.status(400).json({ error: 'งบใหม่หลังยอดยกมาต้องมากกว่า 0 และงบแคมเปญรวมต้องไม่เกินงบที่ใช้ได้' });
    }

    const nextEnd = monthEnd(targetMonth);
    const result = await prisma.$transaction(async tx => {
      await tx.campaignPeriod.updateMany({ where: { clientBudgetPeriodId: current.id, status: 'OPEN' }, data: { status: 'CLOSED', closedAt: new Date() } });
      await tx.clientBudgetPeriod.update({ where: { id: current.id }, data: { status: 'CLOSED', carryOut, closedAt: new Date() } });
      const next = await tx.clientBudgetPeriod.create({
        data: { clientId, month: targetMonth, baseBudget, carryIn: carryOut, startsOn: targetMonth, endsOn: nextEnd },
      });

      for (const entry of continuing) {
        const previous = current.campaigns.find(period => period.campaignProfileId === Number(entry.campaignId))!;
        const explicitEnd = parseDate(entry.endDate);
        const endDate = explicitEnd || shiftEndDateToMonth(previous.endDate, targetMonth);
        if (endDate < targetMonth) throw new Error('วันสิ้นสุดของแคมเปญต้องอยู่ในหรือหลังเดือนรอบใหม่');
        await tx.campaignProfile.update({ where: { id: previous.campaignProfileId }, data: { isActive: true } });
        await tx.campaignPeriod.create({ data: { campaignProfileId: previous.campaignProfileId, clientBudgetPeriodId: next.id, budget: Number(entry.budget), startsOn: targetMonth, endDate } });
      }

      const continuedIds = new Set(continuing.map((entry: any) => Number(entry.campaignId)));
      const stoppedIds = current.campaigns.filter(period => !continuedIds.has(period.campaignProfileId)).map(period => period.campaignProfileId);
      if (stoppedIds.length) await tx.campaignProfile.updateMany({ where: { id: { in: stoppedIds } }, data: { isActive: false } });
      await tx.notification.updateMany({ where: { entityType: 'CLIENT_BUDGET_PERIOD', entityId: String(current.id), resolvedAt: null }, data: { resolvedAt: new Date() } });
      return next;
    });
    await createRolloverNotification(client.userId, result);
    return res.status(201).json({ period: result, carryOut, effectiveBudget });
  } catch (error) {
    console.error('Rollover error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to roll over budget period' });
  }
});

router.post('/clients/:id/pauses', async (req: AuthRequest, res: Response) => {
  if (!CAMPAIGN_CYCLES_ENABLED) return res.status(409).json({ error: 'Campaign cycles v2 is not enabled' });
  const client = await getOwnedClient(Number(req.params.id), req.userId!);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const profiles = await prisma.campaignProfile.findMany({ where: { clientId: client.id, isActive: true, periods: { some: { status: 'OPEN' } } }, select: { id: true } });
  return createPause(client.id, profiles.map(profile => profile.id), req.body, req.userId!, 'CLIENT', res);
});

router.post('/campaigns/:id/pauses', async (req: AuthRequest, res: Response) => {
  if (!CAMPAIGN_CYCLES_ENABLED) return res.status(409).json({ error: 'Campaign cycles v2 is not enabled' });
  const profile = await getOwnedProfile(Number(req.params.id), req.userId!);
  if (!profile) return res.status(404).json({ error: 'Campaign not found' });
  const open = await prisma.campaignPeriod.findFirst({ where: { campaignProfileId: profile.id, status: 'OPEN' } });
  if (!open) return res.status(400).json({ error: 'แคมเปญนี้ไม่มีรอบที่กำลังใช้งาน' });
  return createPause(profile.clientId, [profile.id], req.body, req.userId!, 'CAMPAIGN', res);
});

router.patch('/pause-events/:id/cancel', async (req: AuthRequest, res: Response) => {
  if (!CAMPAIGN_CYCLES_ENABLED) return res.status(409).json({ error: 'Campaign cycles v2 is not enabled' });
  const pauseId = String(req.params.id);
  const pause = await prisma.pauseEvent.findUnique({ where: { id: pauseId } });
  if (!pause || !(await getOwnedClient(pause.clientId, req.userId!))) return res.status(404).json({ error: 'Pause event not found' });
  if (pause.status === 'CANCELLED') return res.status(400).json({ error: 'รายการนี้ถูกยกเลิกแล้ว' });
  const updated = await prisma.$transaction(async tx => {
    const event = await tx.pauseEvent.update({ where: { id: pause.id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
    await tx.notification.updateMany({ where: { entityType: 'PAUSE_EVENT', entityId: pause.id, resolvedAt: null }, data: { resolvedAt: new Date() } });
    return event;
  });
  return res.json(updated);
});

router.get('/notifications', async (req: AuthRequest, res: Response) => {
  if (!CAMPAIGN_CYCLES_ENABLED) return res.json([]);
  const notifications = await prisma.notification.findMany({ where: { userId: req.userId, resolvedAt: null }, orderBy: [{ isRead: 'asc' }, { dueOn: 'asc' }], take: 100 });
  return res.json(notifications);
});

router.patch('/notifications/:id/read', async (req: AuthRequest, res: Response) => {
  const notification = await prisma.notification.findFirst({ where: { id: String(req.params.id), userId: req.userId } });
  if (!notification) return res.status(404).json({ error: 'Notification not found' });
  return res.json(await prisma.notification.update({ where: { id: notification.id }, data: { isRead: true } }));
});

export default router;
