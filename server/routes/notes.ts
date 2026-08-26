import { NoteCategory, NoteLinkKind, NotePriority, NoteSecretAccessType, NoteTaskStatus, Prisma } from '@prisma/client';
import { Response, Router } from 'express';
import prisma from '../lib/prisma.js';
import { decryptNoteSecret, encryptNoteSecret } from '../lib/noteSecrets.js';
import { notePermission } from '../lib/notePermissions.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';

const CATEGORIES = new Set(Object.values(NoteCategory));
const TASK_STATUSES = new Set(Object.values(NoteTaskStatus));
const PRIORITIES = new Set(Object.values(NotePriority));
const noteInclude = {
  owner: { select: { id: true, name: true, email: true } },
  shares: { include: { user: { select: { id: true, name: true, email: true } } } },
  links: { orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.NoteInclude;

type NoteWithRelations = Prisma.NoteGetPayload<{ include: typeof noteInclude }>;
type NoteDatabase = typeof prisma | Prisma.TransactionClient;
type NoteShareInput = { userId: number; canViewSecret: boolean };
type NoteLinkInput = { url: string; label: string; kind: NoteLinkKind; sortOrder: number };

function sendError(res: Response, status: number, error: string) { return res.status(status).json({ error }); }
function routeParam(value: string | string[] | undefined) { return typeof value === 'string' ? value : ''; }

function stringValue(value: unknown, maximum: number, field: string, required = false): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) { if (required) throw new Error(`กรุณาระบุ${field}`); return null; }
  if (typeof value !== 'string') throw new Error(`${field} ต้องเป็นข้อความ`);
  const result = value.trim();
  if (required && !result) throw new Error(`กรุณาระบุ${field}`);
  if (result.length > maximum) throw new Error(`${field} ยาวเกิน ${maximum.toLocaleString()} ตัวอักษร`);
  return result || (required ? undefined : null);
}

function plainTextValue(value: unknown, maximum: number, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error(`${field} ต้องเป็นข้อความ`);
  if (value.length > maximum) throw new Error(`${field} ยาวเกิน ${maximum.toLocaleString()} ตัวอักษร`);
  return value;
}

function cleanTags(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((tag) => typeof tag !== 'string')) throw new Error('แท็กไม่ถูกต้อง');
  const tags = [...new Set(value.map((tag) => tag.trim().toLocaleLowerCase()).filter(Boolean))];
  if (tags.length > 20) throw new Error('แท็กได้ไม่เกิน 20 รายการ');
  if (tags.some((tag) => tag.length > 50)) throw new Error('แท็กแต่ละรายการยาวได้ไม่เกิน 50 ตัวอักษร');
  return tags;
}

