import { useEffect, useRef, useState } from 'react';

export interface MenuItem { label: string; shortcut?: string; checked?: boolean; disabled?: boolean; onClick?: () => void; separator?: boolean }
export interface Menu { label: string; accessKey: string; items: MenuItem[] }

export function MenuBar({ menus }: { menus: Menu[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('mousedown', close); window.removeEventListener('keydown', esc); };
  }, []);
  return (
    <nav className="menubar" ref={ref}>
      {menus.map((m, i) => {
        const idx = m.label.toLowerCase().indexOf(m.accessKey.toLowerCase());
        return (
          <div key={m.label} className="menu-wrap">
            <button className={'menu-btn' + (open === i ? ' open' : '')}
              onClick={() => setOpen(open === i ? null : i)}
              onMouseEnter={() => open !== null && setOpen(i)}>
              {idx >= 0 ? <>{m.label.slice(0, idx)}<u>{m.label[idx]}</u>{m.label.slice(idx + 1)}</> : m.label}
            </button>
            {open === i && (
              <div className="menu-popup" role="menu">
                {m.items.map((it, j) => it.separator ? <hr key={j} /> : (
                  <button key={j} role="menuitem" disabled={it.disabled} className="menu-item"
                    onClick={() => { setOpen(null); it.onClick?.(); }}>
                    <span className="menu-check">{it.checked ? '✓' : ''}</span>
                    <span className="menu-label">{it.label}</span>
                    <span className="menu-shortcut">{it.shortcut}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
