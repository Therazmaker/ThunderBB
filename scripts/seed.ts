/**
 * Carga los datos ficticios en Convex para probar el visor.
 *
 *   npm run seed               # todo (~11k mensajes)
 *   npm run seed -- --limit 300  # sólo N mensajes por carpeta
 *   npm run seed -- --wipe       # borra todo antes de cargar
 *
 * Lee VITE_CONVEX_URL de .env.local e IMPORT_TOKEN del entorno o de .env.local.
 */
import { loadEnv } from './env.js';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';
import type { Id } from '../convex/_generated/dataModel.js';
import { mockSource } from '../src/data/mockSource.js';
import type { Folder } from '../src/types.js';

const env = loadEnv();
const url = env.VITE_CONVEX_URL ?? '';
const token = env.IMPORT_TOKEN ?? '';
if (!url || !token) { console.error('Faltan VITE_CONVEX_URL o IMPORT_TOKEN'); process.exit(1); }

const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;
const client = new ConvexHttpClient(url);
const BATCH = 100;

async function upload(dataUrl: string, mime: string): Promise<Id<'_storage'>> {
  const bytes = Buffer.from(dataUrl.split(',')[1], 'base64');
  const postUrl = await client.mutation(api.importer.generateUploadUrl, { token });
  const res = await fetch(postUrl, { method: 'POST', headers: { 'Content-Type': mime }, body: bytes });
  if (!res.ok) throw new Error(`Subida fallida: ${res.status}`);
  return (await res.json()).storageId;
}

async function loadFolder(f: Folder, parentId: Id<'folders'> | undefined, order: number) {
  const id = await client.mutation(api.importer.ensureFolder, { token, name: f.name, kind: f.kind, parentId, order });
  if (f.total > 0) {
    const all = (await mockSource.listMessages(f.id)).slice(0, limit);
    for (let i = 0; i < all.length; i += BATCH) {
      const batch = await Promise.all(all.slice(i, i + BATCH).map(async (s) => {
        const d = (await mockSource.getMessage(s.id))!;
        const attachments = await Promise.all(d.attachments.map(async (a) => ({
          filename: a.filename, mimeType: a.mimeType, size: a.size, inline: false,
          storageId: await upload(a.url, a.mimeType),
        })));
        return {
          threadId: d.threadId, isReply: !!d.parentId, replyCount: d.replyCount,
          from: d.from, to: d.to, cc: d.cc, subject: d.subject, date: Date.parse(d.date),
          read: d.read, starred: d.starred, tags: d.tags, html: d.html, text: d.text, attachments,
        };
      }));
      await client.mutation(api.importer.insertMessages, { token, folderId: id, messages: batch });
      process.stdout.write(`\r${f.name} (${f.id}): ${Math.min(i + BATCH, all.length)}/${all.length}   `);
    }
    process.stdout.write('\n');
  }
  for (const [k, c] of f.children.entries()) await loadFolder(c, id, k);
}

if (args.includes('--wipe')) {
  let n: number, total = 0;
  do { n = await client.mutation(api.importer.wipeBatch, { token }); total += n; } while (n > 0);
  console.log(`Borrados ${total} documentos`);
}
const tree = await mockSource.getFolderTree();
for (const [k, f] of tree.entries()) await loadFolder(f, undefined, k);
console.log('Listo.');
