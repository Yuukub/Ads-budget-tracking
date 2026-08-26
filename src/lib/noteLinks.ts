import type { NoteLinkKind } from '../types';

export function getNoteLinkKind(url: string): NoteLinkKind | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'docs.google.com' && parsed.pathname.startsWith('/spreadsheets/')) return 'GOOGLE_SHEETS';
    if (parsed.hostname === 'docs.google.com' && parsed.pathname.startsWith('/document/')) return 'GOOGLE_DOCS';
    if (parsed.hostname === 'docs.google.com' && parsed.pathname.startsWith('/presentation/')) return 'GOOGLE_SLIDES';
    if (parsed.hostname === 'drive.google.com') return 'GOOGLE_DRIVE';
    return 'WEBSITE';
  } catch {
    return null;
  }
}

export function defaultNoteLinkLabel(url: string, kind = getNoteLinkKind(url)) {
  if (kind === 'GOOGLE_SHEETS') return 'Google Sheets';
  if (kind === 'GOOGLE_DOCS') return 'Google Docs';
  if (kind === 'GOOGLE_SLIDES') return 'Google Slides';
  if (kind === 'GOOGLE_DRIVE') return 'Google Drive';
  try { return new URL(url).hostname; } catch { return 'ลิงก์'; }
}
