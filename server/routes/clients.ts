import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, AuthRequest, adminCheckMiddleware } from '../middleware/auth.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Helper to parse activeDays from JSON string
function parseCampaignActiveDays(campaign: any) {
  return {
    ...campaign,
    activeDays: campaign.activeDays ? JSON.parse(campaign.activeDays) : null,
  };
}

// Get all clients with campaigns (ไม่รวม archived)
// Admin can view other users' data by providing ?userId=xxx
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    // Check if admin is requesting to view another user's data
    const targetUserId = req.query.userId ? parseInt(req.query.userId as string) : null;
    let effectiveUserId = req.userId!;

    if (targetUserId && targetUserId !== req.userId) {
      // Verify admin status
      const currentUser = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { role: true }
      });

      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required to view other users\' data' });
      }

      effectiveUserId = targetUserId;
    }

    const clients = await prisma.client.findMany({
      where: { userId: effectiveUserId },
      include: {
        campaigns: {
          where: { isArchived: false }, // filter out archived
          orderBy: { endDate: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Calculate allocated budget for each client (เฉพาะแคมเปญที่ไม่ archived)
    const clientsWithStats = clients.map(client => {
      const campaigns = client.campaigns.map(parseCampaignActiveDays);
      const allocated = campaigns.reduce((sum, c) => sum + c.budget, 0);
      const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
      const effectiveBudget = client.totalBudget + client.carryOver; // งบที่ใช้ได้จริง
      return {
        ...client,
        campaigns,
        allocated,
        unallocated: effectiveBudget - allocated,
        totalSpent,
        effectiveBudget,
      };
    });

    res.json(clientsWithStats);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single client (ไม่รวม archived campaigns)
// Admin can view other users' clients by providing ?userId=xxx
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    // Check if admin is requesting to view another user's data
    const targetUserId = req.query.userId ? parseInt(req.query.userId as string) : null;
    let effectiveUserId = req.userId!;

    if (targetUserId && targetUserId !== req.userId) {
      // Verify admin status
      const currentUser = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { role: true }
      });

      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required to view other users\' data' });
      }

      effectiveUserId = targetUserId;
    }

    const client = await prisma.client.findFirst({
      where: {
        id: parseInt(req.params.id),
        userId: effectiveUserId,
      },
      include: {
        campaigns: {
          where: { isArchived: false },
          orderBy: { endDate: 'asc' },
        },
      },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const campaigns = client.campaigns.map(parseCampaignActiveDays);
    const allocated = campaigns.reduce((sum, c) => sum + c.budget, 0);
    const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
    const effectiveBudget = client.totalBudget + client.carryOver;

    res.json({
      ...client,
      campaigns,
      allocated,
      unallocated: effectiveBudget - allocated,
      totalSpent,
      effectiveBudget,
    });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get client history (archived campaigns)
// Admin can view other users' client history by providing ?userId=xxx
router.get('/:id/history', async (req: AuthRequest, res: Response) => {
  try {
    const clientId = parseInt(req.params.id);

    // Check if admin is requesting to view another user's data
    const targetUserId = req.query.userId ? parseInt(req.query.userId as string) : null;
    let effectiveUserId = req.userId!;

    if (targetUserId && targetUserId !== req.userId) {
      // Verify admin status
      const currentUser = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { role: true }
      });

      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required to view other users\' data' });
      }

      effectiveUserId = targetUserId;
    }

    // Check ownership
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId: effectiveUserId },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get archived campaigns
    const archivedCampaigns = await prisma.campaign.findMany({
      where: {
        clientId,
        isArchived: true,
      },
      orderBy: { archivedAt: 'desc' },
    });

    res.json(archivedCampaigns.map(parseCampaignActiveDays));
  } catch (error) {
    console.error('Get client history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset budget (เติมงบใหม่)
// Admin can reset budget for other users' clients by providing ?userId=xxx
router.post('/:id/reset-budget', async (req: AuthRequest, res: Response) => {
  try {
    const clientId = parseInt(req.params.id);
    const { newBudget } = req.body;

    if (!newBudget || newBudget <= 0) {
      return res.status(400).json({ error: 'Valid new budget is required' });
    }

    // Check if admin is requesting to modify another user's data
    const targetUserId = req.query.userId ? parseInt(req.query.userId as string) : null;
    let effectiveUserId = req.userId!;

    if (targetUserId && targetUserId !== req.userId) {
      // Verify admin status
      const currentUser = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { role: true }
      });

      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required to modify other users\' data' });
      }

      effectiveUserId = targetUserId;
    }

    // Check ownership
    const existingClient = await prisma.client.findFirst({
      where: { id: clientId, userId: effectiveUserId },
      include: {
        campaigns: {
          where: { isArchived: false },
        },
      },
    });

    if (!existingClient) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // ตรวจสอบว่ามีแคมเปญที่ยังไม่ archive อยู่ไหม
    const activeCampaigns = existingClient.campaigns.filter(c => !c.isArchived);
    if (activeCampaigns.length > 0) {
      return res.status(400).json({
        error: 'กรุณาเก็บประวัติแคมเปญทั้งหมดก่อนเติมงบใหม่',
        activeCampaigns: activeCampaigns.length,
      });
    }

    // อัพเดท totalBudget และ reset carryOver หลังจากหักยอดยกมาแล้ว
    // carryOver จะถูกรวมเข้ากับงบใหม่แล้ว reset เป็น 0
    const effectiveBudget = newBudget + existingClient.carryOver;

    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: {
        totalBudget: effectiveBudget, // งบใหม่ + carryOver (ถ้า carryOver เป็นลบก็จะหักออก)
        carryOver: 0, // reset carryOver
      },
      include: {
        campaigns: {
          where: { isArchived: false },
        },
      },
    });

    res.json({
      ...updatedClient,
      allocated: 0,
      unallocated: updatedClient.totalBudget,
      totalSpent: 0,
      effectiveBudget: updatedClient.totalBudget,
      message: `เติมงบใหม่สำเร็จ งบที่ใช้ได้: ${effectiveBudget.toLocaleString()} บาท`,
    });
  } catch (error) {
    console.error('Reset budget error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create client
// Admin can create client for other users by providing ?userId=xxx
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, totalBudget, logo } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check if admin is creating for another user
    const targetUserId = req.query.userId ? parseInt(req.query.userId as string) : null;
    let effectiveUserId = req.userId!;

    if (targetUserId && targetUserId !== req.userId) {
      // Verify admin status
      const currentUser = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { role: true }
      });

      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required to create for other users' });
      }

      effectiveUserId = targetUserId;
    }

    const client = await prisma.client.create({
      data: {
        name,
        totalBudget: totalBudget || 0,
        logo: logo || null,
        carryOver: 0,
        userId: effectiveUserId,
      },
    });

    res.status(201).json({
      ...client,
      allocated: 0,
      unallocated: client.totalBudget,
      totalSpent: 0,
      effectiveBudget: client.totalBudget,
      campaigns: [],
    });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update client
