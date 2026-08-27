import express from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { BudgetMonthRangeError, parseBudgetMonthRange } from '../lib/budgetPeriod.js';
import {
    BudgetLogValidationError,
    budgetLogWhere,
    parseBudgetFilterBasis,
    parseBudgetLogPayload,
} from '../lib/budgetLog.js';

function sendBudgetError(res: express.Response, error: unknown, fallback: string) {
    if (error instanceof BudgetMonthRangeError || error instanceof BudgetLogValidationError) {
        return res.status(400).json({ error: error.message });
    }
    console.error(fallback, error);
    return res.status(500).json({ error: fallback });
}

export function createBudgetRouter(database: typeof prisma = prisma) {
    const router = express.Router();

    router.get('/', authMiddleware, async (req: AuthRequest, res) => {
        try {
            const range = parseBudgetMonthRange(req.query.startMonth, req.query.endMonth);
            const basis = parseBudgetFilterBasis(req.query.basis);
            const logs = await database.budgetLog.findMany({
                where: budgetLogWhere(req.userId!, range, basis),
                orderBy: { date: 'desc' },
            });
            return res.json(logs);
        } catch (error) {
            return sendBudgetError(res, error, 'Failed to fetch budget logs');
        }
    });

    router.post('/', authMiddleware, async (req: AuthRequest, res) => {
        try {
            const payload = parseBudgetLogPayload(req.body || {});
            const log = await database.budgetLog.create({
                data: { userId: req.userId!, ...payload },
            });
            return res.status(201).json(log);
        } catch (error) {
            return sendBudgetError(res, error, 'Failed to create budget log');
        }
    });

    router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
        try {
            const id = Number(req.params.id);
            if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'รหัสรายการไม่ถูกต้อง' });
            const existing = await database.budgetLog.findUnique({ where: { id } });
            if (!existing || existing.userId !== req.userId) return res.status(403).json({ error: 'Not authorized' });

            const payload = parseBudgetLogPayload(req.body || {});
            const log = await database.budgetLog.update({ where: { id }, data: payload });
            return res.json(log);
        } catch (error) {
            return sendBudgetError(res, error, 'Failed to update budget log');
        }
    });

    router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
        try {
            const id = Number(req.params.id);
            if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'รหัสรายการไม่ถูกต้อง' });
            const log = await database.budgetLog.findUnique({ where: { id } });
            if (!log || log.userId !== req.userId) return res.status(403).json({ error: 'Not authorized' });
            await database.budgetLog.delete({ where: { id } });
            return res.json({ message: 'Log deleted successfully' });
        } catch (error) {
            return sendBudgetError(res, error, 'Failed to delete budget log');
        }
    });

    return router;
}

export default createBudgetRouter();
