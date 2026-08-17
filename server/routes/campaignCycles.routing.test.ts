import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import express from 'express';
import campaignCycleRoutes from './campaignCycles.js';

test('campaign cycle auth only protects campaign cycle routes', async () => {
  const app = express();
  app.use('/api', campaignCycleRoutes);
  app.get('/api/public-probe', (_req, res) => {
    res.json({ ok: true });
  });

  const server = app.listen(0);
  await new Promise<void>(resolve => server.once('listening', resolve));

  try {
    const { port } = server.address() as AddressInfo;
    const publicResponse = await fetch(`http://127.0.0.1:${port}/api/public-probe`);
    assert.equal(publicResponse.status, 200, 'unrelated public API routes must not require authentication');

    const protectedResponse = await fetch(`http://127.0.0.1:${port}/api/notifications`);
    assert.equal(protectedResponse.status, 401, 'campaign cycle routes must still require authentication');
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
});
