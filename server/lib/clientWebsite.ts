export function normalizeWebsiteUrl(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new Error('URL เว็บไซต์ไม่ถูกต้อง');
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 2048) throw new Error('URL เว็บไซต์ต้องไม่เกิน 2,048 ตัวอักษร');

  const explicitScheme = trimmed.match(/^([a-z][a-z\d+.-]*):\/\//i)?.[1]?.toLowerCase();
  if (explicitScheme && !['http', 'https'].includes(explicitScheme)) {
    throw new Error('URL เว็บไซต์รองรับเฉพาะ http หรือ https');
  }
  if (/^(javascript|data|vbscript|file|mailto):/i.test(trimmed)) {
    throw new Error('URL เว็บไซต์รองรับเฉพาะ http หรือ https');
  }
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('URL เว็บไซต์ไม่ถูกต้อง');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('URL เว็บไซต์รองรับเฉพาะ http หรือ https');
  }
  return parsed.toString();
}
