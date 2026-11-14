import type { Folder, MessageDetail, MessageSummary } from '../types';

export interface Flags { read?: boolean; starred?: boolean }

/**
 * Contrato entre la UI y el almacenamiento. Lo implementan `mockSource`
 * (datos de prueba) y `convexSource` (producción).
 */
export interface MailSource {
  getFolderTree(): Promise<Folder[]>;
  /** `onPage` permite pintar la lista mientras siguen llegando páginas. */
  listMessages(folderId: string, onPage?: (soFar: MessageSummary[]) => void): Promise<MessageSummary[]>;
  getMessage(id: string): Promise<MessageDetail | null>;
  /** Búsqueda en todo el archivo por asunto y remitente. */
  search(q: string): Promise<MessageSummary[]>;
  setFlags(id: string, flags: Flags): Promise<void>;
}
