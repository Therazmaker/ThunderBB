import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = ({ size = 16, ...p }: P) => ({
  width: size, height: size, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, ...p,
});

export const IconSidebar = (p: P) => (<svg {...base(p)}><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" /><path d="M5.5 2.5v11M3 5h1M3 7h1M3 9h1" /></svg>);
export const IconSearch = (p: P) => (<svg {...base(p)}><circle cx="7" cy="7" r="4.5" /><path d="M10.3 10.3L14 14" /></svg>);
export const IconMenu = (p: P) => (<svg {...base(p)}><path d="M2.5 4h11M2.5 8h11M2.5 12h11" /></svg>);
export const IconChevronDown = (p: P) => (<svg {...base(p)}><path d="M4 6l4 4 4-4" /></svg>);
export const IconChevronRight = (p: P) => (<svg {...base(p)}><path d="M6 4l4 4-4 4" /></svg>);
export const IconMinimize = (p: P) => (<svg {...base(p)}><path d="M3 8h10" /></svg>);
export const IconMaximize = (p: P) => (<svg {...base(p)}><rect x="4" y="4" width="8" height="8" rx="1" /><path d="M6 4V3h7v7h-1" /></svg>);
export const IconClose = (p: P) => (<svg {...base(p)}><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" /></svg>);
export const IconCloudDown = (p: P) => (<svg {...base(p)}><path d="M4.5 11.5a3 3 0 01-.3-6 4 4 0 017.6 1A2.5 2.5 0 0111.5 11.5" /><path d="M8 8v6M6 12l2 2 2-2" /></svg>);
export const IconPlus = (p: P) => (<svg {...base(p)}><path d="M8 3v10M3 8h10" /></svg>);
export const IconDots = (p: P) => (<svg {...base(p)} fill="currentColor" stroke="none"><circle cx="3.5" cy="8" r="1.1" /><circle cx="8" cy="8" r="1.1" /><circle cx="12.5" cy="8" r="1.1" /></svg>);
export const IconKebab = (p: P) => (<svg {...base(p)} fill="currentColor" stroke="none"><circle cx="8" cy="3.5" r="1.1" /><circle cx="8" cy="8" r="1.1" /><circle cx="8" cy="12.5" r="1.1" /></svg>);
export const IconFolder = (p: P) => (<svg {...base(p)} stroke="#c89400" fill="#ffd75e"><path d="M1.5 4.5a1 1 0 011-1h3.2l1.5 1.5h6.3a1 1 0 011 1V12a1 1 0 01-1 1h-11a1 1 0 01-1-1z" /></svg>);
export const IconFolderOpen = (p: P) => (<svg {...base(p)} stroke="#c89400" fill="#ffd75e"><path d="M1.5 4.5a1 1 0 011-1h3.2l1.5 1.5h5.3a1 1 0 011 1v1" /><path d="M1.5 12.5l2-5.5h11l-2 6h-10.5z" /></svg>);
export const IconFolderBlue = (p: P) => (<svg {...base(p)} stroke="#0061e0" fill="#cfe2ff"><path d="M1.5 4.5a1 1 0 011-1h3.2l1.5 1.5h6.3a1 1 0 011 1V12a1 1 0 01-1 1h-11a1 1 0 01-1-1z" /></svg>);
export const IconTrash = (p: P) => (<svg {...base(p)}><path d="M2.5 4.5h11M6 4.5V3h4v1.5M4 4.5l.7 9h6.6l.7-9M6.5 7v4.5M9.5 7v4.5" /></svg>);
export const IconOutbox = (p: P) => (<svg {...base(p)} stroke="#2a9d8f"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" /><path d="M1.5 9.5h3.5l1 1.5h4l1-1.5h3.5M8 8V4.5M6.3 6L8 4.3 9.7 6" /></svg>);
export const IconPin = (p: P) => (<svg {...base(p)}><path d="M6 2.5h4M7 2.5v4L4.5 9h7L9 6.5v-4M8 9v4.5" /></svg>);
export const IconEnvelope = (p: P) => (<svg {...base(p)}><rect x="1.5" y="3.5" width="13" height="9" rx="1.2" /><path d="M2 4l6 5 6-5" /></svg>);
export const IconStar = ({ filled, ...p }: P & { filled?: boolean }) => (<svg {...base(p)} fill={filled ? '#f5b400' : 'none'} stroke={filled ? '#d69e00' : 'currentColor'}><path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" /></svg>);
export const IconContact = (p: P) => (<svg {...base(p)}><rect x="2.5" y="1.5" width="11" height="13" rx="1.2" /><circle cx="8" cy="6.5" r="2" /><path d="M4.8 11.8c.6-1.6 1.8-2.3 3.2-2.3s2.6.7 3.2 2.3M1.5 4.5h2M1.5 8h2M1.5 11.5h2" /></svg>);
export const IconTag = (p: P) => (<svg {...base(p)}><path d="M1.5 2.5v5l7 7 6-6-7-7h-5z" /><circle cx="4.8" cy="5.3" r="1" /></svg>);
export const IconClip = (p: P) => (<svg {...base(p)}><path d="M10.5 4.5L5.6 9.4a1.3 1.3 0 001.9 1.9l5.2-5.2a2.6 2.6 0 00-3.7-3.7L3.6 7.8a3.9 3.9 0 005.5 5.5l4.2-4.2" /></svg>);
export const IconFilter = (p: P) => (<svg {...base(p)}><path d="M2 4h7M12 4h2M2 8h2M7 8h7M2 12h9M14 12h0" /><circle cx="10.5" cy="4" r="1.5" /><circle cx="5.5" cy="8" r="1.5" /><circle cx="12.5" cy="12" r="1.5" /></svg>);
export const IconListOptions = (p: P) => (<svg {...base(p)}><path d="M2 3.5h12M2 8h8M2 12.5h12M12.5 6.5v3M11 8h3" /></svg>);
export const IconThread = (p: P) => (<svg {...base(p)}><rect x="1.5" y="2.5" width="9" height="7" rx="1" /><path d="M5.5 11.5v1a1 1 0 001 1h6a1 1 0 001-1v-5a1 1 0 00-1-1h-2" /></svg>);
export const IconReply = (p: P) => (<svg {...base(p)}><path d="M6 4L2.5 7.5 6 11M2.5 7.5h7a4 4 0 014 4v1" /></svg>);
export const IconReplyAll = (p: P) => (<svg {...base(p)}><path d="M5 4L1.5 7.5 5 11M8.5 4L5 7.5l3.5 3.5M5 7.5h5a4 4 0 014 4v1" /></svg>);
export const IconForward = (p: P) => (<svg {...base(p)}><path d="M10 4l3.5 3.5L10 11M13.5 7.5h-7a4 4 0 00-4 4v1" /></svg>);
export const IconArchive = (p: P) => (<svg {...base(p)}><rect x="1.5" y="2.5" width="13" height="3" rx=".8" /><path d="M2.5 5.5v7a1 1 0 001 1h9a1 1 0 001-1v-7M6.5 8.5h3" /></svg>);
export const IconDownload = (p: P) => (<svg {...base(p)}><path d="M8 2v8M5 7l3 3 3-3M2.5 11.5v1a1 1 0 001 1h9a1 1 0 001-1v-1" /></svg>);
export const IconCalendar = (p: P) => (<svg {...base(p)}><rect x="1.5" y="2.5" width="13" height="11.5" rx="1.2" /><path d="M1.5 6h13M5 1.5v2M11 1.5v2" /><text x="8" y="12.3" fontSize="5.5" textAnchor="middle" fill="currentColor" stroke="none">14</text></svg>);
export const IconBroadcast = (p: P) => (<svg {...base(p)}><circle cx="8" cy="8" r="1.2" /><path d="M5.5 5.5a3.5 3.5 0 000 5M10.5 5.5a3.5 3.5 0 010 5M3.5 3.5a6.4 6.4 0 000 9M12.5 3.5a6.4 6.4 0 010 9" /></svg>);
export const IconCollapse = (p: P) => (<svg {...base(p)}><path d="M2 3v10M5 8h9M9 4.5L5.5 8 9 11.5" /></svg>);
