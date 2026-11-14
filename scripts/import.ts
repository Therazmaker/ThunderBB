/**
 * Importa correos de Thunderbird (o de un respaldo) a Convex.
 *
 *   npm run import -- "C:\ruta\a\la\carpeta"            importa todo
 *   npm run import -- "C:\ruta" --dry-run               sólo lee y cuenta, no sube nada
 *   npm run import -- "C:\ruta" --name "BK cuenta@..."  nombre de la carpeta raíz
 *   npm run import -- "C:\ruta" --limit 500             máximo N mensajes por carpeta (demo)
 *
 * Entiende:
 *   - Carpetas locales de Thunderbird: archivos mbox sin extensión (Inbox, mensajes...) y
 *     subcarpetas "Nombre.sbd". Ignora los índices .msf.
 *   - Archivos .mbox / .mbx.
 *   - Carpetas con archivos .eml (por ejemplo, exportados con ImportExportTools).
 *
 * Se puede relanzar: los mensajes ya importados (mismo Message-ID en la misma carpeta) se saltan.
 * Necesita VITE_CONVEX_URL e IMPORT_TOKEN (en .env.local o en el entorno).
 */
import { createHash } from 'node:crypto';
import { createReadStream, openSync, readSync, closeSync, readdirSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import PostalMime from 'postal-mime';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';
import type { Id } from '../convex/_generated/dataModel.js';
import { loadEnv } from './env.js';

// ---------- Argumentos ----------
const argv = process.argv.slice(2);
const flag = (n: string) => argv.includes(n);
const opt = (n: string) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const srcPath = argv.find((a, i) => !a.startsWith('--') && !['--name', '--limit'].includes(argv[i - 1]));
if (!srcPath) { console.error('Uso: npm run import -- "<carpeta o archivo>" [--dry-run] [--name X] [--limit N]'); process.exit(1); }
const DRY = flag('--dry-run');
const LIMIT = opt('--limit') ? Number(opt('--limit')) : Infinity;

const env = loadEnv();
const TOKEN = env.IMPORT_TOKEN ?? '';
const client = DRY ? null : new ConvexHttpClient(env.VITE_CONVEX_URL ?? '');
if (!DRY && (!env.VITE_CONVEX_URL || !TOKEN)) { console.error('Faltan VITE_CONVEX_URL o IMPORT_TOKEN (.env.local)'); process.exit(1); }

// ---------- Límites ----------
const MAX_INLINE_BODY = 700_000;    // bytes de HTML/texto que caben en el documento; más grande va a storage
const BATCH_BYTES = 4_000_000;      // tamaño aproximado de cada llamada a insertMessages
const BATCH_MSGS = 100;
const PARALLEL = 8;                 // mensajes convertidos/subidos a la vez

// ---------- Descubrir la estructura ----------
interface SrcFolder { name: string; mbox?: string; eml: string[]; children: SrcFolder[] }

const SKIP_EXT = new Set(['.msf', '.dat', '.json', '.sqlite', '.html', '.htm', '.txt', '.log', '.mab', '.ini', '.js', '.lock', '.db', '.csv', '.xml']);
const isMbox = (file: string) => {
  const ext = extname(file).toLowerCase();
  if (ext && !['.mbox', '.mbx'].includes(ext)) return false;
  if (statSync(file).size === 0) return true;
  const fd = openSync(file, 'r'); const b = Buffer.alloc(5); readSync(fd, b, 0, 5, 0); closeSync(fd);
  return b.toString('latin1') === 'From ';
};

function scan(dir: string): { folders: SrcFolder[]; eml: string[] } {
  const byName = new Map<string, SrcFolder>();
  const node = (name: string) => {
    let f = byName.get(name);
    if (!f) { f = { name, eml: [], children: [] }; byName.set(name, f); }
    return f;
  };
  const eml: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = scan(full);
      const f = node(entry.name.replace(/\.sbd$/i, ''));
      f.children.push(...sub.folders);
      f.eml.push(...sub.eml);
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (ext === '.eml') eml.push(full);
      else if (!SKIP_EXT.has(ext) && isMbox(full)) node(ext ? basename(entry.name, extname(entry.name)) : entry.name).mbox = full;
    }
  }
  // Las carpetas sin correo ni hijos (p. ej. restos de .sbd vacíos) no aportan nada.
  const prune = (f: SrcFolder): boolean => !!f.mbox || f.eml.length > 0 || (f.children = f.children.filter(prune)).length > 0;
  return { folders: [...byName.values()].filter(prune), eml };
}

// ---------- Leer mensajes ----------
const FROM_LINE = /^From \S*.*(\d{4}|\d{1,2}:\d{2})/;

