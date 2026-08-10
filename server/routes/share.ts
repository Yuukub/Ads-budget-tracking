import { Router, Response, Request } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { BudgetMonthRangeError, parseBudgetMonthRange } from '../lib/budgetPeriod.js';

const router = Router();

// Helper: Generate secure random token
function generateToken(): string {
  return crypto.randomBytes(12).toString('base64url');
}

// Helper: Parse campaign activeDays
function parseCampaignActiveDays(campaign: any) {
  return {
    ...campaign,
    activeDays: campaign.activeDays ? JSON.parse(campaign.activeDays) : null,
  };
}

// ============================================
// Protected Routes (require authentication)
// ============================================

// Create share link
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, pageType, expiresAt, password, maxViews } = req.body;

    // Validate pageType
    if (pageType && !['home', 'budget', 'all'].includes(pageType)) {
      return res.status(400).json({ error: 'Invalid pageType. Must be "home", "budget", or "all"' });
    }

    // Generate secure token
    const token = generateToken();

    // Hash password if provided
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const shareLink = await prisma.shareLink.create({
      data: {
        userId: req.userId!,
        token,
        name: name || null,
        pageType: pageType || 'all',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        password: hashedPassword,
        maxViews: maxViews || null,
      },
    });

    res.status(201).json({
      id: shareLink.id,
      token: shareLink.token,
      name: shareLink.name,
      pageType: shareLink.pageType,
      expiresAt: shareLink.expiresAt,
      maxViews: shareLink.maxViews,
      viewCount: shareLink.viewCount,
      isActive: shareLink.isActive,
      hasPassword: !!shareLink.password,
      createdAt: shareLink.createdAt,
    });
  } catch (error) {
    console.error('Create share link error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get my share links
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const shareLinks = await prisma.shareLink.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { accessLogs: true },
        },
      },
    });

    const result = shareLinks.map((link) => ({
      id: link.id,
      token: link.token,
      name: link.name,
      pageType: link.pageType,
      expiresAt: link.expiresAt,
      maxViews: link.maxViews,
      viewCount: link.viewCount,
      isActive: link.isActive,
      hasPassword: !!link.password,
      accessCount: link._count.accessLogs,
      createdAt: link.createdAt,
      // Check status
      isExpired: link.expiresAt ? new Date() > link.expiresAt : false,
      isMaxedOut: link.maxViews ? link.viewCount >= link.maxViews : false,
    }));

    res.json(result);
  } catch (error) {
    console.error('Get share links error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get access logs for a share link
router.get('/:id/logs', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const shareLink = await prisma.shareLink.findFirst({
      where: { id, userId: req.userId },
    });

    if (!shareLink) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    const logs = await prisma.shareAccessLog.findMany({
      where: { shareLinkId: id as string },
      orderBy: { accessedAt: 'desc' },
      take: 100, // Limit to last 100 logs
    });

    res.json(logs);
  } catch (error) {
    console.error('Get access logs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update share link
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { name, expiresAt, password, maxViews, isActive } = req.body;

    const shareLink = await prisma.shareLink.findFirst({
      where: { id, userId: req.userId },
    });

    if (!shareLink) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    // Prepare update data
    const updateData: {
      name?: string | null;
      expiresAt?: Date | null;
      password?: string | null;
      maxViews?: number | null;
      isActive?: boolean;
    } = {};

    if (name !== undefined) updateData.name = name || null;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (maxViews !== undefined) updateData.maxViews = maxViews || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Handle password update
    if (password !== undefined) {
      updateData.password = password ? await bcrypt.hash(password, 10) : null;
    }

    const updated = await prisma.shareLink.update({
      where: { id },
      data: updateData,
    });

    res.json({
      id: updated.id,
      token: updated.token,
      name: updated.name,
      pageType: updated.pageType,
      expiresAt: updated.expiresAt,
      maxViews: updated.maxViews,
      viewCount: updated.viewCount,
      isActive: updated.isActive,
      hasPassword: !!updated.password,
      createdAt: updated.createdAt,
    });
  } catch (error) {
    console.error('Update share link error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete share link
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const shareLink = await prisma.shareLink.findFirst({
      where: { id, userId: req.userId },
    });

    if (!shareLink) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    await prisma.shareLink.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete share link error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// Public Routes (no authentication required)
// ============================================

// Validate share token
router.get('/:token/validate', async (req: Request, res: Response) => {
  try {
    const { token } = req.params as { token: string };
    const { password, skipLog } = req.query;

    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        user: {
          select: { name: true },
        },
      },
    }) as any;

    if (!shareLink) {
      return res.status(404).json({ error: 'ลิงค์ไม่ถูกต้องหรือถูกลบแล้ว' });
    }

    if (!shareLink.isActive) {
      return res.status(403).json({ error: 'ลิงค์นี้ถูกปิดใช้งานแล้ว' });
    }

    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      return res.status(403).json({ error: 'ลิงค์นี้หมดอายุแล้ว' });
    }

    // Only check maxViews for new sessions (skipLog !== 'true')
    // This allows navigation within the same session after the view was counted
    if (skipLog !== 'true' && shareLink.maxViews && shareLink.viewCount >= shareLink.maxViews) {
      return res.status(403).json({ error: 'ลิงค์นี้ถูกดูครบจำนวนครั้งแล้ว' });
    }

    // Check password if required
    if (shareLink.password) {
      if (!password) {
        return res.status(401).json({
          error: 'ต้องใส่รหัสผ่าน',
          requiresPassword: true,
        });
      }

      const isValid = await bcrypt.compare(password as string, shareLink.password);
      if (!isValid) {
        return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
      }
    }

    // Log access only if skipLog is not set (first visit in session)
    if (skipLog !== 'true') {
      await prisma.$transaction([
        prisma.shareLink.update({
          where: { id: shareLink.id },
          data: { viewCount: { increment: 1 } },
        }),
        prisma.shareAccessLog.create({
          data: {
            shareLinkId: shareLink.id,
            ipAddress: req.ip || req.headers['x-forwarded-for'] as string || null,
            userAgent: req.headers['user-agent'] || null,
          },
        }),
      ]);

      // Cleanup: Keep only the latest 100 logs per share link
      const logCount = await prisma.shareAccessLog.count({
        where: { shareLinkId: shareLink.id },
      });

      if (logCount > 100) {
        // Find the 100th newest log's accessedAt timestamp
        const oldestToKeep = await prisma.shareAccessLog.findMany({
          where: { shareLinkId: shareLink.id },
          orderBy: { accessedAt: 'desc' },
          skip: 99,
          take: 1,
          select: { accessedAt: true },
        });

        if (oldestToKeep.length > 0) {
          await prisma.shareAccessLog.deleteMany({
            where: {
              shareLinkId: shareLink.id,
              accessedAt: { lt: oldestToKeep[0].accessedAt },
            },
          });
        }
      }
    }

    res.json({
      valid: true,
      pageType: shareLink.pageType,
      ownerName: shareLink.user.name,
      name: shareLink.name,
    });
  } catch (error) {
    console.error('Validate share token error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get shared data
router.get('/:token/data', async (req: Request, res: Response) => {
  try {
    const { token } = req.params as { token: string };
    const { password, page } = req.query;

    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    }) as any;

    if (!shareLink) {
      return res.status(404).json({ error: 'ลิงค์ไม่ถูกต้องหรือถูกลบแล้ว' });
    }

    if (!shareLink.isActive) {
      return res.status(403).json({ error: 'ลิงค์นี้ถูกปิดใช้งานแล้ว' });
    }

    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      return res.status(403).json({ error: 'ลิงค์นี้หมดอายุแล้ว' });
    }

    if (shareLink.maxViews && shareLink.viewCount >= shareLink.maxViews) {
      return res.status(403).json({ error: 'ลิงค์นี้ถูกดูครบจำนวนครั้งแล้ว' });
    }

    // Check password if required
    if (shareLink.password) {
      if (!password) {
        return res.status(401).json({
          error: 'ต้องใส่รหัสผ่าน',
          requiresPassword: true,
        });
      }

      const isValid = await bcrypt.compare(password as string, shareLink.password);
      if (!isValid) {
        return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
      }
    }

    // Note: Access logging is now handled in validate endpoint

    // Fetch data based on page type
    const requestedPage = page as string || 'home';
    const userId = shareLink.user.id;

    if (requestedPage === 'home' && ['home', 'all'].includes(shareLink.pageType)) {
      // Get clients data
      const clients = await prisma.client.findMany({
        where: { userId },
        include: {
          campaigns: {
            where: { isArchived: false },
            orderBy: { endDate: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      });

      // Calculate stats for each client
      const clientsWithStats = clients.map((client) => {
        const campaigns = client.campaigns.map(parseCampaignActiveDays);
        const allocated = Math.round(campaigns.reduce((sum, c) => sum + c.budget, 0) * 100) / 100;
        const totalSpent = Math.round(campaigns.reduce((sum, c) => sum + c.spent, 0) * 100) / 100;
        const effectiveBudget = Math.round((client.totalBudget + client.carryOver) * 100) / 100;
        return {
          ...client,
          campaigns,
          allocated,
          unallocated: Math.round((effectiveBudget - allocated) * 100) / 100,
          totalSpent,
          effectiveBudget,
        };
      });

      return res.json({
        pageType: 'home',
        ownerName: shareLink.user.name,
        data: clientsWithStats,
      });
    }

    if (requestedPage === 'budget' && ['budget', 'all'].includes(shareLink.pageType)) {
      const range = parseBudgetMonthRange(req.query.startMonth, req.query.endMonth);
      // Get budget logs
      const budgetLogs = await prisma.budgetLog.findMany({
        where: {
          userId,
          ...(range ? { date: { gte: range.start, lt: range.end } } : {}),
        },
        orderBy: { date: 'asc' },
      });

      return res.json({
        pageType: 'budget',
        ownerName: shareLink.user.name,
        data: budgetLogs,
      });
    }

    return res.status(403).json({ error: 'ลิงค์นี้ไม่อนุญาตให้ดูหน้านี้' });
  } catch (error) {
    if (error instanceof BudgetMonthRangeError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Get shared data error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
