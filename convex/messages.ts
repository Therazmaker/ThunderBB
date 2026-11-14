import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { mutation, query } from './_generated/server';

/** Lista de una carpeta, de más reciente a más antiguo, por páginas. */
export const listByFolder = query({
  args: { folderId: v.id('folders'), paginationOpts: paginationOptsValidator },
  handler: (ctx, { folderId, paginationOpts }) =>
    ctx.db.query('messages')
      .withIndex('by_folder_date', (q) => q.eq('folderId', folderId))
      .order('desc')
      .paginate(paginationOpts),
});

/** Búsqueda por asunto/remitente en todo el archivo o en una carpeta. */
export const search = query({
  args: { q: v.string(), folderId: v.optional(v.id('folders')), limit: v.optional(v.number()) },
  handler: async (ctx, { q, folderId, limit }) => {
    const text = q.trim();
    if (!text) return [];
    return ctx.db.query('messages')
      .withSearchIndex('search', (s) => {
        const base = s.search('searchText', text);
        return folderId ? base.eq('folderId', folderId) : base;
      })
      .take(Math.min(limit ?? 300, 1000));
  },
});

/** Mensaje completo con cuerpo y URLs de los adjuntos. */
export const get = query({
  args: { id: v.id('messages') },
  handler: async (ctx, { id }) => {
    const msg = await ctx.db.get(id);
    if (!msg) return null;
    const body = await ctx.db.query('messageBodies').withIndex('by_message', (q) => q.eq('messageId', id)).unique();
    const atts = await ctx.db.query('attachments').withIndex('by_message', (q) => q.eq('messageId', id)).collect();
    const attachments = await Promise.all(atts.map(async (a) => ({
      id: a._id, filename: a.filename, mimeType: a.mimeType, size: a.size,
      contentId: a.contentId, inline: a.inline,
      url: (await ctx.storage.getUrl(a.storageId)) ?? '',
    })));
    let html = body?.html;
    // HTML demasiado grande para un documento: el cliente lo descarga del storage.
    const htmlUrl = !html && body?.htmlStorageId ? (await ctx.storage.getUrl(body.htmlStorageId)) ?? undefined : undefined;
    // Las imágenes inline (cid:xxx) se reemplazan por la URL del storage.
    if (html) for (const a of attachments) if (a.contentId) html = html.split(`cid:${a.contentId}`).join(a.url);
    return { ...msg, to: body?.to ?? [], cc: body?.cc ?? [], html, htmlUrl, text: body?.text, attachments };
  },
});

/** Leído / destacado. Mantiene al día el contador de no leídos de la carpeta. */
export const setFlags = mutation({
  args: { id: v.id('messages'), read: v.optional(v.boolean()), starred: v.optional(v.boolean()) },
  handler: async (ctx, { id, read, starred }) => {
    const msg = await ctx.db.get(id);
    if (!msg) return;
    const patch: { read?: boolean; starred?: boolean } = {};
    if (read !== undefined && read !== msg.read) {
      patch.read = read;
      const folder = await ctx.db.get(msg.folderId);
      if (folder) await ctx.db.patch(folder._id, { unread: Math.max(0, folder.unread + (read ? -1 : 1)) });
    }
    if (starred !== undefined) patch.starred = starred;
    await ctx.db.patch(id, patch);
  },
});
