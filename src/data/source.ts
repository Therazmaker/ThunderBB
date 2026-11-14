import type { Folder, MessageDetail, MessageSummary } from '../types';

/**
 * Contrato entre la UI y el almacenamiento. Hoy lo implementa `mockSource`;
 * mañana una implementación sobre Convex expone exactamente lo mismo.
 */
export interface MailSource {
  getFolderTree(): Promise<Folder[]>;
  listMessages(folderId: string): Promise<MessageSummary[]>;
  getMessage(id: string): Promise<MessageDetail | null>;
}
