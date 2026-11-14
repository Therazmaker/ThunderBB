import { IconBroadcast, IconCalendar, IconChevronDown, IconCollapse } from './Icons';

export function StatusBar({ text }: { text: string }) {
  return (
    <footer className="statusbar">
      <button className="tb-icon sm" title="Barra de espacios"><IconCollapse size={14} /></button>
      <span className="sb-sep" />
      <span className="tb-icon sm" title="Conectado"><IconBroadcast size={14} /></span>
      <span className="sb-text">{text}</span>
      <span className="spacer" />
      <button className="sb-today"><IconCalendar size={16} /> Panel Para hoy <IconChevronDown size={12} /></button>
    </footer>
  );
}
