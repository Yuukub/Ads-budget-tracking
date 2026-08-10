import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { CAMPAIGN_CYCLES_ENABLED, toClientCampaign } from '../lib/campaignCycles.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all archived campaigns for user (combined history)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, platform, search } = req.query;

    if (CAMPAIGN_CYCLES_ENABLED) {
      const where: any = {
        status: 'CLOSED',
        campaignProfile: { client: { userId: req.userId } },
      };
      if (clientId && clientId !== 'all') where.campaignProfile.clientId = parseInt(clientId as string);
      if (platform && platform !== 'all') where.campaignProfile.platform = platform as string;
      if (search) where.campaignProfile.name = { contains: search as string };

      const periods = await prisma.campaignPeriod.findMany({
        where,
        include: {
          campaignProfile: {
            include: {
              client: { select: { id: true, name: true, logo: true } },
              pauseCampaigns: { include: { pauseEvent: true } },
            },
          },
        },
        orderBy: { closedAt: 'desc' },
      });
      const campaigns = periods.map(period => ({
        ...toClientCampaign(period.campaignProfile, period, period.campaignProfile.pauseCampaigns.map(link => link.pauseEvent)),
        client: period.campaignProfile.client,
      }));
      const clients = await prisma.client.findMany({
        where: { userId: req.userId }, select: { id: true, name: true, logo: true },
      });
      const summary = campaigns.reduce((totals, campaign) => {
        totals.totalBudget += campaign.budget;
        totals.totalSpent += campaign.spent;
        const remaining = campaign.budget - campaign.spent;
        if (remaining >= 0) totals.totalRemaining += remaining;
        else totals.totalOverspent += Math.abs(remaining);
        return totals;
      }, { totalCampaigns: campaigns.length, totalBudget: 0, totalSpent: 0, totalRemaining: 0, totalOverspent: 0 });
      return res.json({ campaigns, clients, summary });
    }

    // Get all clients belonging to the user
    const userClients = await prisma.client.findMany({
      where: { userId: req.userId },
      select: { id: true, name: true, logo: true },
    });

    const clientIds = userClients.map(c => c.id);

    // Build where clause for campaigns
    // รวมทั้งแคมเปญที่มี client และที่ไม่มี client (ลูกค้าถูกลบไปแล้ว)
    const whereClause: any = {
      OR: [
        { clientId: { in: clientIds } },
        { clientId: null, clientName: { not: null } }, // แคมเปญที่ลูกค้าถูกลบ
      ],
      isArchived: true,
    };

    // Filter by specific client
    if (clientId && clientId !== 'all') {
      whereClause.OR = undefined;
      whereClause.clientId = parseInt(clientId as string);
    }

    // Filter by platform
    if (platform && platform !== 'all') {
      whereClause.platform = platform as string;
    }

    // Search by name
    if (search) {
      whereClause.name = {
        contains: search as string,
      };
    }

    // Get archived campaigns
    const campaigns = await prisma.campaign.findMany({
      where: whereClause,
      include: {
        client: {
          select: { id: true, name: true, logo: true },
        },
      },
      orderBy: { archivedAt: 'desc' },
    });

    // Map campaigns เพื่อเพิ่ม client info และ parse activeDays
    const mappedCampaigns = campaigns.map(c => ({
      ...c,
      activeDays: c.activeDays ? JSON.parse(c.activeDays) : null,
      client: c.client || (c.clientName ? { id: null, name: `${c.clientName} (ลบแล้ว)` } : null),
    }));

    // Calculate summary
    let totalBudget = 0;
    let totalSpent = 0;
    let totalRemaining = 0;
    let totalOverspent = 0;

    campaigns.forEach(c => {
      totalBudget += c.budget;
      totalSpent += c.spent;
      const remaining = c.budget - c.spent;
      if (remaining >= 0) {
        totalRemaining += remaining;
      } else {
        totalOverspent += Math.abs(remaining);
      }
    });

    res.json({
      campaigns: mappedCampaigns,
      clients: userClients, // For filter dropdown
      summary: {
        totalCampaigns: campaigns.length,
        totalBudget,
        totalSpent,
        totalRemaining,
        totalOverspent,
      },
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete history entry (archived campaign)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (CAMPAIGN_CYCLES_ENABLED) {
      return res.status(409).json({ error: 'ประวัติรอบแคมเปญ V2 เก็บไว้เป็น audit และไม่สามารถลบได้' });
    }
    const campaignId = parseInt(req.params.id as string);

    // Get all clients belonging to the user
    const userClients = await prisma.client.findMany({
      where: { userId: req.userId },
      select: { id: true },
    });
    const clientIds = userClients.map(c => c.id);

    // Check if campaign belongs to user (or is orphaned from deleted client)
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        isArchived: true,
        OR: [
          { clientId: { in: clientIds } },
          { clientId: null }, // orphaned campaigns
        ],
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'ไม่พบประวัติที่ต้องการลบ' });
    }

    await prisma.campaign.delete({ where: { id: campaignId } });

    res.json({ message: 'ลบประวัติสำเร็จ' });
  } catch (error) {
    console.error('Delete history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
