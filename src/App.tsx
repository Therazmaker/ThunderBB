import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Folder, MessageDetail, MessageSummary } from './types';
import { source, usingConvex } from './data';
import { TitleBar } from './components/TitleBar';
import { MenuBar, type Menu } from './components/MenuBar';
import { FolderPane } from './components/FolderPane';
import { MessageList } from './components/MessageList';
import { emptyFilter, type QuickFilter } from './components/QuickFilterBar';
import { MessageReader, StartPage } from './components/MessageReader';
import { StatusBar } from './components/StatusBar';

function walk(list: Folder[], fn: (f: Folder) => void) { for (const f of list) { fn(f); walk(f.children, fn); } }
function useDebounced<T>(v: T, ms: number) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const matches = (m: MessageSummary, q: string) =>
  norm(`${m.subject} ${m.from.name ?? ''} ${m.from.email}`).includes(q);

type Overrides = Record<string, { read?: boolean; starred?: boolean }>;

export default function App() {
  const [tree, setTree] = useState<Folder[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [folderId, setFolderId] = useState<string | null>(null);
  const [raw, setRaw] = useState<MessageSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MessageDetail | null>(null);
  const [overrides, setOverrides] = useState<Overrides>({});
  const [filter, setFilter] = useState<QuickFilter>(emptyFilter);
  const [showQF, setShowQF] = useState(true);
  const [query, setQuery] = useState('');
  const [showFolders, setShowFolders] = useState(true);
  const [showReader, setShowReader] = useState(true);
  const [folderW, setFolderW] = useState(212);
  const [listW, setListW] = useState(566);
  const searchRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  const dq = useDebounced(norm(query.trim()), 200);
  const [searchResults, setSearchResults] = useState<MessageSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : String(e));

  // Árbol inicial: todo expandido y la primera carpeta con mensajes seleccionada.
  useEffect(() => {
    source.getFolderTree().then((t) => {
      setTree(t);
      const ids = new Set<string>();
      let firstLeaf: string | null = null;
      walk(t, (f) => { if (f.children.length) ids.add(f.id); else if (!firstLeaf && f.total > 0) firstLeaf = f.id; });
      setExpanded(ids);
      setFolderId(firstLeaf);
    }).catch(fail);
  }, []);

  const folderMap = useMemo(() => { const m = new Map<string, Folder>(); walk(tree, (f) => m.set(f.id, f)); return m; }, [tree]);
  const folder = folderId ? folderMap.get(folderId) : undefined;

  useEffect(() => {
    if (!folderId) return;
    let live = true;
    setLoading(true);
    setRaw([]);
    setSelectedId(null);
    source.listMessages(folderId, (partial) => { if (live) { setRaw(partial); setLoading(false); } })
      .then((ms) => { if (live) { setRaw(ms); setLoading(false); } })
      .catch(fail);
    setFilter((f) => (f.sticky ? f : { ...emptyFilter }));
    return () => { live = false; };
  }, [folderId]);

  // Búsqueda global en todo el archivo.
  useEffect(() => {
    if (!dq) { setSearchResults(null); return; }
    let live = true;
    source.search(dq).then((r) => { if (live) setSearchResults(r); }).catch(fail);
    return () => { live = false; };
  }, [dq]);

  const apply = useCallback((m: MessageSummary): MessageSummary => {
    const o = overrides[m.id];
    return o ? { ...m, ...o } : m;
  }, [overrides]);

  const searching = !!dq && !!searchResults;
  const fq = norm(filter.text.trim());
  const filtering = !!fq || filter.unread || filter.starred || filter.contacts || filter.tags || filter.attachments;

  const visible = useMemo(() => {
    let list = (searching ? searchResults! : raw).map(apply);
    if (fq) list = list.filter((m) => matches(m, fq));
    if (filter.unread) list = list.filter((m) => !m.read);
    if (filter.starred) list = list.filter((m) => m.starred);
    if (filter.tags) list = list.filter((m) => m.tags.length > 0);
    if (filter.attachments) list = list.filter((m) => m.hasAttachments);
    return list;
  }, [searching, searchResults, raw, apply, fq, filter]);

  // Carga del mensaje abierto.
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    let live = true;
    source.getMessage(selectedId).then((d) => {
      if (!live || !d) return;
      setDetail(d);
      if (!d.read && overridesRef.current[d.id]?.read === undefined) setRead(d.id, true);
    }).catch(fail);
    return () => { live = false; };
  }, [selectedId]);

  const overridesRef = useRef(overrides);
  overridesRef.current = overrides;
  const setRead = (id: string, read: boolean) => {
    setOverrides((o) => ({ ...o, [id]: { ...o[id], read } }));
    source.setFlags(id, { read }).catch(fail);
  };
  const toggleStar = (id: string) => {
    const base = [...raw, ...(searchResults ?? [])].find((m) => m.id === id) ?? (detail?.id === id ? detail : undefined);
    if (!base) return;
    const starred = !apply(base).starred;
    setOverrides((o) => ({ ...o, [id]: { ...o[id], starred } }));
    source.setFlags(id, { starred }).catch(fail);
  };

  // Atajos globales.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (e.shiftKey) { setShowQF(true); setTimeout(() => filterRef.current?.focus()); }
        else searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const startDrag = (which: 'folder' | 'list') => (e: React.PointerEvent) => {
    e.preventDefault();
    const x0 = e.clientX;
    const w0 = which === 'folder' ? folderW : listW;
    const move = (ev: PointerEvent) => {
      const w = Math.max(which === 'folder' ? 150 : 300, Math.min(900, w0 + ev.clientX - x0));
      (which === 'folder' ? setFolderW : setListW)(w);
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); document.body.classList.remove('dragging'); };
    document.body.classList.add('dragging');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const totalMessages = useMemo(() => { let n = 0; walk(tree, (f) => (n += f.total)); return n; }, [tree]);
  const detailView = detail && selectedId === detail.id ? { ...detail, ...overrides[detail.id] } : null;

  const menus: Menu[] = [
    { label: 'Archivo', accessKey: 'A', items: [
      { label: 'Nuevo', disabled: true },
      { label: 'Abrir mensaje guardado…', disabled: true },
      { separator: true, label: '' },
      { label: 'Guardar adjuntos', disabled: !detailView?.attachments.length, onClick: () => detailView?.attachments.forEach((a) => { const l = document.createElement('a'); l.href = a.url; l.download = a.filename; l.click(); }) },
      { label: 'Imprimir…', shortcut: 'Ctrl+P', onClick: () => window.print() },
    ] },
    { label: 'Editar', accessKey: 'E', items: [
      { label: 'Buscar en el archivo', shortcut: 'Ctrl+K', onClick: () => searchRef.current?.focus() },
      { label: 'Filtro rápido', shortcut: 'Ctrl+Shift+K', onClick: () => { setShowQF(true); setTimeout(() => filterRef.current?.focus()); } },
    ] },
    { label: 'Ver', accessKey: 'V', items: [
      { label: 'Panel de carpetas', checked: showFolders, onClick: () => setShowFolders((v) => !v) },
      { label: 'Panel de mensajes', checked: showReader, shortcut: 'F8', onClick: () => setShowReader((v) => !v) },
      { label: 'Barra de filtro rápido', checked: showQF, onClick: () => setShowQF((v) => !v) },
    ] },
    { label: 'Ir', accessKey: 'I', items: [
      { label: 'Mensaje siguiente', disabled: true }, { label: 'Mensaje anterior', disabled: true },
    ] },
    { label: 'Mensaje', accessKey: 'M', items: [
      { label: detailView?.starred ? 'Quitar destacado' : 'Destacar', shortcut: 'S', disabled: !detailView, onClick: () => detailView && toggleStar(detailView.id) },
      { label: 'Marcar como no leído', disabled: !detailView, onClick: () => detailView && setRead(detailView.id, false) },
    ] },
    { label: 'Eventos y tareas', accessKey: 'n', items: [{ label: 'No disponible en el archivo', disabled: true }] },
    { label: 'Herramientas', accessKey: 'T', items: [{ label: 'Importar correos (próximamente)', disabled: true }] },
    { label: 'Ayuda', accessKey: 'y', items: [{ label: 'Atajos de teclado', onClick: () => setSelectedId(null) }] },
  ];

  const listTitle = searching ? `Resultados para "${query.trim()}"` : folder?.name ?? '';

  return (
    <div className="app">
      <TitleBar ref={searchRef} query={query} onQuery={setQuery} onToggleFolders={() => setShowFolders((v) => !v)} />
      <MenuBar menus={menus} />
      <main className="panes">
        {showFolders && <>
          <div style={{ width: folderW, flex: 'none', display: 'flex' }}>
            <FolderPane tree={tree} selectedId={searching ? null : folderId} expanded={expanded}
              onToggle={(id) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; })}
              onSelect={(id) => { setQuery(''); setFolderId(id); }} />
          </div>
          <div className="splitter" onPointerDown={startDrag('folder')} />
        </>}
        <div style={showReader ? { width: listW, flex: 'none', display: 'flex' } : { flex: 1, display: 'flex' }}>
          <MessageList folderName={listTitle} messages={visible}
            totalInFolder={searching ? visible.length : folder?.total ?? 0}
            loading={loading} selectedId={selectedId} onSelect={setSelectedId} onToggleStar={toggleStar}
            showQuickFilter={showQF} onToggleQuickFilter={() => setShowQF((v) => !v)}
            filter={filter} onFilter={setFilter} flat={filtering || searching} filterInputRef={filterRef} />
        </div>
        {showReader && <>
          <div className="splitter" onPointerDown={startDrag('list')} />
          <div className="reader-pane">
            {detailView ? <MessageReader msg={detailView} onToggleStar={() => toggleStar(detailView.id)} />
              : <StartPage folders={folderMap.size} messages={totalMessages} />}
          </div>
        </>}
      </main>
      {error && <div className="error-bar" role="alert">Error al cargar datos: {error} <button onClick={() => setError(null)}>Cerrar</button></div>}
      <StatusBar text={[usingConvex ? 'Convex' : 'Datos de prueba', loading ? 'Cargando carpeta…' : searching ? `${visible.length} resultados` : `${raw.length.toLocaleString('es-ES')} cargados`].join(' · ')} />
    </div>
  );
}
