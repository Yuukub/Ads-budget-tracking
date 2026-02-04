import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Helper: Check if user owns the client (with admin support)
async function checkClientOwnership(clientId: number, userId: number, isAdmin: boolean = false) {
  if (isAdmin) {
    // Admin can access any client
    const client = await prisma.client.findFirst({
      where: { id: clientId },
      include: { campaigns: true },
    });
    return client;
  }
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId },
    include: { campaigns: true },
  });
  return client;
}

// Helper: Check if user is admin
async function checkIsAdmin(userId: number): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });
  return user?.role === 'admin';
}

// Valid days of week
const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// Create campaign
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, name, budget, endDate, platform, googleAdsType, activeDays } = req.body;

    // Validate required fields
    if (!clientId || !name || budget === undefined || !endDate || !platform) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate platform
    if (!['google_ads', 'facebook_ads'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    // Validate googleAdsType if platform is google_ads
    if (platform === 'google_ads' && googleAdsType && !['search', 'display', 'pmax'].includes(googleAdsType)) {
      return res.status(400).json({ error: 'Invalid Google Ads type' });
    }

    // Validate activeDays if provided
    if (activeDays && Array.isArray(activeDays)) {
      const invalidDays = activeDays.filter((d: string) => !validDays.includes(d));
      if (invalidDays.length > 0) {
        return res.status(400).json({ error: `Invalid days: ${invalidDays.join(', ')}` });
      }
    }

    // Check if admin is creating for another user's client
    const targetUserId = req.query.userId ? parseInt(req.query.userId as string) : null;
    const isAdmin = await checkIsAdmin(req.userId!);

    if (targetUserId && targetUserId !== req.userId && !isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check client ownership (admin can access any client)
    const client = await checkClientOwnership(clientId, req.userId!, isAdmin);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Check available budget (round to 2 decimal places to avoid floating point errors)
    // Include carryOver in effective budget calculation
    const allocated = client.campaigns.reduce((sum, c) => sum + c.budget, 0);
    const effectiveBudget = Math.round((client.totalBudget + client.carryOver) * 100) / 100;
    const available = Math.round((effectiveBudget - allocated) * 100) / 100;

    if (budget > available) {
      return res.status(400).json({
        error: `Budget exceeds available amount. Available: ${available.toFixed(2)}`,
      });
    }

    const campaign = await prisma.campaign.create({
      data: {
        clientId,
        name,
        budget,
        spent: 0,
        endDate: new Date(endDate),
        platform,
        googleAdsType: platform === 'google_ads' ? googleAdsType : null,
        activeDays: activeDays ? JSON.stringify(activeDays) : null,
      },
    });

    // Parse activeDays back to array for response
    res.status(201).json({
      ...campaign,
      activeDays: campaign.activeDays ? JSON.parse(campaign.activeDays) : null,
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update campaign
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const campaignId = parseInt(req.params.id as string);
    const { name, budget, endDate, platform, googleAdsType, activeDays } = req.body;

    // Get existing campaign with client
    const existingCampaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { client: { include: { campaigns: true } } },
    });

    if (!existingCampaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Check if admin
    const isAdmin = await checkIsAdmin(req.userId!);

    // Check ownership (admin can modify any campaign)
    if (!isAdmin) {
      if (!existingCampaign.client) {
        return res.status(404).json({ error: 'Campaign client not found' });
      }
      if (existingCampaign.client.userId !== req.userId) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
    }

    // Validate budget changes
    if (budget !== undefined) {
      // Budget cannot be less than spent
      if (budget < existingCampaign.spent) {
        return res.status(400).json({
          error: `Budget cannot be less than spent amount (${existingCampaign.spent})`,
        });
      }

      // Check if new budget would exceed client's available budget
      if (existingCampaign.client) {
        const otherCampaignsBudget = existingCampaign.client.campaigns
          .filter(c => c.id !== campaignId)
          .reduce((sum, c) => sum + c.budget, 0);
        // Round to 2 decimal places to avoid floating point errors
        // Include carryOver in effective budget calculation
        const effectiveBudget = Math.round((existingCampaign.client.totalBudget + existingCampaign.client.carryOver) * 100) / 100;
        const available = Math.round((effectiveBudget - otherCampaignsBudget) * 100) / 100;

        if (budget > available) {
          return res.status(400).json({
            error: `Budget exceeds available amount. Available: ${available.toFixed(2)}`,
          });
        }
      }
    }

    // Validate platform
    if (platform && !['google_ads', 'facebook_ads'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    // Validate activeDays if provided
    if (activeDays && Array.isArray(activeDays)) {
      const invalidDays = activeDays.filter((d: string) => !validDays.includes(d));
      if (invalidDays.length > 0) {
        return res.status(400).json({ error: `Invalid days: ${invalidDays.join(', ')}` });
      }
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        ...(name && { name }),
        ...(budget !== undefined && { budget }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(platform && { platform }),
        ...(platform === 'google_ads' && { googleAdsType }),
        ...(platform === 'facebook_ads' && { googleAdsType: null }),
        ...(activeDays !== undefined && { activeDays: activeDays ? JSON.stringify(activeDays) : null }),
      },
    });

    // Parse activeDays back to array for response
    res.json({
      ...updatedCampaign,
      activeDays: updatedCampaign.activeDays ? JSON.parse(updatedCampaign.activeDays) : null,
    });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update spent amount
router.patch('/:id/spent', async (req: AuthRequest, res: Response) => {
  try {
    const campaignId = parseInt(req.params.id as string);
    const { spent } = req.body;

    if (spent === undefined || spent < 0) {
      return res.status(400).json({ error: 'Valid spent amount is required' });
    }

    // Get existing campaign
    const existingCampaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { client: true },
    });

    if (!existingCampaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Check if admin
    const isAdmin = await checkIsAdmin(req.userId!);

    // Check ownership (admin can modify any campaign)
    if (!isAdmin) {
      if (!existingCampaign.client) {
        return res.status(404).json({ error: 'Campaign client not found' });
      }
      if (existingCampaign.client.userId !== req.userId) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
    }

    // อนุญาตให้ spent เกิน budget ได้ (จะแสดงเป็นติดลบ)

    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: { spent },
    });

    // Parse activeDays back to array for response
    res.json({
      ...updatedCampaign,
      activeDays: updatedCampaign.activeDays ? JSON.parse(updatedCampaign.activeDays) : null,
    });
  } catch (error) {
    console.error('Update spent error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete campaign
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const campaignId = parseInt(req.params.id as string);

    // Get existing campaign
    const existingCampaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { client: true },
    });

    if (!existingCampaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Check if admin
    const isAdmin = await checkIsAdmin(req.userId!);

    // Check ownership (admin can delete any campaign)
    if (!isAdmin) {
      if (!existingCampaign.client) {
        return res.status(404).json({ error: 'Campaign client not found' });
      }
      if (existingCampaign.client.userId !== req.userId) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
    }

    await prisma.campaign.delete({ where: { id: campaignId } });

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Archive campaign (เก็บเข้าประวัติ)
router.post('/:id/archive', async (req: AuthRequest, res: Response) => {
  try {
    const campaignId = parseInt(req.params.id as string);

    // Get existing campaign
    const existingCampaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { client: true },
    });

    if (!existingCampaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Check if admin
    const isAdmin = await checkIsAdmin(req.userId!);

    // Check ownership (admin can archive any campaign)
    if (!isAdmin) {
      if (!existingCampaign.client) {
        return res.status(404).json({ error: 'Campaign client not found' });
      }
      if (existingCampaign.client.userId !== req.userId) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
    }

    // Already archived
    if (existingCampaign.isArchived) {
      return res.status(400).json({ error: 'Campaign is already archived' });
    }

    // คำนวณส่วนต่าง (ถ้าใช้เกิน = ติดลบ)
    const difference = existingCampaign.budget - existingCampaign.spent;
    // ถ้า difference < 0 หมายความว่าใช้เกิน → ต้องหักจาก carryOver

    // อัพเดท campaign เป็น archived และอัพเดท client.carryOver (ถ้ามี client)
    const transactionOperations: any[] = [
      prisma.campaign.update({
        where: { id: campaignId },
        data: {
          isArchived: true,
          archivedAt: new Date(),
        },
      })
    ];

    if (existingCampaign.clientId) {
      transactionOperations.push(
        prisma.client.update({
          where: { id: existingCampaign.clientId },
          data: {
            // เพิ่ม carryOver (ถ้าใช้เกิน difference จะเป็นลบ)
            carryOver: {
              increment: difference,
            },
          },
        })
      );
    }

    const [updatedCampaign] = await prisma.$transaction(transactionOperations);

    res.json({
      campaign: {
        ...updatedCampaign,
        activeDays: updatedCampaign.activeDays ? JSON.parse(updatedCampaign.activeDays) : null,
      },
      carryOverChange: difference,
      message: difference < 0
        ? `แคมเปญใช้งบเกิน ${Math.abs(difference).toLocaleString()} บาท จะหักจากงบเดือนถัดไป`
        : `เก็บประวัติสำเร็จ งบเหลือ ${difference.toLocaleString()} บาท`
    });
  } catch (error) {
    console.error('Archive campaign error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
