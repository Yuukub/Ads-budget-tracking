import express from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all logs for the authenticated user
router.get('/', authMiddleware, async (req: any, res) => {
    try {
        const logs = await prisma.budgetLog.findMany({
            where: { userId: req.userId },
            orderBy: { date: 'desc' },
        });
        res.json(logs);
    } catch (error) {
        console.error('Error fetching budget logs:', error);
        res.status(500).json({ error: 'Failed to fetch budget logs' });
    }
});

// Create a new log
router.post('/', authMiddleware, async (req: any, res) => {
    try {
        const { clientName, date, type, amount, usableAmount, platform, note } = req.body;

        const log = await prisma.budgetLog.create({
            data: {
                userId: req.userId,
                clientName,
                date: new Date(date),
                type,
                amount: parseFloat(amount),
                usableAmount: usableAmount ? parseFloat(usableAmount) : null,
                platform,
                note,
            },
        });

        res.json(log);
    } catch (error) {
        console.error('Error creating budget log:', error);
        res.status(500).json({ error: 'Failed to create budget log' });
    }
});

// Delete a log
router.delete('/:id', authMiddleware, async (req: any, res) => {
    try {
        const { id } = req.params;

        // Verify ownership
        const log = await prisma.budgetLog.findUnique({
            where: { id: parseInt(id) },
        });

        if (!log || log.userId !== req.userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await prisma.budgetLog.delete({
            where: { id: parseInt(id) },
        });

        res.json({ message: 'Log deleted successfully' });
    } catch (error) {
        console.error('Error deleting budget log:', error);
        res.status(500).json({ error: 'Failed to delete budget log' });
    }
});

export default router;