/** Recorre un mbox mensaje a mensaje sin cargarlo entero en memoria. */
async function* readMbox(file: string): AsyncGenerator<Buffer> {
  const rl = createInterface({ input: createReadStream(file, { encoding: 'latin1', highWaterMark: 1 << 20 }), crlfDelay: Infinity });
  let lines: string[] | null = null;
  let prevBlank = true;
  for await (const line of rl) {
    if (line.startsWith('From ') && (prevBlank || FROM_LINE.test(line))) {
      if (lines && lines.length) yield Buffer.from(lines.join('\n'), 'latin1');
      lines = [];
    } else if (lines) {
      lines.push(line.startsWith('>From ') ? line.slice(1) : line);
    }
    prevBlank = line === '';
  }
  if (lines && lines.length) yield Buffer.from(lines.join('\n'), 'latin1');
}

async function* readFolder(f: SrcFolder): AsyncGenerator<Buffer> {
  if (f.mbox) yield* readMbox(f.mbox);
  for (const file of f.eml) yield await readFile(file);
}

// ---------- Convertir ----------
type Addr = { name?: string; email: string };
type PMAddress = { name: string; address?: string; group?: { name: string; address: string }[] };
const addrs = (list?: PMAddress[]): Addr[] => (list ?? []).flatMap((a) =>
  a.group ? a.group.map((g) => ({ name: g.name || undefined, email: g.address })) : [{ name: a.name || undefined, email: a.address ?? '' }],
).filter((a) => a.email || a.name);
const ids = (s?: string) => (s ?? '').match(/<[^>]+>/g) ?? [];

interface Converted {
  messageKey: string; threadId: string; isReply: boolean; date: number; deleted: boolean;
  build: () => Promise<Record<string, unknown>>;
}

async function convert(raw: Buffer): Promise<Converted> {
  const mail = await PostalMime.parse(raw, { attachmentEncoding: 'arraybuffer' });
  const header = (k: string) => mail.headers.find((h) => h.key === k)?.value;
  const status = parseInt(header('x-mozilla-status') ?? '0', 16) || 0;
  const messageKey = mail.messageId?.trim() || 'sha1:' + createHash('sha1').update(raw).digest('hex');
  const refs = ids(mail.references);
  const replyTo = ids(mail.inReplyTo)[0];
  const threadId = refs[0] ?? replyTo ?? messageKey;
  const isReply = !!(refs.length || replyTo);
  const parsedDate = mail.date ? Date.parse(mail.date) : NaN;
  const date = Number.isFinite(parsedDate) ? parsedDate : 0;
  const fromList = addrs(mail.from ? [mail.from as PMAddress] : []);

  const build = async () => {
    let html = mail.html;
    let text = mail.text;
    let htmlStorageId: string | undefined;
    if (html && text) text = undefined; // el visor usa el HTML; el texto sólo duplicaría espacio
    const body = html ?? text ?? '';
    if (Buffer.byteLength(body) > MAX_INLINE_BODY) {
      const asHtml = html ?? `<pre style="white-space:pre-wrap">${body.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))}</pre>`;
      htmlStorageId = await upload(Buffer.from(asHtml), 'text/html; charset=utf-8');
      html = undefined; text = undefined;
    }
    const attachments = [];
    for (const [i, a] of mail.attachments.entries()) {
      const bytes = Buffer.from(a.content as ArrayBuffer);
      if (!bytes.length) continue;
      const cid = a.contentId?.replace(/^<|>$/g, '');
      const inline = !!cid && !!mail.html?.includes(`cid:${cid}`);
      const ext = a.mimeType.split('/')[1]?.split(/[;+]/)[0] ?? 'bin';
      attachments.push({
        filename: a.filename || `adjunto-${i + 1}.${ext}`, mimeType: a.mimeType || 'application/octet-stream',
        size: bytes.length, contentId: cid, inline, storageId: await upload(bytes, a.mimeType || 'application/octet-stream'),
      });
    }
    return {
      messageKey, threadId, isReply, replyCount: 0,
      from: fromList[0] ?? { email: '(sin remitente)' }, to: addrs(mail.to as PMAddress[]), cc: addrs(mail.cc as PMAddress[]),
      subject: mail.subject ?? '(sin asunto)', date,
      read: !!(status & 0x1), starred: !!(status & 0x4), tags: [],
      html, text, htmlStorageId, attachments,
    };
  };
  return { messageKey, threadId, isReply, date, deleted: !!(status & 0x8), build };
}

async function upload(bytes: Buffer, mime: string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      const url = await client!.mutation(api.importer.generateUploadUrl, { token: TOKEN });
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': mime }, body: bytes });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()).storageId;
    } catch (e) {
      if (attempt >= 4) throw e;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
}

// ---------- Importar ----------
const stats = { folders: 0, read: 0, imported: 0, skipped: 0, deleted: 0, failed: 0, bytes: 0 };

