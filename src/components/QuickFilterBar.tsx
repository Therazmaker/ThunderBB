import { forwardRef } from 'react';
import { IconClip, IconContact, IconEnvelope, IconPin, IconSearch, IconStar, IconTag } from './Icons';

export interface QuickFilter {
  text: string;
  sticky: boolean;
  unread: boolean;
  starred: boolean;
  contacts: boolean;
  tags: boolean;
  attachments: boolean;
}
export const emptyFilter: QuickFilter = { text: '', sticky: false, unread: false, starred: false, contacts: false, tags: false, attachments: false };

type Toggle = 'unread' | 'starred' | 'contacts' | 'tags' | 'attachments';

export const QuickFilterBar = forwardRef<HTMLInputElement, { f: QuickFilter; onChange: (f: QuickFilter) => void }>(
  function QuickFilterBar({ f, onChange }, ref) {
    const t = (k: Toggle | 'sticky') => onChange({ ...f, [k]: !f[k] });
    const btn = (k: Toggle, title: string, icon: JSX.Element) => (
      <button className={'qf-btn' + (f[k] ? ' on' : '')} title={title} aria-pressed={f[k]} onClick={() => t(k)}>{icon}</button>
    );
    return (
      <div className="quickfilter">
        <div className="qf-group">
          <button className={'qf-btn' + (f.sticky ? ' on' : '')} title="Mantener filtros al cambiar de carpeta" onClick={() => t('sticky')}><IconPin /></button>
        </div>
        <label className="qf-search">
          <input ref={ref} value={f.text} onChange={(e) => onChange({ ...f, text: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Escape') onChange({ ...f, text: '' }); }}
            aria-label="Filtrar mensajes" />
          {!f.text && <span className="fake-ph">Filtrar mensajes... <span className="kbd-hint"><kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>K</kbd></span></span>}
          <IconSearch />
        </label>
        <div className="qf-group">
          {btn('unread', 'No leídos', <IconEnvelope />)}
          {btn('starred', 'Destacados', <IconStar />)}
          {btn('contacts', 'Contactos', <IconContact />)}
          {btn('tags', 'Etiquetas', <IconTag />)}
          {btn('attachments', 'Adjuntos', <IconClip />)}
        </div>
      </div>
    );
  });
