import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { encryptNoteSecret } from '../lib/noteSecrets.js';
import { createNotesRouter } from './notes.js';

type UnknownRecord = Record<string, unknown>;

const users = {
  1: { id: 1, name: 'Owner', email: 'owner@example.com', status: 'active' },
  2: { id: 2, name: 'Reader', email: 'reader@example.com', status: 'active' },
};

function noteRecord(overrides: UnknownRecord = {}) {
  const now = new Date('2026-08-25T00:00:00.000Z');
  return {
    id: 'note-1', ownerId: 1, category: 'GENERAL', title: 'API Note', content: '', tags: [], isPinned: false,
    clientName: null, host: null, loginUrl: null, username: null, secretCiphertext: null, secretIv: null,
    secretAuthTag: null, secretKeyVersion: null, contentCiphertext: null, contentIv: null, contentAuthTag: null,
    contentKeyVersion: null, secureContentLineCount: 0, taskStatus: null, priority: null, dueOn: null, completedAt: null,
    createdAt: now, updatedAt: now, owner: users[1], shares: [], links: [], ...overrides,
  };
}

function fakeDatabase(overrides: UnknownRecord = {}) {
  const database: UnknownRecord = {
    note: {
      findUnique: async () => noteRecord(),
      findMany: async () => [],
      count: async () => 0,
      create: async ({ data }: { data: UnknownRecord }) => noteRecord(data),
      findUniqueOrThrow: async () => noteRecord(),
      update: async () => noteRecord(),
      delete: async () => noteRecord(),
    },
    noteShare: {
      createMany: async () => ({ count: 0 }), deleteMany: async () => ({ count: 0 }), updateMany: async () => ({ count: 0 }),
      upsert: async () => ({ noteId: 'note-1', userId: 2, canViewSecret: false, createdAt: new Date(), user: users[2] }),
      update: async () => ({ noteId: 'note-1', userId: 2, canViewSecret: false, createdAt: new Date(), user: users[2] }),
      delete: async () => ({}),
    },
    noteLink: { createMany: async () => ({ count: 0 }), deleteMany: async () => ({ count: 0 }) },
    noteSecretAccessLog: { create: async () => ({}) },
    user: {
      findMany: async () => [users[2]],
      findFirst: async () => users[2],
    },
    ...overrides,
  };
  database.$transaction = async (operation: unknown) => Array.isArray(operation)
    ? Promise.all(operation)
    : (operation as (transaction: UnknownRecord) => Promise<unknown>)(database);
  return database as unknown as typeof prisma;
}

async function withApi(database: typeof prisma, run: (baseUrl: string, token: (userId: number) => string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use('/api', createNotesRouter(database));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}/api`, (userId) => jwt.sign({ userId }, process.env.JWT_SECRET || 'secret'));
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

test('notes API requires authentication', async () => {
  await withApi(fakeDatabase(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/notes`);
    assert.equal(response.status, 401);
  });
});

test('create Note stores recipients inside the same transaction and omits ciphertext from response', async () => {
  let transactionCalled = false;
  let createdShares: UnknownRecord[] = [];
  let saved = noteRecord();
  const database = fakeDatabase();
  const transactionDatabase = database as unknown as UnknownRecord;
  transactionDatabase.note = {
    ...(transactionDatabase.note as UnknownRecord),
    create: async ({ data }: { data: UnknownRecord }) => { saved = noteRecord(data); return saved; },
    findUniqueOrThrow: async () => ({ ...saved, owner: users[1], shares: createdShares.map((share) => ({ ...share, createdAt: new Date(), user: users[2] })) }),
  };
  transactionDatabase.noteShare = {
    ...(transactionDatabase.noteShare as UnknownRecord),
    createMany: async ({ data }: { data: UnknownRecord[] }) => { createdShares = data; return { count: data.length }; },
  };
  transactionDatabase.$transaction = async (operation: (transaction: UnknownRecord) => Promise<unknown>) => {
    transactionCalled = true;
    return operation(transactionDatabase);
  };

  await withApi(database, async (baseUrl, token) => {
    const response = await fetch(`${baseUrl}/notes`, {
      method: 'POST', headers: auth(token(1)), body: JSON.stringify({ category: 'GENERAL', title: 'บันทึกทดสอบ', content: 'เนื้อหา', shares: [{ userId: 2, canViewSecret: false }] }),
    });
    assert.equal(response.status, 201);
    const body = await response.json() as UnknownRecord;
    assert.equal(transactionCalled, true);
    assert.equal(createdShares.length, 1);
    assert.equal(body.secretCiphertext, undefined);
    assert.equal(body.secretIv, undefined);
    assert.equal(body.secretAuthTag, undefined);
  });
});

