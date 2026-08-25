import assert from 'node:assert/strict';
import test from 'node:test';
import { notePermission } from './notePermissions.js';

const note = { ownerId: 1, shares: [{ userId: 2, canViewSecret: false }, { userId: 3, canViewSecret: true }] };

test('note access keeps edit ownership and secret permission separate', () => {
  assert.deepEqual(notePermission(note, 1), { isOwner: true, canRead: true, canViewSecret: true });
  assert.deepEqual(notePermission(note, 2), { isOwner: false, canRead: true, canViewSecret: false });
  assert.deepEqual(notePermission(note, 3), { isOwner: false, canRead: true, canViewSecret: true });
  assert.deepEqual(notePermission(note, 4), { isOwner: false, canRead: false, canViewSecret: false });
});
