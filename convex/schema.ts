import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const folderKind = v.union(
  v.literal('root'), v.literal('account'), v.literal('folder'), v.literal('trash'),
  v.literal('outbox'), v.literal('inbox'), v.literal('sent'), v.literal('drafts'),
);

export default defineSchema({
  folders: defineTable({
    name: v.string(),
    kind: folderKind,
    parentId: v.optional(v.id('folders')),
    order: v.number(),
    total: v.number(),
    unread: v.number(),
  }).index('by_parent', ['parentId', 'order']),

  /** Fila ligera: lo que pinta la lista. El cuerpo va aparte. */
  messages: defineTable({
    folderId: v.id('folders'),
    /** Identificador del hilo (p. ej. el Message-ID del primer correo). */
    threadId: v.string(),
    isReply: v.boolean(),
    replyCount: v.number(),
    fromName: v.optional(v.string()),
    fromEmail: v.string(),
    subject: v.string(),
    /** Epoch en milisegundos. */
    date: v.number(),
    hasAttachments: v.boolean(),
    read: v.boolean(),
    starred: v.boolean(),
    tags: v.array(v.string()),
    /** Asunto + remitente normalizados, para el índice de búsqueda. */
    searchText: v.string(),
  })
    .index('by_folder_date', ['folderId', 'date'])
    .searchIndex('search', { searchField: 'searchText', filterFields: ['folderId'] }),

  /** Cuerpo y destinatarios. Un documento Convex admite hasta 1 MB; los HTML más grandes van a storage. */
  messageBodies: defineTable({
    messageId: v.id('messages'),
    to: v.array(v.object({ name: v.optional(v.string()), email: v.string() })),
    cc: v.array(v.object({ name: v.optional(v.string()), email: v.string() })),
    html: v.optional(v.string()),
    text: v.optional(v.string()),
    htmlStorageId: v.optional(v.id('_storage')),
  }).index('by_message', ['messageId']),

  /** Adjuntos e imágenes inline: el binario vive en el storage de Convex, no en base64. */
  attachments: defineTable({
    messageId: v.id('messages'),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    storageId: v.id('_storage'),
    /** Content-ID para imágenes inline referenciadas como cid: en el HTML. */
    contentId: v.optional(v.string()),
    inline: v.boolean(),
  }).index('by_message', ['messageId']),
});
