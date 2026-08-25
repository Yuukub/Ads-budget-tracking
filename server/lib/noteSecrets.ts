import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export interface EncryptedNoteSecret {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

const KEY_VERSION = 1;

function encryptionKey(encodedKey = process.env.NOTES_ENCRYPTION_KEY_V1): Buffer {
  if (!encodedKey) throw new Error('Notes encryption is not configured');
  const key = Buffer.from(encodedKey, 'base64');
  if (key.length !== 32) throw new Error('NOTES_ENCRYPTION_KEY_V1 must be a 32-byte base64 key');
  return key;
}

export function encryptNoteSecret(plaintext: string, encodedKey?: string): EncryptedNoteSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(encodedKey), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return { ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), authTag: cipher.getAuthTag().toString('base64'), keyVersion: KEY_VERSION };
}

export function decryptNoteSecret(secret: EncryptedNoteSecret, encodedKey?: string): string {
  if (secret.keyVersion !== KEY_VERSION) throw new Error('Unsupported notes encryption key version');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(encodedKey), Buffer.from(secret.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(secret.authTag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(secret.ciphertext, 'base64')), decipher.final()]).toString('utf8');
}
