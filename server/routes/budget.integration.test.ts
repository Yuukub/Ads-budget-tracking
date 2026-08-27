import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { createBudgetRouter } from './budget.js';

type UnknownRecord = Record<string, unknown>;

function ledgerRecord(overrides: UnknownRecord = {}): UnknownRecord {
  return {
    id: 1,
    userId: 1,
    clientName: 'นำแสง',
    date: new Date('2026-08-27T00:00:00.000Z'),
    budgetMonth: new Date('2026-09-01T00:00:00.000Z'),
    type: 'RECEIVED',
    amount: 13_912,
    usableAmount: 13_000,
    platform: null,
    note: null,
    createdAt: new Date('2026-08-27T00:00:00.000Z'),
    updatedAt: new Date('2026-08-27T00:00:00.000Z'),
    ...overrides,
  };
}

function fakeDatabase(initial = [ledgerRecord()]) {
  let records = [...initial];
  const budgetLog = {
    findMany: async ({ where }: { where: UnknownRecord }) => records.filter(record => {
      if (record.userId !== where.userId) return false;
      const field = where.budgetMonth ? 'budgetMonth' : where.date ? 'date' : null;
      if (!field) return true;
      const range = where[field] as { gte: Date; lt: Date };
      const value = record[field] as Date;
      return value >= range.gte && value < range.lt;
    }),
    findUnique: async ({ where }: { where: { id: number } }) => records.find(record => record.id === where.id) ?? null,
    create: async ({ data }: { data: UnknownRecord }) => {
      const created = ledgerRecord({ ...data, id: records.length + 1 });
      records.push(created);
      return created;
    },
    update: async ({ where, data }: { where: { id: number }; data: UnknownRecord }) => {
      const index = records.findIndex(record => record.id === where.id);
      records[index] = { ...records[index], ...data, updatedAt: new Date() };
      return records[index];
    },
    delete: async ({ where }: { where: { id: number } }) => {
      const deleted = records.find(record => record.id === where.id)!;
      records = records.filter(record => record.id !== where.id);
      return deleted;
    },
  };
  return { database: { budgetLog } as unknown as typeof prisma, records: () => records };
}

async function withApi(database: typeof prisma, run: (baseUrl: string, token: (userId: number) => string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use('/api/budget', createBudgetRouter(database));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}/api/budget`, userId => jwt.sign({ userId }, process.env.JWT_SECRET || 'secret'));
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

test('a prepaid September entry is selected by budget month and by its real August date without duplication', async () => {
  const { database } = fakeDatabase();
  await withApi(database, async (baseUrl, token) => {
    const headers = auth(token(1));
    const septemberBudget = await fetch(`${baseUrl}?basis=budget&startMonth=2026-09&endMonth=2026-09`, { headers });
    assert.equal((await septemberBudget.json() as unknown[]).length, 1);

    const augustBudget = await fetch(`${baseUrl}?basis=budget&startMonth=2026-08&endMonth=2026-08`, { headers });
    assert.equal((await augustBudget.json() as unknown[]).length, 0);

    const augustTransactions = await fetch(`${baseUrl}?basis=transaction&startMonth=2026-08&endMonth=2026-08`, { headers });
    assert.equal((await augustTransactions.json() as unknown[]).length, 1);
  });
});

test('create defaults budget month and update can assign another month', async () => {
  const { database, records } = fakeDatabase([]);
  await withApi(database, async (baseUrl, token) => {
    const headers = auth(token(1));
    const payload = { clientName: 'นำแสง', date: '2026-08-27', type: 'RECEIVED', amount: 13_912, usableAmount: 13_000 };
    const created = await fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
    assert.equal(created.status, 201);
    assert.equal((records()[0].budgetMonth as Date).toISOString().slice(0, 10), '2026-08-01');

    const updated = await fetch(`${baseUrl}/1`, { method: 'PUT', headers, body: JSON.stringify({ ...payload, budgetMonth: '2026-09' }) });
    assert.equal(updated.status, 200);
    assert.equal((records()[0].date as Date).toISOString().slice(0, 10), '2026-08-27');
    assert.equal((records()[0].budgetMonth as Date).toISOString().slice(0, 10), '2026-09-01');
  });
});

test('another user cannot update a ledger entry', async () => {
  const { database } = fakeDatabase();
  await withApi(database, async (baseUrl, token) => {
    const response = await fetch(`${baseUrl}/1`, {
      method: 'PUT',
      headers: auth(token(2)),
      body: JSON.stringify({ clientName: 'นำแสง', date: '2026-08-27', budgetMonth: '2026-09', type: 'RECEIVED', amount: 13_912 }),
    });
    assert.equal(response.status, 403);
  });
});
