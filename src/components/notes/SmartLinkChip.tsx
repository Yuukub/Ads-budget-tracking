import { ExternalLink, FileText, Folder, Link as LinkIcon, Table2 } from 'lucide-react';
import type { NoteLinkKind } from '../../types';

const styles: Record<NoteLinkKind, string> = {
  GOOGLE_SHEETS: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
  GOOGLE_DOCS: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200',
  GOOGLE_SLIDES: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
  GOOGLE_DRIVE: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200',
  WEBSITE: 'border-border bg-muted text-foreground',
};

function icon(kind: NoteLinkKind) {
  if (kind === 'GOOGLE_SHEETS') return <Table2 size={14} aria-hidden="true" />;
  if (kind === 'GOOGLE_DOCS') return <FileText size={14} aria-hidden="true" />;
  if (kind === 'GOOGLE_DRIVE') return <Folder size={14} aria-hidden="true" />;
  return <LinkIcon size={14} aria-hidden="true" />;
}

export function SmartLinkChip({ url, label, kind, className = '' }: { url: string; label: string; kind: NoteLinkKind; className?: string }) {
  return <a href={url} target="_blank" rel="noopener noreferrer" title={url} aria-label={`เปิด ${label} ในแท็บใหม่`} className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${styles[kind]} ${className}`}>
    {icon(kind)}<span className="truncate">{label}</span><ExternalLink size={12} aria-hidden="true" />
  </a>;
}
