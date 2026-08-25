import assert from 'node:assert/strict';
import test from 'node:test';
import { decryptNoteSecret, encryptNoteSecret } from './noteSecrets.js';

const testKey = Buffer.alloc(32, 7).toString('base64');

test('encrypts and decrypts a note secret', () => {
  const encrypted = encryptNoteSecret('p@ss word ไทย', testKey);
  assert.notEqual(encrypted.ciphertext, 'p@ss word ไทย');
  assert.equal(decryptNoteSecret(encrypted, testKey), 'p@ss word ไทย');
});

test('rejects a wrong key and tampered ciphertext', () => {
  const encrypted = encryptNoteSecret('secret', testKey);
  assert.throws(() => decryptNoteSecret(encrypted, Buffer.alloc(32, 9).toString('base64')));
  assert.throws(() => decryptNoteSecret({ ...encrypted, ciphertext: `${encrypted.ciphertext.slice(0, -2)}AA` }, testKey));
});
