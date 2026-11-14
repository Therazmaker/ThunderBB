import type { Folder } from '../types';
import { IconChevronDown, IconChevronRight, IconCloudDown, IconDots, IconFolder, IconFolderBlue, IconOutbox, IconPlus, IconTrash } from './Icons';

interface Props {
  tree: Folder[];
  selectedId: string | null;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}

function FolderIcon({ f }: { f: Folder }) {
  switch (f.kind) {
    case 'root': return <IconFolderBlue />;
    case 'trash': return <IconTrash />;
    case 'outbox': return <IconOutbox />;
    default: return <IconFolder />;
  }
}

function Row({ f, depth, p }: { f: Folder; depth: number; p: Props }) {
  const open = p.expanded.has(f.id);
  const has = f.children.length > 0;
  return (
    <li role="treeitem" aria-expanded={has ? open : undefined} aria-selected={p.selectedId === f.id}>
      <div className={'folder-row' + (p.selectedId === f.id ? ' selected' : '') + (f.kind === 'root' ? ' root' : '')}
        style={{ paddingInlineStart: 6 + depth * 16 }}
        onClick={() => p.onSelect(f.id)}
        onDoubleClick={() => has && p.onToggle(f.id)}
        title={f.name}>
        <span className="twisty" onClick={(e) => { e.stopPropagation(); if (has) p.onToggle(f.id); }}>
          {has ? (open ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />) : null}
        </span>
        <FolderIcon f={f} />
        <span className="folder-name">{f.name}</span>
        {f.unread > 0 && <span className="folder-unread">{f.unread}</span>}
      </div>
      {has && open && (
        <ul role="group">{f.children.map((c) => <Row key={c.id} f={c} depth={depth + 1} p={p} />)}</ul>
      )}
    </li>
  );
}

export function FolderPane(props: Props) {
  return (
    <aside className="folder-pane">
      <div className="folder-header">
        <button className="tb-icon" title="Recibir mensajes"><IconCloudDown /></button>
        <button className="new-msg" disabled title="Archivo de sólo lectura"><IconPlus size={14} /> Nuevo mensaje</button>
        <button className="tb-icon" title="Opciones del panel de carpetas"><IconDots /></button>
      </div>
      <ul className="folder-tree" role="tree">
        {props.tree.map((f) => <Row key={f.id} f={f} depth={0} p={props} />)}
      </ul>
    </aside>
  );
}
