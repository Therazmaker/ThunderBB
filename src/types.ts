/**
 * Esquema JSON de los correos. Es el mismo formato que producirá el
 * conversor (.mbox/.eml -> JSON) y el que guardará Convex.
 */

export type FolderKind = 'root' | 'account' | 'folder' | 'trash' | 'outbox' | 'inbox' | 'sent' | 'drafts';

export interface Folder {
  id: string;
  name: string;
  kind: FolderKind;
  /** Total de mensajes directamente en esta carpeta. */
  total: number;
  unread: number;
  children: Folder[];
}

export interface Address {
  name?: string;
  email: string;
}

/** Fila ligera para la lista (lo que se descarga en bloque). */
export interface MessageSummary {
  id: string;
  folderId: string;
  threadId: string;
  /** Respuestas dentro del hilo (sólo en el mensaje raíz). */
  replyCount: number;
  /** Id del mensaje raíz si es una respuesta. */
  parentId?: string;
  from: Address;
  subject: string;
  /** ISO 8601 */
  date: string;
  hasAttachments: boolean;
  read: boolean;
  starred: boolean;
  tags: string[];
}

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  /** URL del binario (storage de Convex) o data: URI en los datos de prueba. */
  url: string;
}

/** Mensaje completo (se descarga al abrirlo). */
export interface MessageDetail extends MessageSummary {
  to: Address[];
  cc: Address[];
  /** HTML ya saneado; las imágenes inline van como data: URIs. */
  html?: string;
  text?: string;
  attachments: Attachment[];
}
