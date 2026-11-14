import type { Address, Attachment, Folder, MessageDetail, MessageSummary } from '../types';
import type { MailSource } from './source';

// Datos 100% ficticios para maquetar la interfaz.

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];

const DOMAIN = 'hoteldemo.com';
const SENDERS: Address[] = [
  { name: 'Recepción Hotel Demo', email: `frontdesk@${DOMAIN}` },
  { email: `restaurante@${DOMAIN}` },
  { name: 'Reservas Hotel Demo', email: `reservas@${DOMAIN}` },
  { name: 'Ama de Llaves', email: `housekeeping@${DOMAIN}` },
  { name: 'Mantenimiento', email: `mantenimiento@${DOMAIN}` },
  { name: 'PartnerCentral Team', email: 'donotreply@partners-ota.example' },
  { name: 'Booking Extranet', email: 'noreply@extranet-reservas.example' },
  { name: 'Contabilidad', email: `contabilidad@${DOMAIN}` },
  { name: 'Gerencia General', email: `gerencia@${DOMAIN}` },
];
const SUBJECTS: ((d: Date, r: () => number) => string)[] = [
  (d) => `Cuadro de novedades del turno tarde, cena del ${dm(d)}`,
  (d) => `Reporte de Novedades Turno Tarde ${dd(d)}-${mm(d)}`,
  (_, r) => `Le ha escrito un huésped: ${pick(r, ['Remy Turcon', 'Ana Ruiz', 'John Miller', 'Lucía Paredes', 'Marco Bianchi'])}`,
  (_, r) => `Incidente Hab ${100 * (1 + Math.floor(r() * 10)) + Math.floor(r() * 20)}`,
  (_, r) => `REINGRESO HAB ${1000 + Math.floor(r() * 20)}`,
  (_, r) => `Traslado Hotel - Apto, ${pick(r, ['Riccardo Reggiani', 'Paula Gómez', 'Klaus Weber', 'Sofía Lima'])}`,
  () => 'CUADRO DE GARANTÍAS 72 H',
  (d) => `No Show ${dd(d)}-${mm(d)}`,
  (d) => `Ocupación proyectada semana ${dm(d)}`,
  (_, r) => `Cotización grupo ${pick(r, ['Corporativo ABC', 'Boda Torres', 'Congreso Médico', 'Tour Andino'])}`,
  () => 'Cierre de caja nocturno',
  (_, r) => `Nueva reserva: ${pick(r, ['Suite Junior', 'Doble Superior', 'Ejecutiva King'])} – 3 noches`,
  () => 'Inventario de amenities',
];
const pad = (n: number) => String(n).padStart(2, '0');
const dd = (d: Date) => pad(d.getDate());
const mm = (d: Date) => pad(d.getMonth() + 1);
const dm = (d: Date) => `${dd(d)}/${mm(d)}`;

