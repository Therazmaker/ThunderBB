import { useEffect, useMemo, useRef, useState } from 'react';
import type { MessageSummary } from '../types';
import { IconChevronRight, IconClip, IconFilter, IconKebab, IconListOptions, IconStar, IconThread } from './Icons';
import { QuickFilterBar, type QuickFilter } from './QuickFilterBar';
import { formatAddress, formatDate } from '../format';

const ROW_H = 70;
const OVERSCAN = 8;

interface Props {
  folderName: string;
  messages: MessageSummary[];
  totalInFolder: number;
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleStar: (id: string) => void;
  showQuickFilter: boolean;
  onToggleQuickFilter: () => void;
  filter: QuickFilter;
  onFilter: (f: QuickFilter) => void;
  /** true cuando hay filtros activos: la lista se muestra plana, sin hilos. */
  flat: boolean;
  filterInputRef: React.Ref<HTMLInputElement>;
}

interface Row { m: MessageSummary; depth: number }

export function MessageList(p: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(600);

  const rows: Row[] = useMemo(() => {
    const sorted = [...p.messages].sort((a, b) => (a.date < b.date ? 1 : -1));
    if (p.flat) return sorted.map((m) => ({ m, depth: 0 }));
    const replies = new Map<string, MessageSummary[]>();
    for (const m of sorted) if (m.parentId) {
      const arr = replies.get(m.parentId) ?? [];
      arr.push(m);
      replies.set(m.parentId, arr);
    }
    const out: Row[] = [];
    for (const m of sorted) {
      if (m.parentId) continue;
      out.push({ m, depth: 0 });
      if (expanded.has(m.id)) for (const r of (replies.get(m.id) ?? []).reverse()) out.push({ m: r, depth: 1 });
    }
    return out;
  }, [p.messages, p.flat, expanded]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); setExpanded(new Set()); }, [p.folderName]);

  const toggleThread = (id: string) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const ensureVisible = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const top = index * ROW_H;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (top + ROW_H > el.scrollTop + el.clientHeight) el.scrollTop = top + ROW_H - el.clientHeight;
  };

  const onKey = (e: React.KeyboardEvent) => {
    const i = rows.findIndex((r) => r.m.id === p.selectedId);
    let next = i;
    if (e.key === 'ArrowDown') next = Math.min(rows.length - 1, i + 1);
    else if (e.key === 'ArrowUp') next = Math.max(0, i - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = rows.length - 1;
    else if (e.key === 'PageDown') next = Math.min(rows.length - 1, i + Math.floor(height / ROW_H));
    else if (e.key === 'PageUp') next = Math.max(0, i - Math.floor(height / ROW_H));
    else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && i >= 0) {
      const m = rows[i].m;
      if (m.replyCount > 0 && (e.key === 'ArrowRight') !== expanded.has(m.id)) toggleThread(m.id);
      e.preventDefault();
      return;
    } else if (e.key === 's' && i >= 0) { p.onToggleStar(rows[i].m.id); return; }
    else return;
    e.preventDefault();
    if (next >= 0 && rows[next]) { p.onSelect(rows[next].m.id); ensureVisible(next); }
  };

  const first = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const last = Math.min(rows.length, Math.ceil((scrollTop + height) / ROW_H) + OVERSCAN);

  return (
    <section className="list-pane">
      <div className="list-header">
        <span className="list-folder">{p.folderName}</span>
        <span className="list-count">{p.flat ? `${p.messages.length} de ${p.totalInFolder}` : p.totalInFolder} Mensajes</span>
        <span className="spacer" />
        <button className={'qf-toggle' + (p.showQuickFilter ? ' on' : '')} onClick={p.onToggleQuickFilter} aria-pressed={p.showQuickFilter}>
          <IconFilter /> Filtro rápido
        </button>
        <button className="tb-icon" title="Opciones de visualización de la lista"><IconListOptions /></button>
      </div>
      {p.showQuickFilter && <QuickFilterBar ref={p.filterInputRef} f={p.filter} onChange={p.onFilter} />}
      <div className="cards" ref={scrollRef} tabIndex={0} onKeyDown={onKey}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)} role="listbox" aria-label="Mensajes">
        {p.loading ? <div className="list-empty">Cargando…</div>
          : rows.length === 0 ? <div className="list-empty">{p.flat ? 'Ningún mensaje coincide con los filtros' : 'Esta carpeta está vacía'}</div>
          : (
            <div style={{ height: rows.length * ROW_H, position: 'relative' }}>
              {rows.slice(first, last).map(({ m, depth }, k) => {
                const idx = first + k;
                const sel = m.id === p.selectedId;
                return (
                  <div key={m.id} role="option" aria-selected={sel}
                    className={'card' + (sel ? ' selected' : '') + (m.read ? '' : ' unread') + (depth ? ' reply' : '')}
                    style={{ top: idx * ROW_H + 4, insetInlineStart: 4 + depth * 18 }}
                    onClick={() => { p.onSelect(m.id); scrollRef.current?.focus(); }}>
                    <div className="card-line1">
                      <span className="card-from">{formatAddress(m.from)}</span>
                      <span className="card-date">{formatDate(m.date)}</span>
                      <span className="card-menu"><IconKebab size={14} /></span>
                    </div>
                    <div className="card-subject">{m.subject}</div>
                    <div className="card-line3">
                      {m.replyCount > 0 && !p.flat && (
                        <button className={'card-replies' + (expanded.has(m.id) ? ' open' : '')}
                          onClick={(e) => { e.stopPropagation(); toggleThread(m.id); }}>
                          <IconThread size={14} /> {m.replyCount} {m.replyCount === 1 ? 'respuesta' : 'respuestas'} <IconChevronRight size={11} />
                        </button>
                      )}
                      <span className="spacer" />
                      {m.hasAttachments && <span className="card-clip" title="Tiene adjuntos"><IconClip size={14} /></span>}
                      <button className={'card-star' + (m.starred ? ' on' : '')} title={m.starred ? 'Quitar destacado' : 'Destacar'}
                        onClick={(e) => { e.stopPropagation(); p.onToggleStar(m.id); }}>
                        <IconStar size={15} filled={m.starred} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </section>
  );
}