test('creating secure content clears plain content before writing and never returns ciphertext', async () => {
  process.env.NOTES_ENCRYPTION_KEY_V1 = Buffer.alloc(32, 8).toString('base64');
  let saved = noteRecord();
  const database = fakeDatabase();
  const transactionDatabase = database as unknown as UnknownRecord;
  transactionDatabase.note = {
    ...(transactionDatabase.note as UnknownRecord),
    create: async ({ data }: { data: UnknownRecord }) => { saved = noteRecord(data); return saved; },
    findUniqueOrThrow: async () => saved,
  };
  transactionDatabase.$transaction = async (operation: (transaction: UnknownRecord) => Promise<unknown>) => operation(transactionDatabase);

  await withApi(database, async (baseUrl, token) => {
    const response = await fetch(`${baseUrl}/notes`, {
      method: 'POST', headers: auth(token(1)),
      body: JSON.stringify({ category: 'GENERAL', title: 'Gmail ลับ', content: 'must not persist', secureContent: 'one@example.com\nsecret value' }),
    });
    assert.equal(response.status, 201);
    const body = await response.json() as UnknownRecord;
    assert.equal(saved.content, '');
    assert.notEqual(saved.contentCiphertext, 'one@example.com\nsecret value');
    assert.equal(body.contentCiphertext, undefined);
    assert.equal(body.content, '');
  });
});

test('updating secure content rejects replace and delete in the same request', async () => {
  process.env.NOTES_ENCRYPTION_KEY_V1 = Buffer.alloc(32, 10).toString('base64');
  let updateCalled = false;
  const database = fakeDatabase();
  const transactionDatabase = database as unknown as UnknownRecord;
  transactionDatabase.note = {
    ...(transactionDatabase.note as UnknownRecord),
    findUnique: async () => noteRecord(),
    update: async () => { updateCalled = true; return noteRecord(); },
  };

  await withApi(database, async (baseUrl, token) => {
    const response = await fetch(`${baseUrl}/notes/note-1`, {
      method: 'PATCH', headers: auth(token(1)),
      body: JSON.stringify({ secureContent: 'replacement secret', clearSecureContent: true }),
    });
    assert.equal(response.status, 400);
    assert.equal(updateCalled, false);
  });
});

test('shared recipient can read but cannot update Note', async () => {
  const sharedNote = noteRecord({ shares: [{ noteId: 'note-1', userId: 2, canViewSecret: false, createdAt: new Date(), user: users[2] }] });
  const database = fakeDatabase({ note: { findUnique: async () => sharedNote } });
  await withApi(database, async (baseUrl, token) => {
    const read = await fetch(`${baseUrl}/notes/note-1`, { headers: auth(token(2)) });
    assert.equal(read.status, 200);
    const update = await fetch(`${baseUrl}/notes/note-1`, { method: 'PATCH', headers: auth(token(2)), body: JSON.stringify({ title: 'แก้ไม่ได้' }) });
    assert.equal(update.status, 403);
  });
});

test('share endpoint rejects string false instead of treating it as true', async () => {
  let upsertCalled = false;
  const database = fakeDatabase({
    noteShare: { upsert: async () => { upsertCalled = true; return {}; } },
  });
  await withApi(database, async (baseUrl, token) => {
    const response = await fetch(`${baseUrl}/notes/note-1/shares`, {
      method: 'POST', headers: auth(token(1)), body: JSON.stringify({ userId: 2, canViewSecret: 'false' }),
    });
    assert.equal(response.status, 400);
    assert.equal(upsertCalled, false);
  });
});

