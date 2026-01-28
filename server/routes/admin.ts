import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { adminMiddleware, AdminRequest } from '../middleware/adminAuth.js';

const router = Router();

// All routes require admin
router.use(adminMiddleware);

// GET /api/admin/dashboard - Get system-wide statistics
router.get('/dashboard', async (req: AdminRequest, res: Response) => {
  try {
    // Count users
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({ where: { status: 'active' } });
    const suspendedUsers = await prisma.user.count({ where: { status: 'suspended' } });

    // Count clients
    const totalClients = await prisma.client.count();

    // Count campaigns
    const totalCampaigns = await prisma.campaign.count({ where: { isArchived: false } });
    const archivedCampaigns = await prisma.campaign.count({ where: { isArchived: true } });

    // Calculate total budgets
    const budgetStats = await prisma.client.aggregate({
      _sum: {
        totalBudget: true,
      }
    });

    const spentStats = await prisma.campaign.aggregate({
      where: { isArchived: false },
      _sum: {
        spent: true,
        budget: true,
      }
    });

    // Count expiring campaigns (within 7 days)
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const expiringSoon = await prisma.campaign.count({
      where: {
        isArchived: false,
        endDate: {
          gte: now,
          lte: sevenDaysFromNow
        }
      }
    });

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers
      },
      clients: {
        total: totalClients
      },
      campaigns: {
        active: totalCampaigns,
        archived: archivedCampaigns,
        expiringSoon
      },
      budget: {
        totalBudget: budgetStats._sum.totalBudget || 0,
        totalAllocated: spentStats._sum.budget || 0,
        totalSpent: spentStats._sum.spent || 0
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// GET /api/admin/users - Get all users
router.get('/users', async (req: AdminRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            clients: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get campaign counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const campaignCount = await prisma.campaign.count({
          where: {
            client: {
              userId: user.id
            },
            isArchived: false
          }
        });

        return {
          ...user,
          clientCount: user._count.clients,
          campaignCount
        };
      })
    );

    res.json(usersWithStats);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT /api/admin/users/:id/role - Update user role
router.put('/users/:id/role', async (req: AdminRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' });
    }

    // Prevent changing own role
    if (userId === req.userId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true
      }
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// PUT /api/admin/users/:id/status - Update user status (suspend/activate)
router.put('/users/:id/status', async (req: AdminRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "active" or "suspended"' });
    }

    // Prevent suspending self
    if (userId === req.userId) {
      return res.status(400).json({ error: 'Cannot change your own status' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true
      }
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', async (req: AdminRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    // Prevent deleting self
    if (userId === req.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user (cascades to clients and campaigns)
    await prisma.user.delete({ where: { id: userId } });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
