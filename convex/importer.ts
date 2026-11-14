import { v, ConvexError } from 'convex/values';
import { mutation, query } from './_generated/server';
import { folderKind } from './schema';

/**
 * Mutaciones de carga, usadas por el conversor y por el seed.
 * Protegidas con IMPORT_TOKEN (npx convex env set IMPORT_TOKEN ...).
 */
function checkToken(token: string) {
  const expected = process.env.IMPORT_TOKEN;
  if (!expected || token !== expected) throw new ConvexError('IMPORT_TOKEN inválido o no configurado');
}

const address = v.object({ name: v.optional(v.string()), email: v.string() });

export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    checkToken(token);
    return ctx.storage.generateUploadUrl();
  },
});

/** Crea la carpeta si no existe (mismo nombre bajo el mismo padre) y devuelve su id. */
export const ensureFolder = mutation({
  args: { token: v.string(), name: v.string(), kind: folderKind, parentId: v.optional(v.id('folders')), order: v.number() },
  handler: async (ctx, { token, name, kind, parentId, order }) => {
    checkToken(token);
    const siblings = await ctx.db.query('folders').withIndex('by_parent', (q) => q.eq('parentId', parentId)).collect();
    const found = siblings.find((f) => f.name === name);
    if (found) return found._id;
    return ctx.db.insert('folders', { name, kind, parentId, order, total: 0, unread: 0 });
  },
});

/** Inserta un lote de mensajes (recomendado: ≤ 200 por llamada). */
export const insertMessages = mutation({
  args: {
    token: v.string(),
    folderId: v.id('folders'),
    messages: v.array(v.object({
      messageKey: v.optional(v.string()),
      threadId: v.string(),
      isReply: v.boolean(),
      replyCount: v.number(),
      from: address,
      to: v.array(address),
      cc: v.array(address),
      subject: v.string(),
      date: v.number(),
      read: v.boolean(),
      starred: v.boolean(),
      tags: v.array(v.string()),
      html: v.optional(v.string()),
      text: v.optional(v.string()),
      htmlStorageId: v.optional(v.id('_storage')),
      attachments: v.array(v.object({
        filename: v.string(), mimeType: v.string(), size: v.number(),
        storageId: v.id('_storage'), contentId: v.optional(v.string()), inline: v.boolean(),
      })),
    })),
  },
  handler: async (ctx, { token, folderId, messages }) => {
    checkToken(token);
    const folder = await ctx.db.get(folderId);
    if (!folder) throw new ConvexError('Carpeta inexistente');
    let unread = 0, inserted = 0;
    for (const m of messages) {
      if (m.messageKey) {
        const dup = await ctx.db.query('messages')
          .withIndex('by_folder_key', (q) => q.eq('folderId', folderId).eq('messageKey', m.messageKey)).first();
        if (dup) continue;
      }
      inserted++;
      const id = await ctx.db.insert('messages', {
        messageKey: m.messageKey,
        folderId, threadId: m.threadId, isReply: m.isReply, replyCount: m.replyCount,
        fromName: m.from.name, fromEmail: m.from.email, subject: m.subject, date: m.date,
        hasAttachments: m.attachments.some((a) => !a.inline),
        read: m.read, starred: m.starred, tags: m.tags,
        searchText: `${m.subject} ${m.from.name ?? ''} ${m.from.email}`,
      });
      await ctx.db.insert('messageBodies', { messageId: id, to: m.to, cc: m.cc, html: m.html, text: m.text, htmlStorageId: m.htmlStorageId });
      for (const a of m.attachments) await ctx.db.insert('attachments', { messageId: id, ...a });
      if (!m.read) unread++;
    }
    await ctx.db.patch(folderId, { total: folder.total + inserted, unread: folder.unread + unread });
    return inserted;
  },
});

/** Cuáles de estas claves ya están importadas en la carpeta (para no volver a subir adjuntos). */
export const existingKeys = query({
  args: { token: v.string(), folderId: v.id('folders'), keys: v.array(v.string()) },
  handler: async (ctx, { token, folderId, keys }) => {
    checkToken(token);
    const found: string[] = [];
    for (const k of keys) {
      const doc = await ctx.db.query('messages')
        .withIndex('by_folder_key', (q) => q.eq('folderId', folderId).eq('messageKey', k)).first();
      if (doc) found.push(k);
    }
    return found;
  },
});

/** Fija el número de respuestas en el mensaje raíz de cada hilo. */
export const setReplyCounts = mutation({
  args: { token: v.string(), folderId: v.id('folders'), counts: v.array(v.object({ threadId: v.string(), count: v.number() })) },
  handler: async (ctx, { token, folderId, counts }) => {
    checkToken(token);
    for (const { threadId, count } of counts) {
      const root = await ctx.db.query('messages')
        .withIndex('by_folder_thread', (q) => q.eq('folderId', folderId).eq('threadId', threadId).eq('isReply', false)).first();
      if (root && root.replyCount !== count) await ctx.db.patch(root._id, { replyCount: count });
    }
  },
});

/** Borra datos por lotes (para rehacer una importación de prueba). Llamar hasta que devuelva 0. */
export const wipeBatch = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    checkToken(token);
    let n = 0;
    for (const table of ['attachments', 'messageBodies', 'messages', 'folders'] as const) {
      const docs = await ctx.db.query(table).take(500 - n);
      for (const d of docs) {
        if (table === 'attachments') await ctx.storage.delete((d as { storageId: import('./_generated/dataModel').Id<'_storage'> }).storageId);
        await ctx.db.delete(d._id);
      }
      n += docs.length;
      if (n >= 500) break;
    }
    return n;
  },
});
