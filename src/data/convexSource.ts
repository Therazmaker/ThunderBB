import { ConvexHttpClient } from 'convex/browser';
import type { PaginationResult } from 'convex/server';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import type { Folder, MessageDetail, MessageSummary } from '../types';
import type { MailSource } from './source';

const PAGE = 1000;

function toSummary(m: Doc<'messages'>, parentId?: string): MessageSummary {
  return {
    id: m._id, folderId: m.folderId, threadId: m.threadId, replyCount: m.replyCount,
    parentId: m.isReply ? parentId : undefined,
    from: { name: m.fromName, email: m.fromEmail }, subject: m.subject,
    date: new Date(m.date).toISOString(), hasAttachments: m.hasAttachments,
    read: m.read, starred: m.starred, tags: m.tags,
  };
}

export function createConvexSource(url: string): MailSource {
  const client = new ConvexHttpClient(url);
  return {
    async getFolderTree() {
      const flat = await client.query(api.folders.list, {});
      const nodes = new Map<string, Folder>(flat.map((f) => [f._id, {
        id: f._id, name: f.name, kind: f.kind, total: f.total, unread: f.unread, children: [],
      }]));
      const roots: Folder[] = [];
      for (const f of [...flat].sort((a, b) => a.order - b.order)) {
        const node = nodes.get(f._id)!;
        (f.parentId ? nodes.get(f.parentId)?.children ?? roots : roots).push(node);
      }
      return roots;
    },

    async listMessages(folderId, onPage) {
      const docs: Doc<'messages'>[] = [];
      let cursor: string | null = null;
      for (;;) {
        const res: PaginationResult<Doc<'messages'>> = await client.query(api.messages.listByFolder, {
          folderId: folderId as Id<'folders'>, paginationOpts: { numItems: PAGE, cursor },
        });
        docs.push(...res.page);
        if (onPage && !res.isDone) onPage(link(docs));
        if (res.isDone) break;
        cursor = res.continueCursor;
      }
      return link(docs);
    },

    async getMessage(id) {
      const m = await client.query(api.messages.get, { id: id as Id<'messages'> });
      if (!m) return null;
      let html = m.html;
      if (!html && m.htmlUrl) html = await fetch(m.htmlUrl).then((r) => r.text());
      const detail: MessageDetail = {
        ...toSummary(m), to: m.to, cc: m.cc, html, text: m.text,
        attachments: m.attachments.filter((a) => !a.inline),
      };
      return detail;
    },

    async search(q) {
      const res = await client.query(api.messages.search, { q, limit: 500 });
      return res.map((m) => toSummary(m));
    },

    async setFlags(id, flags) {
      await client.mutation(api.messages.setFlags, { id: id as Id<'messages'>, ...flags });
    },
  };
}

/** Las respuestas apuntan al mensaje raíz de su hilo (para el botón "N respuestas"). */
function link(docs: Doc<'messages'>[]): MessageSummary[] {
  const roots = new Map<string, string>();
  for (const d of docs) if (!d.isReply) roots.set(d.threadId, d._id);
  return docs.map((d) => toSummary(d, roots.get(d.threadId)));
}
