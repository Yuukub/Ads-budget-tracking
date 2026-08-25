import { useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import { Check, Copy, Eye, EyeOff, LockKeyhole, Pencil, Pin, Plus, Search, Share2, Trash2, Users } from 'lucide-react';
import { notesApi } from '../api/api';
import { AppNote, NoteCategory, NoteFilters, NoteFormData, NotePriority, NoteShare, NoteShareUser, NoteTaskStatus } from '../types';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';

const categoryLabels: Record<NoteCategory, string> = {
  GENERAL: 'ทั่วไป', CLIENT_PROJECT: 'ลูกค้า/โปรเจกต์', ACCESS: 'โฮสต์/ข้อมูลเข้าสู่ระบบ', TASK: 'งานที่ต้องทำ',
};
const taskLabels: Record<NoteTaskStatus, string> = { TODO: 'ยังไม่ทำ', IN_PROGRESS: 'กำลังทำ', DONE: 'เสร็จแล้ว' };
const priorityLabels: Record<NotePriority, string> = { LOW: 'ต่ำ', MEDIUM: 'ปานกลาง', HIGH: 'สูง' };

type EditorState = {
  category: NoteCategory; title: string; content: string; tagsText: string; isPinned: boolean; clientName: string;
  host: string; loginUrl: string; username: string; secret: string; clearSecret: boolean;
  taskStatus: NoteTaskStatus; priority: NotePriority; dueOn: string;
};

const emptyEditor = (): EditorState => ({
  category: 'GENERAL', title: '', content: '', tagsText: '', isPinned: false, clientName: '', host: '', loginUrl: '', username: '', secret: '', clearSecret: false,
  taskStatus: 'TODO', priority: 'MEDIUM', dueOn: '',
});

const noteToEditor = (note: AppNote): EditorState => ({
  category: note.category, title: note.title, content: note.content, tagsText: note.tags.join(', '), isPinned: note.isPinned, clientName: note.clientName || '',
  host: note.host || '', loginUrl: note.loginUrl || '', username: note.username || '', secret: '', clearSecret: false,
  taskStatus: note.taskStatus || 'TODO', priority: note.priority || 'MEDIUM', dueOn: note.dueOn?.slice(0, 10) || '',
});

function errorMessage(error: unknown, fallback: string) {
  return error instanceof AxiosError ? String(error.response?.data?.error || fallback) : fallback;
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isOverdue(note: AppNote) {
  return note.category === 'TASK' && note.taskStatus !== 'DONE' && Boolean(note.dueOn) && new Date(`${note.dueOn!.slice(0, 10)}T00:00:00`) < new Date(new Date().toDateString());
}

function PlainText({ value }: { value: string }) {
  const pieces = value.split(/(https?:\/\/[^\s]+)/g);
  return <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{pieces.map((piece, index) => /^https?:\/\//.test(piece)
    ? <a key={index} href={piece} target="_blank" rel="noreferrer" className="text-primary underline break-all">{piece}</a>
    : piece)}</p>;
}

export function NotesPage() {
  const [data, setData] = useState<{ notes: AppNote[]; total: number; totalPages: number }>({ notes: [], total: 0, totalPages: 1 });
  const [filters, setFilters] = useState<NoteFilters>({ sort: 'pinned', scope: 'all', page: 1, limit: 24 });
  const [searchInput, setSearchInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [viewing, setViewing] = useState<AppNote | null>(null);
  const [editing, setEditing] = useState<AppNote | null>(null);
  const [editor, setEditor] = useState<EditorState>(emptyEditor());
  const [shares, setShares] = useState<NoteShare[]>([]);
  const [shareQuery, setShareQuery] = useState('');
  const [shareResults, setShareResults] = useState<NoteShareUser[]>([]);
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  const loadNotes = async () => {
    setLoading(true);
    try {
      const response = await notesApi.getAll(filters);
      setData(response);
    } catch (error) {
      alert(errorMessage(error, 'ไม่สามารถโหลด Note ได้'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadNotes(); }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const timer = window.setTimeout(() => setFilters((previous) => ({ ...previous, q: searchInput || undefined, page: 1 })), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);
  useEffect(() => {
    const timer = window.setTimeout(() => setFilters((previous) => ({ ...previous, tag: tagInput.trim() || undefined, page: 1 })), 300);
    return () => window.clearTimeout(timer);
  }, [tagInput]);
  useEffect(() => {
    if (shareQuery.trim().length < 2) { setShareResults([]); return; }
    const timer = window.setTimeout(async () => {
      try { setShareResults(await notesApi.searchUsers(shareQuery.trim())); } catch { setShareResults([]); }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [shareQuery]);

  const tags = useMemo(() => [...new Set(data.notes.flatMap((note) => note.tags))].sort(), [data.notes]);
  const updateFilter = (patch: Partial<NoteFilters>) => setFilters((previous) => ({ ...previous, ...patch, page: 1 }));
  const setField = <K extends keyof EditorState>(key: K, value: EditorState[K]) => setEditor((previous) => ({ ...previous, [key]: value }));

  const openCreate = () => {
    setEditing(null); setEditor(emptyEditor()); setShares([]); setShareQuery(''); setEditorOpen(true);
  };
  const openEdit = async (note: AppNote) => {
    try {
      const detail = await notesApi.getOne(note.id);
      setEditing(detail); setEditor(noteToEditor(detail)); setShares(detail.shares || []); setShareQuery(''); setEditorOpen(true);
    } catch (error) { alert(errorMessage(error, 'ไม่สามารถเปิด Note ได้')); }
  };
  const openView = async (note: AppNote) => {
    try { setViewing(await notesApi.getOne(note.id)); } catch (error) { alert(errorMessage(error, 'ไม่สามารถเปิด Note ได้')); }
  };

  const addRecipient = (user: NoteShareUser) => {
    if (shares.some((share) => share.userId === user.id)) return;
    setShares((previous) => [...previous, { userId: user.id, canViewSecret: false, createdAt: new Date().toISOString(), user }]);
    setShareQuery(''); setShareResults([]);
  };

  const buildPayload = (): NoteFormData => {
    const payload: NoteFormData = {
      category: editor.category, title: editor.title, content: editor.content,
      tags: editor.tagsText.split(',').map((tag) => tag.trim()).filter(Boolean), isPinned: editor.isPinned,
      clientName: editor.clientName || null,
    };
    if (editor.category === 'ACCESS') {
      payload.host = editor.host || null; payload.loginUrl = editor.loginUrl || null; payload.username = editor.username || null;
      if (editor.secret) payload.secret = editor.secret;
      if (editor.clearSecret) payload.clearSecret = true;
    }
    if (editor.category === 'TASK') {
      payload.taskStatus = editor.taskStatus; payload.priority = editor.priority; payload.dueOn = editor.dueOn || null;
    }
    return payload;
  };

  const syncShares = async (noteId: string, before: NoteShare[]) => {
    const desiredShares = editor.category === 'ACCESS' ? shares : shares.map((share) => ({ ...share, canViewSecret: false }));
    const beforeIds = new Set(before.map((share) => share.userId));
    const afterIds = new Set(desiredShares.map((share) => share.userId));
    await Promise.all(before.filter((share) => !afterIds.has(share.userId)).map((share) => notesApi.deleteShare(noteId, share.userId)));
    await Promise.all(desiredShares.map((share) => beforeIds.has(share.userId)
      ? notesApi.updateShare(noteId, share.userId, share.canViewSecret)
      : notesApi.addShare(noteId, share.userId, share.canViewSecret)));
  };

  const saveNote = async () => {
    setSaving(true);
    try {
      const before = editing?.shares || [];
      const saved = editing ? await notesApi.update(editing.id, buildPayload()) : await notesApi.create(buildPayload());
      await syncShares(saved.id, before);
      setEditorOpen(false); await loadNotes();
    } catch (error) {
      alert(errorMessage(error, 'ไม่สามารถบันทึก Note ได้'));
    } finally { setSaving(false); }
  };

  const deleteNote = async (note: AppNote) => {
    if (!window.confirm(`ลบ Note “${note.title}” ?`)) return;
    try { await notesApi.delete(note.id); await loadNotes(); } catch (error) { alert(errorMessage(error, 'ไม่สามารถลบ Note ได้')); }
  };

  const quickTaskStatus = async (note: AppNote, taskStatus: NoteTaskStatus) => {
    try { await notesApi.update(note.id, { taskStatus }); await loadNotes(); } catch (error) { alert(errorMessage(error, 'ไม่สามารถเปลี่ยนสถานะงานได้')); }
  };

  const revealSecret = async (note: AppNote) => {
    try {
      const { secret } = await notesApi.revealSecret(note.id);
      setRevealed((previous) => ({ ...previous, [note.id]: secret }));
      window.setTimeout(() => setRevealed((previous) => { const next = { ...previous }; delete next[note.id]; return next; }), 30000);
    } catch (error) { alert(errorMessage(error, 'ไม่สามารถเปิดดูรหัสผ่านได้')); }
  };
  const copySecret = async (note: AppNote) => {
    const secret = revealed[note.id];
    if (!secret) return;
    try { await navigator.clipboard.writeText(secret); alert('คัดลอกรหัสผ่านแล้ว'); } catch { alert('เบราว์เซอร์ไม่อนุญาตให้คัดลอก'); }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">📝 Note</h1><p className="text-sm text-muted-foreground mt-1">เก็บข้อมูลลูกค้า งาน และข้อมูลเข้าสู่ระบบอย่างเป็นส่วนตัว</p></div>
        <Button onClick={openCreate} className="gap-2"><Plus size={17} /> เพิ่ม Note</Button>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-6">
          <div className="relative lg:col-span-2"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="pl-9" placeholder="ค้นหาชื่อ เนื้อหา ลูกค้า Host..." /></div>
          <select value={filters.category || ''} onChange={(event) => updateFilter({ category: event.target.value as NoteCategory || undefined })} className="rounded-lg border border-input bg-background px-3 text-sm"><option value="">ทุกประเภท</option>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select value={filters.taskStatus || ''} onChange={(event) => updateFilter({ taskStatus: event.target.value as NoteTaskStatus || undefined })} className="rounded-lg border border-input bg-background px-3 text-sm"><option value="">ทุกสถานะงาน</option>{Object.entries(taskLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select value={filters.scope || 'all'} onChange={(event) => updateFilter({ scope: event.target.value as 'all' | 'owned' | 'shared' })} className="rounded-lg border border-input bg-background px-3 text-sm"><option value="all">ทั้งหมด</option><option value="owned">ของฉัน</option><option value="shared">แชร์กับฉัน</option></select>
          <select value={filters.sort || 'pinned'} onChange={(event) => updateFilter({ sort: event.target.value as NoteFilters['sort'] })} className="rounded-lg border border-input bg-background px-3 text-sm"><option value="pinned">ปักหมุดก่อน</option><option value="updated">แก้ไขล่าสุด</option><option value="due">กำหนดส่ง</option><option value="title">ชื่อ A-Z</option></select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Input value={tagInput} onChange={(event) => setTagInput(event.target.value)} placeholder="กรองแท็ก เช่น ลูกค้าสำคัญ" className="max-w-xs" list="note-tags" />
          <datalist id="note-tags">{tags.map((tag) => <option key={tag} value={tag} />)}</datalist>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(filters.overdue)} onChange={(event) => updateFilter({ overdue: event.target.checked || undefined })} /> งานเกินกำหนด</label>
          <span className="text-sm text-muted-foreground">พบ {data.total} Note</span>
        </div>
      </section>

      {loading ? <div className="py-16 text-center text-muted-foreground">กำลังโหลด Note...</div> : data.notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center"><div className="text-4xl">📝</div><h2 className="mt-3 font-semibold">ยังไม่พบ Note</h2><p className="mt-1 text-sm text-muted-foreground">เพิ่ม Note แรกเพื่อเก็บข้อมูลที่ค้นหาได้ง่าย</p></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.notes.map((note) => <NoteCard key={note.id} note={note} secret={revealed[note.id]} onOpen={() => note.canEdit ? openEdit(note) : openView(note)} onDelete={() => deleteNote(note)} onTaskStatus={(status) => quickTaskStatus(note, status)} onReveal={() => revealSecret(note)} onHide={() => setRevealed((previous) => { const next = { ...previous }; delete next[note.id]; return next; })} onCopy={() => copySecret(note)} />)}
        </div>
      )}
      {data.totalPages > 1 && <div className="mt-6 flex justify-center gap-3"><Button variant="outline" size="sm" disabled={(filters.page || 1) <= 1} onClick={() => setFilters((previous) => ({ ...previous, page: (previous.page || 1) - 1 }))}>ก่อนหน้า</Button><span className="self-center text-sm">หน้า {filters.page || 1} / {data.totalPages}</span><Button variant="outline" size="sm" disabled={(filters.page || 1) >= data.totalPages} onClick={() => setFilters((previous) => ({ ...previous, page: (previous.page || 1) + 1 }))}>ถัดไป</Button></div>}

      <EditorDialog open={editorOpen} onOpenChange={setEditorOpen} editing={editing} editor={editor} setField={setField} shares={shares} setShares={setShares} shareQuery={shareQuery} setShareQuery={setShareQuery} shareResults={shareResults} addRecipient={addRecipient} saving={saving} onSave={saveNote} />
      <ViewerDialog note={viewing} secret={viewing ? revealed[viewing.id] : undefined} onOpenChange={(open) => !open && setViewing(null)} onReveal={() => viewing && revealSecret(viewing)} onHide={() => viewing && setRevealed((previous) => { const next = { ...previous }; delete next[viewing.id]; return next; })} onCopy={() => viewing && copySecret(viewing)} />
    </Layout>
  );
}

function NoteCard({ note, secret, onOpen, onDelete, onTaskStatus, onReveal, onHide, onCopy }: { note: AppNote; secret?: string; onOpen: () => void; onDelete: () => void; onTaskStatus: (status: NoteTaskStatus) => void; onReveal: () => void; onHide: () => void; onCopy: () => void }) {
  const overdue = isOverdue(note);
  return <article className={`rounded-xl border bg-card p-4 shadow-sm flex flex-col ${overdue ? 'border-red-300' : 'border-border'}`}>
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap gap-2 mb-2"><span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{categoryLabels[note.category]}</span>{note.isShared && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700">แชร์กับฉัน</span>}{note.isPinned && <Pin size={14} className="mt-0.5 text-amber-500 fill-amber-500" />}</div><h2 className="font-semibold text-foreground break-words">{note.title}</h2></div><Button variant="ghost" size="sm" onClick={onOpen} aria-label="เปิด Note">{note.canEdit ? <Pencil size={16} /> : <Eye size={16} />}</Button></div>
    {note.clientName && <p className="mt-2 text-sm text-muted-foreground">👤 {note.clientName}</p>}
    {note.content && <div className="mt-3 line-clamp-4"><PlainText value={note.content} /></div>}
    {note.category === 'ACCESS' && <div className="mt-3 rounded-lg bg-muted/60 p-3 text-sm space-y-1"><div className="font-medium">🔐 {note.host || 'ข้อมูลเข้าสู่ระบบ'}</div>{note.username && <div className="text-muted-foreground">Username: {note.username}</div>}{note.hasSecret && <SecretControl note={note} secret={secret} onReveal={onReveal} onHide={onHide} onCopy={onCopy} />}</div>}
    {note.category === 'TASK' && <div className={`mt-3 rounded-lg p-3 text-sm ${overdue ? 'bg-red-50 text-red-700' : 'bg-muted/60'}`}><div className="flex justify-between gap-2"><span>{note.priority && `ความสำคัญ: ${priorityLabels[note.priority]}`}</span>{note.dueOn && <span>{overdue ? 'เกินกำหนด: ' : 'กำหนด: '}{formatDate(note.dueOn)}</span>}</div>{note.canEdit && <select value={note.taskStatus || 'TODO'} onChange={(event) => onTaskStatus(event.target.value as NoteTaskStatus)} className="mt-2 rounded border border-input bg-background px-2 py-1 text-sm"><option value="TODO">ยังไม่ทำ</option><option value="IN_PROGRESS">กำลังทำ</option><option value="DONE">เสร็จแล้ว</option></select>}{!note.canEdit && <div className="mt-2">{taskLabels[note.taskStatus || 'TODO']}</div>}</div>}
    {note.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{note.tags.map((tag) => <span key={tag} className="rounded bg-secondary/10 px-2 py-0.5 text-xs text-secondary-foreground">#{tag}</span>)}</div>}
    <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground"><span>แก้ไข {formatDate(note.updatedAt)}</span><div className="flex gap-1">{note.canEdit && <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 px-2 text-red-500 hover:text-red-700"><Trash2 size={15} /></Button>}</div></div>
  </article>;
}

function SecretControl({ note, secret, onReveal, onHide, onCopy }: { note: AppNote; secret?: string; onReveal: () => void; onHide: () => void; onCopy: () => void }) {
  if (!note.canViewSecret) return <div className="text-xs text-muted-foreground">•••••••• ไม่มีสิทธิ์ดูรหัสผ่าน</div>;
  return <div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 truncate rounded bg-background px-2 py-1">{secret || '••••••••'}</code>{secret ? <><Button variant="ghost" size="sm" className="h-8 px-2" onClick={onCopy} title="คัดลอก"><Copy size={14} /></Button><Button variant="ghost" size="sm" className="h-8 px-2" onClick={onHide} title="ซ่อน"><EyeOff size={14} /></Button></> : <Button variant="soft-primary" size="sm" className="h-8 px-2" onClick={onReveal}><Eye size={14} className="mr-1" /> ดู</Button>}</div>;
}

function EditorDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; editing: AppNote | null; editor: EditorState; setField: <K extends keyof EditorState>(key: K, value: EditorState[K]) => void; shares: NoteShare[]; setShares: (shares: NoteShare[]) => void; shareQuery: string; setShareQuery: (value: string) => void; shareResults: NoteShareUser[]; addRecipient: (user: NoteShareUser) => void; saving: boolean; onSave: () => void }) {
  const { open, onOpenChange, editing, editor, setField, shares, setShares, shareQuery, setShareQuery, shareResults, addRecipient, saving, onSave } = props;
  const hasExistingSecret = Boolean(editing?.hasSecret);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? 'แก้ไข Note' : 'เพิ่ม Note'}</DialogTitle></DialogHeader><div className="space-y-4 pr-1">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Input label="ชื่อ Note" value={editor.title} onChange={(event) => setField('title', event.target.value)} maxLength={200} required /><label className="space-y-2 text-sm font-medium">ประเภท<select value={editor.category} onChange={(event) => setField('category', event.target.value as NoteCategory)} className="h-10 w-full rounded-md border border-input bg-background px-3 font-normal">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    <Input label="ชื่อลูกค้า/โปรเจกต์ (ไม่บังคับ)" value={editor.clientName} onChange={(event) => setField('clientName', event.target.value)} maxLength={200} />
    <label className="block space-y-2 text-sm font-medium">เนื้อหา (plain text)<textarea value={editor.content} onChange={(event) => setField('content', event.target.value)} maxLength={50000} rows={7} className="w-full rounded-md border border-input bg-background px-3 py-2 font-normal" placeholder="เก็บรายละเอียด, URL จะกดเปิดได้" /></label>
    <Input label="แท็ก (คั่นด้วย , ได้สูงสุด 20 แท็ก)" value={editor.tagsText} onChange={(event) => setField('tagsText', event.target.value)} />
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editor.isPinned} onChange={(event) => setField('isPinned', event.target.checked)} /> <Pin size={15} /> ปักหมุดไว้ด้านบน</label>
    {editor.category === 'ACCESS' && <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4"><div className="flex items-center gap-2 font-medium"><LockKeyhole size={16} /> ข้อมูลเข้าสู่ระบบ</div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Input label="Host/บริการ" value={editor.host} onChange={(event) => setField('host', event.target.value)} /><Input label="URL" type="url" value={editor.loginUrl} onChange={(event) => setField('loginUrl', event.target.value)} placeholder="https://..." /><Input label="Username" value={editor.username} onChange={(event) => setField('username', event.target.value)} /><Input label={hasExistingSecret ? 'ตั้งรหัสผ่านใหม่ (เว้นว่างเพื่อคงเดิม)' : 'Password'} type="password" value={editor.secret} onChange={(event) => setField('secret', event.target.value)} autoComplete="new-password" /></div>{hasExistingSecret && <label className="flex items-center gap-2 text-sm text-red-700"><input type="checkbox" checked={editor.clearSecret} onChange={(event) => setField('clearSecret', event.target.checked)} /> ลบรหัสผ่านที่บันทึกไว้</label>}<p className="text-xs text-muted-foreground">Password ถูกเข้ารหัสก่อนเก็บ และจะไม่แสดงในรายการ Note</p></section>}
    {editor.category === 'TASK' && <section className="grid grid-cols-1 gap-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4 sm:grid-cols-3"><label className="space-y-1 text-sm">สถานะ<select value={editor.taskStatus} onChange={(event) => setField('taskStatus', event.target.value as NoteTaskStatus)} className="h-10 w-full rounded border border-input bg-background px-2">{Object.entries(taskLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="space-y-1 text-sm">ความสำคัญ<select value={editor.priority} onChange={(event) => setField('priority', event.target.value as NotePriority)} className="h-10 w-full rounded border border-input bg-background px-2">{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><Input label="กำหนดส่ง" type="date" value={editor.dueOn} onChange={(event) => setField('dueOn', event.target.value)} /></section>}
    <section className="rounded-xl border border-violet-200 bg-violet-50/40 p-4"><div className="mb-2 flex items-center gap-2 font-medium"><Users size={16} /> แชร์ Note <span className="text-xs font-normal text-muted-foreground">ผู้รับอ่านได้อย่างเดียว</span></div><Input value={shareQuery} onChange={(event) => setShareQuery(event.target.value)} placeholder="ค้นหาชื่อหรืออีเมลผู้ใช้ (อย่างน้อย 2 ตัวอักษร)" />{shareResults.length > 0 && <div className="mt-2 rounded border bg-background">{shareResults.map((user) => <button key={user.id} onClick={() => addRecipient(user)} type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-muted">{user.name} <span className="text-muted-foreground">({user.email})</span></button>)}</div>}<div className="mt-3 space-y-2">{shares.map((share) => <div key={share.userId} className="flex flex-wrap items-center justify-between gap-2 rounded bg-background px-3 py-2 text-sm"><span>{share.user.name} <span className="text-muted-foreground">{share.user.email}</span></span><div className="flex items-center gap-2"><label className="flex items-center gap-1 text-xs"><input type="checkbox" disabled={editor.category !== 'ACCESS' || (!editor.secret && !hasExistingSecret)} checked={share.canViewSecret} onChange={(event) => setShares(shares.map((item) => item.userId === share.userId ? { ...item, canViewSecret: event.target.checked } : item))} /> อนุญาตดูรหัส</label><Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-red-600" onClick={() => setShares(shares.filter((item) => item.userId !== share.userId))}>ลบ</Button></div></div>)}</div></section>
    <div className="flex gap-3 pt-2"><Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>ยกเลิก</Button><Button type="button" className="flex-1" disabled={saving || !editor.title.trim()} onClick={onSave}>{saving ? 'กำลังบันทึก...' : <><Check size={16} className="mr-1" /> บันทึก Note</>}</Button></div>
  </div></DialogContent></Dialog>;
}

function ViewerDialog({ note, secret, onOpenChange, onReveal, onHide, onCopy }: { note: AppNote | null; secret?: string; onOpenChange: (open: boolean) => void; onReveal: () => void; onHide: () => void; onCopy: () => void }) {
  return <Dialog open={Boolean(note)} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{note?.title}</DialogTitle></DialogHeader>{note && <div className="space-y-4"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">{categoryLabels[note.category]}</span><span className="rounded-full bg-violet-50 px-2 py-1 text-xs text-violet-700"><Share2 size={12} className="mr-1 inline" /> โดย {note.owner.name}</span></div>{note.clientName && <div className="text-sm">👤 {note.clientName}</div>}<PlainText value={note.content || 'ไม่มีเนื้อหา'} />{note.category === 'ACCESS' && <div className="rounded-lg bg-muted p-3 text-sm space-y-2"><div>Host/บริการ: {note.host || '-'}</div>{note.loginUrl && <a href={note.loginUrl} target="_blank" rel="noreferrer" className="block text-primary underline break-all">{note.loginUrl}</a>}<div>Username: {note.username || '-'}</div>{note.hasSecret && <SecretControl note={note} secret={secret} onReveal={onReveal} onHide={onHide} onCopy={onCopy} />}</div>}{note.category === 'TASK' && <div className="rounded-lg bg-muted p-3 text-sm">{taskLabels[note.taskStatus || 'TODO']} · {note.priority && priorityLabels[note.priority]} · กำหนด {formatDate(note.dueOn)}</div>}{note.tags.length > 0 && <div className="flex flex-wrap gap-1">{note.tags.map((tag) => <span key={tag} className="rounded bg-secondary/10 px-2 py-1 text-xs">#{tag}</span>)}</div>}</div>}</DialogContent></Dialog>;
}
