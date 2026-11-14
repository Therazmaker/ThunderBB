import { useMemo } from 'react';
import type { Address, MessageDetail } from '../types';
import { formatLongDate, formatSize } from '../format';
import { IconArchive, IconChevronDown, IconClip, IconDownload, IconForward, IconReply, IconReplyAll, IconStar, IconTrash } from './Icons';

const COLORS = ['#0061e0', '#2a7f62', '#b5007f', '#d96d00', '#6b3fa0', '#00838f', '#c62828'];
function Avatar({ a }: { a: Address }) {
  const label = (a.name ?? a.email).trim();
  const color = COLORS[[...label].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORS.length];
  return <span className="avatar" style={{ background: color }}>{label[0]?.toUpperCase()}</span>;
}

function AddrList({ list }: { list: Address[] }) {
  return <>{list.map((a, i) => (
    <span key={i} className="addr" title={a.email}>{a.name ? <>{a.name} <span className="addr-mail">&lt;{a.email}&gt;</span></> : a.email}{i < list.length - 1 ? ', ' : ''}</span>
  ))}</>;
}

const FRAME_CSP = "default-src 'none'; img-src data: https:; style-src 'unsafe-inline' data:; font-src data:";

export function MessageReader({ msg, onToggleStar }: { msg: MessageDetail; onToggleStar: () => void }) {
  const srcDoc = useMemo(() => {
    const body = msg.html ?? `<pre style="white-space:pre-wrap;font:13px/1.45 monospace">${(msg.text ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))}</pre>`;
    return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${FRAME_CSP}"><base target="_blank"><style>body{margin:12px 16px;font:14px/1.45 system-ui,'Segoe UI',sans-serif;color:#15141a;word-wrap:break-word}img{max-width:100%;height:auto}</style></head><body>${body}</body></html>`;
  }, [msg]);

  const totalSize = msg.attachments.reduce((s, a) => s + a.size, 0);

  return (
    <article className="reader">
      <header className="reader-header">
        <div className="rh-row">
          <Avatar a={msg.from} />
          <div className="rh-from">
            <span className="rh-from-name">{msg.from.name ?? msg.from.email}</span>
            {msg.from.name && <span className="rh-from-mail">{msg.from.email}</span>}
          </div>
          <div className="rh-actions">
            <button className="rh-btn" disabled title="Archivo de sólo lectura"><IconReply size={14} /> <span className="rh-btn-label">Responder</span></button>
            <button className="rh-btn" disabled><IconReplyAll size={14} /> <span className="rh-btn-label">Responder a todos</span></button>
            <button className="rh-btn" disabled><IconForward size={14} /> <span className="rh-btn-label">Reenviar</span></button>
            <button className="rh-btn" disabled><IconArchive size={14} /> <span className="rh-btn-label">Archivar</span></button>
            <button className="rh-btn" disabled><IconTrash size={14} /> <span className="rh-btn-label">Basura</span></button>
            <button className="rh-btn">Más <IconChevronDown size={12} /></button>
          </div>
        </div>
        <div className="rh-row rh-meta">
          <span className="rh-label">Para</span>
          <span className="rh-value"><AddrList list={msg.to} /></span>
          <span className="rh-date">{formatLongDate(msg.date)}</span>
        </div>
        {msg.cc.length > 0 && (
          <div className="rh-row rh-meta"><span className="rh-label">CC</span><span className="rh-value"><AddrList list={msg.cc} /></span></div>
        )}
        <div className="rh-row rh-subject-row">
          <button className={'card-star' + (msg.starred ? ' on' : '')} onClick={onToggleStar} title="Destacar"><IconStar size={15} filled={msg.starred} /></button>
          <h1 className="rh-subject">{msg.subject}</h1>
        </div>
      </header>
      <iframe className="reader-body" title="Contenido del mensaje" sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={srcDoc} />
      {msg.attachments.length > 0 && (
        <footer className="attachments">
          <div className="att-bar">
            <IconClip size={14} />
            <b>{msg.attachments.length} {msg.attachments.length === 1 ? 'adjunto' : 'adjuntos'}:</b>
            <span className="att-total">{formatSize(totalSize)}</span>
          </div>
          <ul className="att-list">
            {msg.attachments.map((a) => (
              <li key={a.id} className="att-item">
                {a.mimeType.startsWith('image/') ? <img src={a.url} alt="" /> : <span className="att-ext">{a.filename.split('.').pop()}</span>}
                <span className="att-name" title={a.filename}>{a.filename}</span>
                <span className="att-size">{formatSize(a.size)}</span>
                <a className="rh-btn" href={a.url} download={a.filename} target="_blank" rel="noreferrer" title="Guardar"><IconDownload size={14} /> <span>Guardar</span></a>
              </li>
            ))}
          </ul>
        </footer>
      )}
    </article>
  );
}

export function StartPage({ folders, messages }: { folders: number; messages: number }) {
  return (
    <div className="startpage">
      <div className="sp-badge">
        <svg width="26" height="26" viewBox="0 0 32 32"><rect x="2" y="6" width="28" height="20" rx="4" fill="#0061e0" /><path d="M4 9l12 9 12-9" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" /></svg>
        <span>ThunderBB</span>
      </div>
      <h1>Tu archivo de correo, <b>en la nube</b></h1>
      <p>Consulta los correos respaldados sin conectar discos duros. Selecciona una carpeta a la izquierda y abre cualquier mensaje.</p>
      <div className="sp-stats">
        <div><b>{folders}</b><span>carpetas</span></div>
        <div><b>{messages.toLocaleString('es-ES')}</b><span>mensajes</span></div>
      </div>
      <div className="sp-tips">
        <h2>Atajos de teclado</h2>
        <ul>
          <li><kbd>Ctrl</kbd>+<kbd>K</kbd> Buscar en todo el archivo</li>
          <li><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>K</kbd> Filtrar la carpeta actual</li>
          <li><kbd>↑</kbd> <kbd>↓</kbd> Moverse entre mensajes</li>
          <li><kbd>→</kbd> <kbd>←</kbd> Abrir / cerrar hilo</li>
          <li><kbd>S</kbd> Destacar mensaje</li>
        </ul>
      </div>
    </div>
  );
}