// Admin can update other users' clients by providing ?userId=xxx
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, totalBudget, logo } = req.body;
    const clientId = parseInt(req.params.id);

    // Check if admin is updating another user's data
    const targetUserId = req.query.userId ? parseInt(req.query.userId as string) : null;
    let effectiveUserId = req.userId!;

    if (targetUserId && targetUserId !== req.userId) {
      // Verify admin status
      const currentUser = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { role: true }
      });

      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required to modify other users\' data' });
      }

      effectiveUserId = targetUserId;
    }

    // Check ownership
    const existingClient = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId: effectiveUserId,
      },
      include: {
        campaigns: {
          where: { isArchived: false },
        },
      },
    });

    if (!existingClient) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Validate total budget is not less than allocated (เฉพาะ active campaigns)
    const allocated = existingClient.campaigns.reduce((sum, c) => sum + c.budget, 0);
    const effectiveBudget = (totalBudget !== undefined ? totalBudget : existingClient.totalBudget) + existingClient.carryOver;

    if (totalBudget !== undefined && effectiveBudget < allocated) {
      return res.status(400).json({
        error: `งบที่ใช้ได้ (${effectiveBudget}) น้อยกว่างบที่จัดสรรไปแล้ว (${allocated})`,
      });
    }

    const client = await prisma.client.update({
      where: { id: clientId },
      data: {
        ...(name && { name }),
        ...(totalBudget !== undefined && { totalBudget }),
        ...(logo !== undefined && { logo: logo || null }),
      },
      include: {
        campaigns: {
          where: { isArchived: false },
        },
      },
    });

    const totalSpent = client.campaigns.reduce((sum, c) => sum + c.spent, 0);
    const newEffectiveBudget = client.totalBudget + client.carryOver;

    res.json({
      ...client,
      allocated,
      unallocated: newEffectiveBudget - allocated,
      totalSpent,
      effectiveBudget: newEffectiveBudget,
    });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete client
// Admin can delete other users' clients by providing ?userId=xxx
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const clientId = parseInt(req.params.id);
    const { deleteAllHistory } = req.body || {};

    // Check if admin is deleting another user's data
    const targetUserId = req.query.userId ? parseInt(req.query.userId as string) : null;
    let effectiveUserId = req.userId!;

    if (targetUserId && targetUserId !== req.userId) {
      // Verify admin status
      const currentUser = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { role: true }
      });

      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required to delete other users\' data' });
      }

      effectiveUserId = targetUserId;
    }

    // Check ownership
    const existingClient = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId: effectiveUserId,
      },
    });

    if (!existingClient) {
      return res.status(404).json({ error: 'Client not found' });
    }

    if (deleteAllHistory) {
      // ลบทุกอย่างรวมถึงประวัติ
      await prisma.campaign.deleteMany({
        where: { clientId },
      });
    } else {
      // เก็บชื่อลูกค้าไว้ในแคมเปญที่ archived ก่อนลบลูกค้า
      await prisma.campaign.updateMany({
        where: {
          clientId,
          isArchived: true,
        },
        data: {
          clientName: existingClient.name,
          clientId: null, // ตัดความสัมพันธ์
        },
      });

      // ลบแคมเปญที่ยังไม่ archived (active campaigns)
      await prisma.campaign.deleteMany({
        where: {
          clientId,
          isArchived: false,
        },
      });
    }

    // ลบลูกค้า
    await prisma.client.delete({ where: { id: clientId } });

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