async function importFolder(f: SrcFolder, parentId: Id<'folders'> | undefined, order: number, path: string) {
  stats.folders++;
  const label = path ? `${path}/${f.name}` : f.name;
  const folderId = DRY ? undefined : await client!.mutation(api.importer.ensureFolder, {
    token: TOKEN, name: f.name, kind: kindOf(f.name, !parentId), parentId, order,
  });
  const threads = new Map<string, number>();
  let n = 0;
  let pending: Buffer[] = [];

  const flush = async () => {
    const raws = pending; pending = [];
    const conv: Converted[] = [];
    for (const r of raws) {
      try { conv.push(await convert(r)); } catch (e) { stats.failed++; console.warn(`\n  No se pudo leer un mensaje: ${(e as Error).message}`); }
    }
    const live = conv.filter((c) => { if (c.deleted) stats.deleted++; return !c.deleted; });
    for (const c of live) if (c.isReply) threads.set(c.threadId, (threads.get(c.threadId) ?? 0) + 1);
    if (DRY) { stats.imported += live.length; return; }
    const existing = new Set(await client!.query(api.importer.existingKeys, { token: TOKEN, folderId: folderId!, keys: live.map((c) => c.messageKey) }));
    const todo = live.filter((c) => !existing.has(c.messageKey) && !existing.has(c.messageKey));
    stats.skipped += live.length - todo.length;
    const docs: Record<string, unknown>[] = [];
    for (let i = 0; i < todo.length; i += PARALLEL) docs.push(...await Promise.all(todo.slice(i, i + PARALLEL).map((c) => c.build())));
    // Lotes por tamaño para no pasar el límite de argumentos de Convex.
    let batch: Record<string, unknown>[] = [], size = 0;
    const send = async () => {
      if (!batch.length) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stats.imported += await client!.mutation(api.importer.insertMessages, { token: TOKEN, folderId: folderId!, messages: batch as any });
      batch = []; size = 0;
    };
    for (const d of docs) {
      const s = JSON.stringify(d).length;
      if (batch.length && (size + s > BATCH_BYTES || batch.length >= BATCH_MSGS)) await send();
      batch.push(d); size += s;
    }
    await send();
  };

  for await (const raw of readFolder(f)) {
    if (n >= LIMIT) break;
    n++; stats.read++; stats.bytes += raw.length;
    pending.push(raw);
    if (pending.length >= BATCH_MSGS) await flush();
    process.stdout.write(`\r${label}: ${n} mensajes leídos (${(stats.bytes / 1e6).toFixed(0)} MB en total)   `);
  }
  await flush();
  if (!DRY && threads.size) {
    const counts = [...threads].map(([threadId, count]) => ({ threadId, count }));
    for (let i = 0; i < counts.length; i += 500)
      await client!.mutation(api.importer.setReplyCounts, { token: TOKEN, folderId: folderId!, counts: counts.slice(i, i + 500) });
  }
  if (n) process.stdout.write('\n');
  for (const [k, c] of f.children.entries()) await importFolder(c, folderId, k, label);
}

function kindOf(name: string, isTop: boolean) {
  const n = name.toLowerCase();
  if (isTop) return 'account' as const;
  if (['inbox', 'bandeja de entrada'].includes(n)) return 'inbox' as const;
  if (['trash', 'papelera'].includes(n)) return 'trash' as const;
  if (['sent', 'enviados'].includes(n)) return 'sent' as const;
  if (['drafts', 'borradores'].includes(n)) return 'drafts' as const;
  if (['unsent messages', 'bandeja de salida'].includes(n)) return 'outbox' as const;
  return 'folder' as const;
}

// ---------- Main ----------
const abs = resolve(srcPath);
const st = statSync(abs);
const rootName = opt('--name') ?? basename(abs).replace(/\.(sbd|mbox|mbx)$/i, '');
let root: SrcFolder;
if (st.isFile()) root = { name: rootName, mbox: abs, eml: [], children: [] };
else { const s = scan(abs); root = { name: rootName, eml: s.eml, children: s.folders }; }

const show = (f: SrcFolder, d = 0): string => `${'  '.repeat(d)}${f.name}${f.mbox ? '  [mbox]' : ''}${f.eml.length ? `  [${f.eml.length} .eml]` : ''}\n${f.children.map((c) => show(c, d + 1)).join('')}`;
console.log(`Estructura encontrada:\n${show(root)}`);
console.log(DRY ? 'Modo prueba: no se sube nada.\n' : `Subiendo a ${env.VITE_CONVEX_URL}\n`);

const t0 = Date.now();
await importFolder(root, undefined, 0, '');
console.log(`\nListo en ${((Date.now() - t0) / 1000).toFixed(0)} s: ${stats.folders} carpetas, ${stats.read} mensajes leídos, ` +
  `${stats.imported} ${DRY ? 'importables' : 'importados'}, ${stats.skipped} ya existían, ${stats.deleted} borrados (omitidos), ${stats.failed} con error.`);