test('revoking secret permission takes effect immediately', async () => {
  const encodedKey = Buffer.alloc(32, 4).toString('base64');
  process.env.NOTES_ENCRYPTION_KEY_V1 = encodedKey;
  const encrypted = encryptNoteSecret('instant-secret', encodedKey);
  let canViewSecret = true;
  const currentNote = () => noteRecord({
    category: 'ACCESS', secretCiphertext: encrypted.ciphertext, secretIv: encrypted.iv,
    secretAuthTag: encrypted.authTag, secretKeyVersion: encrypted.keyVersion,
    shares: [{ noteId: 'note-1', userId: 2, canViewSecret, createdAt: new Date(), user: users[2] }],
  });
  const database = fakeDatabase({
    note: { findUnique: async () => currentNote() },
    noteShare: {
      update: async ({ data }: { data: { canViewSecret: boolean } }) => {
        canViewSecret = data.canViewSecret;
        return { noteId: 'note-1', userId: 2, canViewSecret, createdAt: new Date(), user: users[2] };
      },
    },
  });
  await withApi(database, async (baseUrl, token) => {
    const allowed = await fetch(`${baseUrl}/notes/note-1/secret`, { headers: auth(token(2)) });
    assert.equal(allowed.status, 200);
    assert.equal((await allowed.json() as { secret: string }).secret, 'instant-secret');

    const revoke = await fetch(`${baseUrl}/notes/note-1/shares/2`, {
      method: 'PATCH', headers: auth(token(1)), body: JSON.stringify({ canViewSecret: false }),
    });
    assert.equal(revoke.status, 200);
    const denied = await fetch(`${baseUrl}/notes/note-1/secret`, { headers: auth(token(2)) });
    assert.equal(denied.status, 403);
  });
});

test('secure content is encrypted, excluded from ordinary responses, and audited when opened', async () => {
  const encodedKey = Buffer.alloc(32, 6).toString('base64');
  process.env.NOTES_ENCRYPTION_KEY_V1 = encodedKey;
  const encrypted = encryptNoteSecret('gmail-one@example.com\npassword: private', encodedKey);
  const auditData: UnknownRecord[] = [];
  const secured = noteRecord({
    content: '', contentCiphertext: encrypted.ciphertext, contentIv: encrypted.iv,
    contentAuthTag: encrypted.authTag, contentKeyVersion: encrypted.keyVersion, secureContentLineCount: 2,
  });
  const database = fakeDatabase({
    note: { findUnique: async () => secured },
    noteSecretAccessLog: { create: async ({ data }: { data: UnknownRecord }) => { auditData.push(data); return {}; } },
  });
  await withApi(database, async (baseUrl, token) => {
    const detail = await fetch(`${baseUrl}/notes/note-1`, { headers: auth(token(1)) });
    const ordinary = await detail.json() as UnknownRecord;
    assert.equal(ordinary.contentCiphertext, undefined);
    assert.equal(ordinary.contentAuthTag, undefined);
    assert.equal(ordinary.hasSecureContent, true);

    const revealed = await fetch(`${baseUrl}/notes/note-1/secure-content`, { headers: auth(token(1)) });
    assert.equal(revealed.status, 200);
    assert.equal((await revealed.json() as { content: string }).content, 'gmail-one@example.com\npassword: private');
  });
  assert.deepEqual(auditData[0], { noteId: 'note-1', actorUserId: 1, accessType: 'SECURE_CONTENT' });
});

test('tag filter and tag search are normalized to lowercase', async () => {
  let capturedWhere: UnknownRecord | undefined;
  const database = fakeDatabase({
    note: {
      findMany: async ({ where }: { where: UnknownRecord }) => { capturedWhere = where; return []; },
      count: async () => 0,
    },
  });
  await withApi(database, async (baseUrl, token) => {
    const response = await fetch(`${baseUrl}/notes?tag=IMPORTANT&q=HOST`, { headers: auth(token(1)) });
    assert.equal(response.status, 200);
    const serialized = JSON.stringify(capturedWhere);
    assert.match(serialized, /"has":"important"/);
    assert.match(serialized, /"has":"host"/);
  });
});