function parseDate(value: unknown, field = 'วันกำหนดส่ง'): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${field} ไม่ถูกต้อง`);
  const result = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(result.getTime()) || result.toISOString().slice(0, 10) !== value) throw new Error(`${field} ไม่ถูกต้อง`);
  return result;
}

function validUrl(value: string | null | undefined) {
  if (!value) return value;
  try { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); return value; }
  catch { throw new Error('URL ต้องขึ้นต้นด้วย http:// หรือ https://'); }
}

function classifyLink(url: string): NoteLinkKind {
  const parsed = new URL(url);
  if (parsed.hostname === 'docs.google.com' && parsed.pathname.startsWith('/spreadsheets/')) return NoteLinkKind.GOOGLE_SHEETS;
  if (parsed.hostname === 'docs.google.com' && parsed.pathname.startsWith('/document/')) return NoteLinkKind.GOOGLE_DOCS;
  if (parsed.hostname === 'docs.google.com' && parsed.pathname.startsWith('/presentation/')) return NoteLinkKind.GOOGLE_SLIDES;
  return parsed.hostname === 'drive.google.com' ? NoteLinkKind.GOOGLE_DRIVE : NoteLinkKind.WEBSITE;
}

function defaultLinkLabel(url: string, kind: NoteLinkKind) {
  const labels: Record<NoteLinkKind, string> = {
    GOOGLE_SHEETS: 'Google Sheets', GOOGLE_DOCS: 'Google Docs', GOOGLE_SLIDES: 'Google Slides', GOOGLE_DRIVE: 'Google Drive', WEBSITE: new URL(url).hostname,
  };
  return labels[kind];
}

function parseLinks(value: unknown): NoteLinkInput[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 20) throw new Error('เพิ่มเอกสารและลิงก์ได้ไม่เกิน 20 รายการ');
  const seen = new Set<string>();
  return value.map((item, sortOrder) => {
    if (!item || typeof item !== 'object') throw new Error('ข้อมูลลิงก์ไม่ถูกต้อง');
    const raw = item as Record<string, unknown>;
    const url = validUrl(stringValue(raw.url, 2000, 'URL', true));
    if (!url || seen.has(url)) throw new Error('มีลิงก์ซ้ำกัน');
    seen.add(url);
    const kind = classifyLink(url);
    return { url, label: stringValue(raw.label, 200, 'ชื่อที่แสดง') || defaultLinkLabel(url, kind), kind, sortOrder };
  });
}

function countLines(value: string) { return value ? value.split(/\r\n|\r|\n/).length : 0; }
function hasSecureContent(note: Pick<NoteWithRelations, 'contentCiphertext' | 'contentIv' | 'contentAuthTag' | 'contentKeyVersion'>) { return Boolean(note.contentCiphertext && note.contentIv && note.contentAuthTag && note.contentKeyVersion); }
function canHaveSensitiveData(note: Pick<NoteWithRelations, 'category' | 'contentCiphertext' | 'contentIv' | 'contentAuthTag' | 'contentKeyVersion'>) { return note.category === NoteCategory.ACCESS || hasSecureContent(note); }

function todayUtc() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  return new Date(Date.UTC(Number(part('year')), Number(part('month')) - 1, Number(part('day'))));
}

function serializeNote(note: NoteWithRelations, currentUserId: number, includeShares = false) {
  const permission = notePermission(note, currentUserId);
  const secure = hasSecureContent(note);
  return {
    id: note.id, category: note.category, title: note.title, content: note.content, tags: note.tags, isPinned: note.isPinned,
    clientName: note.clientName, host: note.host, loginUrl: note.loginUrl, username: note.username,
    hasSecret: Boolean(note.secretCiphertext), hasSecureContent: secure, secureContentLineCount: note.secureContentLineCount,
    taskStatus: note.taskStatus, priority: note.priority, dueOn: note.dueOn, completedAt: note.completedAt, createdAt: note.createdAt, updatedAt: note.updatedAt,
    owner: note.owner, isOwner: permission.isOwner, canEdit: permission.isOwner, canViewSecret: permission.canViewSecret && Boolean(note.secretCiphertext),
    canViewSecureContent: permission.canViewSecret && secure, isShared: !permission.isOwner,
    links: note.links.map((link) => ({ id: link.id, url: link.url, label: link.label, kind: link.kind, sortOrder: link.sortOrder })),
    ...(includeShares && permission.isOwner ? { shares: note.shares.map((share) => ({ userId: share.userId, canViewSecret: share.canViewSecret, createdAt: share.createdAt, user: share.user })) } : {}),
  };
}

async function findAccessibleNote(database: NoteDatabase, id: string, userId: number) {
  const note = await database.note.findUnique({ where: { id }, include: noteInclude });
  if (!note || !notePermission(note, userId).canRead) return null;
  return note;
}

function parseSharePayload(value: unknown, ownerId: number, canGrantSensitiveData: boolean): NoteShareInput[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 100) throw new Error('รายชื่อผู้รับแชร์ไม่ถูกต้อง');
  const shares = value.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('ข้อมูลผู้รับแชร์ไม่ถูกต้อง');
    const userId = Number((item as Record<string, unknown>).userId);
    const canViewSecret = (item as Record<string, unknown>).canViewSecret;
    if (!Number.isInteger(userId) || userId === ownerId || typeof canViewSecret !== 'boolean') throw new Error('ข้อมูลผู้รับแชร์ไม่ถูกต้อง');
    if (canViewSecret && !canGrantSensitiveData) throw new Error('สิทธิ์ดูข้อมูลลับใช้ได้เมื่อ Note มีข้อมูลลับเท่านั้น');
    return { userId, canViewSecret };
  });
  if (new Set(shares.map((share) => share.userId)).size !== shares.length) throw new Error('มีผู้รับแชร์ซ้ำกัน');
  return shares;
}

async function validateShareUsers(database: NoteDatabase, shares: NoteShareInput[]) {
  if (!shares.length) return;
  const users = await database.user.findMany({ where: { id: { in: shares.map((share) => share.userId) }, status: 'active' }, select: { id: true } });
  if (users.length !== shares.length) throw new Error('ไม่พบผู้รับแชร์ที่ใช้งานอยู่บางราย');
}

function parseNotePayload(body: Record<string, unknown>, existing?: NoteWithRelations) {
  const category = body.category === undefined ? existing?.category : body.category;
  if (!CATEGORIES.has(category as NoteCategory)) throw new Error('ประเภท Note ไม่ถูกต้อง');
  const title = stringValue(body.title, 200, 'ชื่อ Note', body.title !== undefined || !existing);
  const content = plainTextValue(body.content, 50000, 'เนื้อหา');
  const clientName = stringValue(body.clientName, 200, 'ชื่อลูกค้า');
  const host = stringValue(body.host, 300, 'Host/บริการ');
  const loginUrl = validUrl(stringValue(body.loginUrl, 2000, 'URL'));
  const username = stringValue(body.username, 500, 'Username');
  const tags = cleanTags(body.tags);
  let isPinned: boolean | undefined;
  if (body.isPinned !== undefined) {
    if (typeof body.isPinned !== 'boolean') throw new Error('สถานะปักหมุดไม่ถูกต้อง');
    isPinned = body.isPinned;
  }
  const taskStatus = body.taskStatus === undefined ? undefined : body.taskStatus;
  const priority = body.priority === undefined ? undefined : body.priority;
  const dueOn = parseDate(body.dueOn);
  if (category !== NoteCategory.TASK && (taskStatus !== undefined || priority !== undefined || dueOn !== undefined)) throw new Error('ข้อมูลงานใช้ได้เฉพาะ Note ประเภทงาน');
  if (taskStatus !== undefined && !TASK_STATUSES.has(taskStatus as NoteTaskStatus)) throw new Error('สถานะงานไม่ถูกต้อง');
  if (priority !== undefined && !PRIORITIES.has(priority as NotePriority)) throw new Error('ความสำคัญไม่ถูกต้อง');
  if (category !== NoteCategory.ACCESS && (host !== undefined || loginUrl !== undefined || username !== undefined || body.secret !== undefined || body.clearSecret)) throw new Error('ข้อมูลเข้าสู่ระบบใช้ได้เฉพาะ Note ประเภทโฮสต์/ข้อมูลเข้าสู่ระบบ');
  const nextStatus = (taskStatus ?? existing?.taskStatus) as NoteTaskStatus | null | undefined;
  return { category: category as NoteCategory, title, content, clientName, host, loginUrl, username, tags, isPinned,
    taskStatus: category === NoteCategory.TASK ? (taskStatus as NoteTaskStatus | undefined) : null, priority: category === NoteCategory.TASK ? (priority as NotePriority | undefined) : null,
    dueOn: category === NoteCategory.TASK ? dueOn : null, completedAt: category === NoteCategory.TASK && taskStatus !== undefined ? (nextStatus === NoteTaskStatus.DONE ? new Date() : null) : undefined };
}

function parseSecureContent(body: Record<string, unknown>) {
  const secureContent = plainTextValue(body.secureContent, 50000, 'ข้อมูลลับ');
  if (body.clearSecureContent !== undefined && typeof body.clearSecureContent !== 'boolean') throw new Error('สถานะข้อมูลลับไม่ถูกต้อง');
  const clearSecureContent = body.clearSecureContent === true;
  if (secureContent && clearSecureContent) throw new Error('ไม่สามารถแทนที่และลบข้อมูลลับพร้อมกันได้');
  return { secureContent, clearSecureContent };
}

export function createNotesRouter(database: typeof prisma = prisma) {
  const router = Router();
  router.use(['/notes', '/note-share-users'], authMiddleware);

  router.get('/notes', async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 200) : '';
      const category = typeof req.query.category === 'string' && CATEGORIES.has(req.query.category as NoteCategory) ? req.query.category as NoteCategory : undefined;
      const taskStatus = typeof req.query.taskStatus === 'string' && TASK_STATUSES.has(req.query.taskStatus as NoteTaskStatus) ? req.query.taskStatus as NoteTaskStatus : undefined;
      const tag = typeof req.query.tag === 'string' ? req.query.tag.trim().toLocaleLowerCase() : '';
      const scope = req.query.scope === 'owned' || req.query.scope === 'shared' ? req.query.scope : 'all';
      const overdue = req.query.overdue === 'true';
      const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
      const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit || '24'), 10) || 24));
      const sort = ['pinned', 'updated', 'due', 'title'].includes(String(req.query.sort)) ? String(req.query.sort) : 'pinned';
      const accessWhere: Prisma.NoteWhereInput = scope === 'owned' ? { ownerId: userId } : scope === 'shared' ? { shares: { some: { userId } } } : { OR: [{ ownerId: userId }, { shares: { some: { userId } } }] };
      const filters: Prisma.NoteWhereInput[] = [accessWhere];
      if (category) filters.push({ category });
      if (taskStatus) filters.push({ taskStatus });
      if (tag) filters.push({ tags: { has: tag } });
      if (overdue) filters.push({ category: NoteCategory.TASK, taskStatus: { not: NoteTaskStatus.DONE }, dueOn: { lt: todayUtc() } });
      if (q) filters.push({ OR: [
        { title: { contains: q, mode: 'insensitive' } }, { content: { contains: q, mode: 'insensitive' } }, { clientName: { contains: q, mode: 'insensitive' } }, { host: { contains: q, mode: 'insensitive' } }, { username: { contains: q, mode: 'insensitive' } }, { tags: { has: q.toLocaleLowerCase() } },
        { links: { some: { OR: [{ label: { contains: q, mode: 'insensitive' } }, { url: { contains: q, mode: 'insensitive' } }] } } },
      ] });
      const orderBy: Prisma.NoteOrderByWithRelationInput[] = sort === 'title' ? [{ title: 'asc' }] : sort === 'due' ? [{ dueOn: 'asc' }, { updatedAt: 'desc' }] : sort === 'updated' ? [{ updatedAt: 'desc' }] : [{ isPinned: 'desc' }, { updatedAt: 'desc' }];
      const where = { AND: filters };
      const [notes, total] = await database.$transaction([database.note.findMany({ where, include: noteInclude, orderBy, skip: (page - 1) * limit, take: limit }), database.note.count({ where })]);
      res.json({ notes: notes.map((note) => serializeNote(note, userId)), page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
    } catch (error) { console.error('Failed to list notes', error); sendError(res, 500, 'ไม่สามารถโหลด Note ได้'); }
  });

  router.post('/notes', async (req: AuthRequest, res) => {
    try {
      const payload = parseNotePayload(req.body || {});
      if (!payload.title) return sendError(res, 400, 'กรุณาระบุชื่อ Note');
      const password = req.body?.secret;
      if (password !== undefined && (typeof password !== 'string' || password.length > 2000)) return sendError(res, 400, 'รหัสผ่านไม่ถูกต้อง');
      const encryptedPassword = password ? encryptNoteSecret(password) : undefined;
      const { secureContent } = parseSecureContent(req.body || {});
      const encryptedContent = secureContent ? encryptNoteSecret(secureContent) : undefined;
      const links = parseLinks(req.body?.links) ?? [];
      const shares = parseSharePayload(req.body?.shares, req.userId!, payload.category === NoteCategory.ACCESS || Boolean(encryptedContent)) ?? [];
      const note = await database.$transaction(async (transaction) => {
        await validateShareUsers(transaction, shares);
        const created = await transaction.note.create({ data: {
          ownerId: req.userId!, category: payload.category, title: payload.title, content: encryptedContent ? '' : (payload.content ?? ''), tags: payload.tags ?? [], isPinned: payload.isPinned ?? false,
          clientName: payload.clientName ?? null, host: payload.host ?? null, loginUrl: payload.loginUrl ?? null, username: payload.username ?? null, taskStatus: payload.taskStatus ?? null, priority: payload.priority ?? null, dueOn: payload.dueOn ?? null, completedAt: payload.completedAt ?? null,
          ...(encryptedPassword ? { secretCiphertext: encryptedPassword.ciphertext, secretIv: encryptedPassword.iv, secretAuthTag: encryptedPassword.authTag, secretKeyVersion: encryptedPassword.keyVersion } : {}),
          ...(encryptedContent ? { contentCiphertext: encryptedContent.ciphertext, contentIv: encryptedContent.iv, contentAuthTag: encryptedContent.authTag, contentKeyVersion: encryptedContent.keyVersion, secureContentLineCount: countLines(secureContent) } : {}),
        } });
        if (links.length) await transaction.noteLink.createMany({ data: links.map((link) => ({ noteId: created.id, ...link })) });
        if (shares.length) await transaction.noteShare.createMany({ data: shares.map((share) => ({ noteId: created.id, ...share })) });
        return transaction.note.findUniqueOrThrow({ where: { id: created.id }, include: noteInclude });
      });
      res.status(201).json(serializeNote(note, req.userId!, true));
    } catch (error) { console.error('Failed to create note', error); sendError(res, 400, error instanceof Error ? error.message : 'ไม่สามารถบันทึก Note ได้'); }
  });

  router.get('/notes/:id', async (req: AuthRequest, res) => {
    const note = await findAccessibleNote(database, routeParam(req.params.id), req.userId!);
    if (!note) return sendError(res, 404, 'ไม่พบ Note หรือคุณไม่มีสิทธิ์เข้าถึง');
    res.json(serializeNote(note, req.userId!, true));
  });

  router.patch('/notes/:id', async (req: AuthRequest, res) => {
    try {
      const existing = await findAccessibleNote(database, routeParam(req.params.id), req.userId!);
      if (!existing) return sendError(res, 404, 'ไม่พบ Note หรือคุณไม่มีสิทธิ์เข้าถึง');
      if (existing.ownerId !== req.userId) return sendError(res, 403, 'ผู้รับแชร์อ่าน Note ได้อย่างเดียว');
      const payload = parseNotePayload(req.body || {}, existing);
      const password = req.body?.secret;
      if (password !== undefined && (typeof password !== 'string' || password.length > 2000)) return sendError(res, 400, 'รหัสผ่านไม่ถูกต้อง');
      const encryptedPassword = password ? encryptNoteSecret(password) : undefined;
      const { secureContent, clearSecureContent } = parseSecureContent(req.body || {});
      const encryptedContent = secureContent ? encryptNoteSecret(secureContent) : undefined;
      const links = parseLinks(req.body?.links);
      const contentWillBeSecure = Boolean(encryptedContent || (!clearSecureContent && hasSecureContent(existing)));
      const shares = parseSharePayload(req.body?.shares, req.userId!, payload.category === NoteCategory.ACCESS || contentWillBeSecure);
      const data: Prisma.NoteUpdateInput = {};
      for (const [key, value] of Object.entries(payload)) if (value !== undefined) Object.assign(data, { [key]: value });
      if (existing.category === NoteCategory.ACCESS && payload.category !== NoteCategory.ACCESS) Object.assign(data, { host: null, loginUrl: null, username: null, secretCiphertext: null, secretIv: null, secretAuthTag: null, secretKeyVersion: null });
      if (req.body?.clearSecret === true) Object.assign(data, { secretCiphertext: null, secretIv: null, secretAuthTag: null, secretKeyVersion: null });
      if (encryptedPassword) Object.assign(data, { secretCiphertext: encryptedPassword.ciphertext, secretIv: encryptedPassword.iv, secretAuthTag: encryptedPassword.authTag, secretKeyVersion: encryptedPassword.keyVersion });
      if (encryptedContent) Object.assign(data, { content: '', contentCiphertext: encryptedContent.ciphertext, contentIv: encryptedContent.iv, contentAuthTag: encryptedContent.authTag, contentKeyVersion: encryptedContent.keyVersion, secureContentLineCount: countLines(secureContent) });
      if (clearSecureContent) Object.assign(data, { contentCiphertext: null, contentIv: null, contentAuthTag: null, contentKeyVersion: null, secureContentLineCount: 0 });
      const note = await database.$transaction(async (transaction) => {
        if (links) { await transaction.noteLink.deleteMany({ where: { noteId: existing.id } }); if (links.length) await transaction.noteLink.createMany({ data: links.map((link) => ({ noteId: existing.id, ...link })) }); }
        if (shares) { await validateShareUsers(transaction, shares); await transaction.noteShare.deleteMany({ where: { noteId: existing.id } }); if (shares.length) await transaction.noteShare.createMany({ data: shares.map((share) => ({ noteId: existing.id, ...share })) }); }
        else if (payload.category !== NoteCategory.ACCESS && !contentWillBeSecure) await transaction.noteShare.updateMany({ where: { noteId: existing.id }, data: { canViewSecret: false } });
        await transaction.note.update({ where: { id: existing.id }, data });
        return transaction.note.findUniqueOrThrow({ where: { id: existing.id }, include: noteInclude });
      });
      res.json(serializeNote(note, req.userId!, true));
    } catch (error) { console.error('Failed to update note', error); sendError(res, 400, error instanceof Error ? error.message : 'ไม่สามารถแก้ไข Note ได้'); }
  });

  router.delete('/notes/:id', async (req: AuthRequest, res) => {
    const note = await findAccessibleNote(database, routeParam(req.params.id), req.userId!);
    if (!note) return sendError(res, 404, 'ไม่พบ Note หรือคุณไม่มีสิทธิ์เข้าถึง');
    if (note.ownerId !== req.userId) return sendError(res, 403, 'ผู้รับแชร์ลบ Note ไม่ได้');
    await database.note.delete({ where: { id: note.id } });
    res.json({ success: true });
  });

  router.get('/notes/:id/secret', async (req: AuthRequest, res) => {
    try {
      const note = await findAccessibleNote(database, routeParam(req.params.id), req.userId!);
      if (!note) return sendError(res, 404, 'ไม่พบ Note หรือคุณไม่มีสิทธิ์เข้าถึง');
      if (!notePermission(note, req.userId!).canViewSecret || !note.secretCiphertext || !note.secretIv || !note.secretAuthTag || !note.secretKeyVersion) return sendError(res, 403, 'คุณไม่มีสิทธิ์ดูรหัสผ่านนี้');
      const secret = decryptNoteSecret({ ciphertext: note.secretCiphertext, iv: note.secretIv, authTag: note.secretAuthTag, keyVersion: note.secretKeyVersion });
      await database.noteSecretAccessLog.create({ data: { noteId: note.id, actorUserId: req.userId!, accessType: NoteSecretAccessType.PASSWORD } });
      res.set('Cache-Control', 'no-store').json({ secret });
    } catch (error) { console.error('Failed to reveal note secret', error); sendError(res, 500, 'ไม่สามารถเปิดดูรหัสผ่านได้'); }
  });

  router.get('/notes/:id/secure-content', async (req: AuthRequest, res) => {
    try {
      const note = await findAccessibleNote(database, routeParam(req.params.id), req.userId!);
      if (!note) return sendError(res, 404, 'ไม่พบ Note หรือคุณไม่มีสิทธิ์เข้าถึง');
      if (!notePermission(note, req.userId!).canViewSecret || !hasSecureContent(note)) return sendError(res, 403, 'คุณไม่มีสิทธิ์ดูข้อมูลลับนี้');
      const content = decryptNoteSecret({ ciphertext: note.contentCiphertext!, iv: note.contentIv!, authTag: note.contentAuthTag!, keyVersion: note.contentKeyVersion! });
      await database.noteSecretAccessLog.create({ data: { noteId: note.id, actorUserId: req.userId!, accessType: NoteSecretAccessType.SECURE_CONTENT } });
      res.set('Cache-Control', 'no-store').json({ content });
    } catch (error) { console.error('Failed to reveal secure note content', error); sendError(res, 500, 'ไม่สามารถเปิดดูข้อมูลลับได้'); }
  });

  router.post('/notes/:id/shares', async (req: AuthRequest, res) => {
    const note = await findAccessibleNote(database, routeParam(req.params.id), req.userId!);
    if (!note) return sendError(res, 404, 'ไม่พบ Note หรือคุณไม่มีสิทธิ์เข้าถึง');
    if (note.ownerId !== req.userId) return sendError(res, 403, 'เฉพาะเจ้าของ Note เท่านั้นที่แชร์ได้');
    const userId = Number(req.body?.userId);
    if (!Number.isInteger(userId) || userId === req.userId || typeof req.body?.canViewSecret !== 'boolean') return sendError(res, 400, 'ผู้รับแชร์ไม่ถูกต้อง');
    if (req.body.canViewSecret && !canHaveSensitiveData(note)) return sendError(res, 400, 'สิทธิ์ดูข้อมูลลับใช้ได้เมื่อ Note มีข้อมูลลับเท่านั้น');
    const user = await database.user.findFirst({ where: { id: userId, status: 'active' }, select: { id: true } });
    if (!user) return sendError(res, 404, 'ไม่พบผู้ใช้ที่ใช้งานอยู่');
    const share = await database.noteShare.upsert({ where: { noteId_userId: { noteId: note.id, userId } }, update: { canViewSecret: req.body.canViewSecret }, create: { noteId: note.id, userId, canViewSecret: req.body.canViewSecret }, include: { user: { select: { id: true, name: true, email: true } } } });
    res.status(201).json({ userId: share.userId, canViewSecret: share.canViewSecret, createdAt: share.createdAt, user: share.user });
  });

  router.patch('/notes/:id/shares/:userId', async (req: AuthRequest, res) => {
    const note = await findAccessibleNote(database, routeParam(req.params.id), req.userId!);
    if (!note) return sendError(res, 404, 'ไม่พบ Note หรือคุณไม่มีสิทธิ์เข้าถึง');
    if (note.ownerId !== req.userId) return sendError(res, 403, 'เฉพาะเจ้าของ Note เท่านั้นที่จัดการการแชร์ได้');
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || typeof req.body?.canViewSecret !== 'boolean') return sendError(res, 400, 'ข้อมูลสิทธิ์ไม่ถูกต้อง');
    if (req.body.canViewSecret && !canHaveSensitiveData(note)) return sendError(res, 400, 'สิทธิ์ดูข้อมูลลับใช้ได้เมื่อ Note มีข้อมูลลับเท่านั้น');
    const share = await database.noteShare.update({ where: { noteId_userId: { noteId: note.id, userId } }, data: { canViewSecret: req.body.canViewSecret }, include: { user: { select: { id: true, name: true, email: true } } } });
    res.json({ userId: share.userId, canViewSecret: share.canViewSecret, createdAt: share.createdAt, user: share.user });
  });

  router.delete('/notes/:id/shares/:userId', async (req: AuthRequest, res) => {
    const note = await findAccessibleNote(database, routeParam(req.params.id), req.userId!);
    if (!note) return sendError(res, 404, 'ไม่พบ Note หรือคุณไม่มีสิทธิ์เข้าถึง');
    if (note.ownerId !== req.userId) return sendError(res, 403, 'เฉพาะเจ้าของ Note เท่านั้นที่จัดการการแชร์ได้');
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) return sendError(res, 400, 'ผู้รับแชร์ไม่ถูกต้อง');
    await database.noteShare.delete({ where: { noteId_userId: { noteId: note.id, userId } } }).catch(() => null);
    res.json({ success: true });
  });

  router.get('/note-share-users', async (req: AuthRequest, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 2) return res.json([]);
    const users = await database.user.findMany({ where: { id: { not: req.userId }, status: 'active', OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] }, select: { id: true, name: true, email: true }, take: 10, orderBy: { name: 'asc' } });
    res.json(users);
  });

  return router;
}

export default createNotesRouter();
