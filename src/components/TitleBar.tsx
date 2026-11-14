import { forwardRef } from 'react';
import { IconChevronDown, IconClose, IconMaximize, IconMenu, IconMinimize, IconSearch, IconSidebar } from './Icons';

interface Props {
  query: string;
  onQuery: (q: string) => void;
  onToggleFolders: () => void;
}

export const TitleBar = forwardRef<HTMLInputElement, Props>(function TitleBar({ query, onQuery, onToggleFolders }, ref) {
  return (
    <header className="titlebar">
      <button className="tb-icon" title="Mostrar/ocultar panel de carpetas" onClick={onToggleFolders}><IconSidebar /></button>
      <div className="titlebar-tab" />
      <label className="global-search">
        <input ref={ref} value={query} onChange={(e) => onQuery(e.target.value)} aria-label="Buscar" />
        {!query && <span className="fake-ph">Buscar... <span className="kbd-hint"><kbd>CTRL</kbd>+<kbd>K</kbd></span></span>}
        <IconSearch />
      </label>
      <div className="titlebar-right">
        <button className="tb-addon" title="Exportar"><span className="addon-dot" />Exportar <IconChevronDown size={12} /></button>
        <button className="tb-icon" title="Menú de aplicación"><IconMenu /></button>
        <div className="win-controls" aria-hidden>
          <span><IconMinimize /></span><span><IconMaximize /></span><span><IconClose /></span>
        </div>
      </div>
    </header>
  );
});