function svgDataUrl(label: string, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160"><rect width="320" height="160" rx="8" fill="${color}"/><text x="160" y="88" font-family="sans-serif" font-size="20" fill="#fff" text-anchor="middle">${label}</text></svg>`;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

// ---------- Árbol de carpetas ----------
const leaf = (id: string, total: number): Folder => ({ id, name: 'mensajes', kind: 'folder', total, unread: 0, children: [] });
const tree: Folder[] = [
  {
    id: 'local', name: 'Carpetas locales', kind: 'root', total: 0, unread: 0, children: [
      { id: 'trash', name: 'Papelera', kind: 'trash', total: 0, unread: 0, children: [] },
      { id: 'outbox', name: 'Bandeja de salida', kind: 'outbox', total: 0, unread: 0, children: [] },
      {
        id: 'bk', name: `BK reservas@${DOMAIN}`, kind: 'account', total: 0, unread: 0, children: [
          {
            id: 'y2020', name: '2020', kind: 'folder', total: 0, unread: 0, children: [
              { id: 'ea', name: 'ene-abr', kind: 'folder', total: 0, unread: 0, children: [
                { id: 'ea2', name: 'Ene-Abr_20231108', kind: 'folder', total: 0, unread: 0, children: [leaf('ea-msgs', 4244)] }] },
              { id: 'ma', name: 'may-ago', kind: 'folder', total: 0, unread: 0, children: [
                { id: 'ma2', name: 'May-Agos_20231108', kind: 'folder', total: 0, unread: 0, children: [leaf('ma-msgs', 3127)] }] },
              { id: 'sd', name: 'sep-dic', kind: 'folder', total: 0, unread: 0, children: [
                { id: 'sd2', name: 'Sep-Dic_20231108', kind: 'folder', total: 0, unread: 0, children: [leaf('sd-msgs', 3876)] }] },
            ],
          },
        ],
      },
    ],
  },
];
const PERIODS: Record<string, [string, string]> = {
  'ea-msgs': ['2020-01-01', '2020-04-30'],
  'ma-msgs': ['2020-05-01', '2020-08-31'],
  'sd-msgs': ['2020-09-01', '2020-12-31'],
};
function findFolder(list: Folder[], id: string): Folder | undefined {
  for (const f of list) {
    if (f.id === id) return f;
    const c = findFolder(f.children, id);
    if (c) return c;
  }
}

// ---------- Mensajes ----------
const cache = new Map<string, MessageSummary[]>();
const byId = new Map<string, MessageSummary>();

function generate(folderId: string): MessageSummary[] {
  const folder = findFolder(tree, folderId);
  const period = PERIODS[folderId];
  if (!folder || !period || folder.total === 0) return [];
  const r = rng(folderId.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const start = new Date(period[0] + 'T00:00:00').getTime();
  const end = new Date(period[1] + 'T23:59:00').getTime();
  const out: MessageSummary[] = [];
  let i = 0;
  while (out.length < folder.total) {
    const date = new Date(start + r() * (end - start));
    const from = pick(r, SENDERS);
    const subject = pick(r, SUBJECTS)(date, r);
    const id = `${folderId}-${i++}`;
    const replies = r() < 0.12 ? 1 + Math.floor(r() * 3) : 0;
    const root: MessageSummary = {
      id, folderId, threadId: id, replyCount: replies, from, subject,
      date: date.toISOString(), hasAttachments: r() < 0.2,
      read: r() > 0.03, starred: r() < 0.02, tags: [],
    };
    out.push(root);
    for (let k = 0; k < replies && out.length < folder.total; k++) {
      const rd = new Date(date.getTime() + (k + 1) * (5 + r() * 120) * 60000);
      out.push({
        ...root, id: `${folderId}-${i++}`, parentId: id, replyCount: 0,
        from: pick(r, SENDERS), subject: 'RE: ' + subject, date: rd.toISOString(),
        hasAttachments: false, starred: false,
      });
    }
  }
  out.forEach((m) => byId.set(m.id, m));
  return out;
}

function detail(s: MessageSummary): MessageDetail {
  const r = rng(s.id.split('').reduce((a, c) => a * 33 + c.charCodeAt(0), 11));
  const attachments: Attachment[] = [];
  if (s.hasAttachments) {
    attachments.push({
      id: s.id + '-a1', filename: pick(r, ['reporte.png', 'cuadro_garantias.png', 'voucher.png']),
      mimeType: 'image/svg+xml', size: 20000 + Math.floor(r() * 400000),
      url: svgDataUrl('Adjunto de ejemplo', '#2a7f62'),
    });
  }
  const inline = r() < 0.35 ? `<p><img alt="imagen" src="${svgDataUrl('Imagen inline (base64)', '#0061e0')}"></p>` : '';
  const rows = Array.from({ length: 4 }, () =>
    `<tr><td>${1000 + Math.floor(r() * 20)}</td><td>${pick(r, ['Ingreso', 'Salida', 'Cambio de hab.', 'Late check-out'])}</td><td>${pick(r, ['OK', 'Pendiente', 'Revisar'])}</td></tr>`).join('');
  const html = `
<div style="font-family:Calibri,Arial,sans-serif;font-size:14px;color:#222">
  <p>Buenas noches,</p>
  <p>Se comparte el detalle correspondiente a <b>${escapeHtml(s.subject)}</b>. Mensaje de ejemplo #${k(s.id)} generado para maquetar el visor.</p>
  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;border-color:#ccc">
    <thead style="background:#f0f0f4"><tr><th>Hab.</th><th>Movimiento</th><th>Estado</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${inline}
  <p>Saludos cordiales,<br>${escapeHtml(s.from.name ?? s.from.email)}</p>
</div>`;
  return {
    ...s,
    to: [{ name: 'Reservas', email: `reservas@${DOMAIN}` }],
    cc: r() < 0.3 ? [{ name: 'Gerencia General', email: `gerencia@${DOMAIN}` }] : [],
    html,
    attachments,
  };
}
const k = (id: string) => id.split('-').pop();
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export const mockSource: MailSource = {
  async getFolderTree() {
    return tree;
  },
  async listMessages(folderId) {
    if (!cache.has(folderId)) cache.set(folderId, generate(folderId));
    return cache.get(folderId)!;
  },
  async getMessage(id) {
    const s = byId.get(id);
    return s ? detail(s) : null;
  },
  async search(q) {
    const leaves: string[] = [];
    const walk = (l: Folder[]) => l.forEach((f) => { if (f.total) leaves.push(f.id); walk(f.children); });
    walk(tree);
    const all = (await Promise.all(leaves.map((id) => this.listMessages(id)))).flat();
    const n = normalize(q);
    return all.filter((m) => normalize(`${m.subject} ${m.from.name ?? ''} ${m.from.email}`).includes(n)).slice(0, 1000);
  },
  async setFlags(id, flags) {
    const m = byId.get(id);
    if (m) Object.assign(m, flags);
  },
};
const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
