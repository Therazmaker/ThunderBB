import { createConvexSource } from './convexSource';
import { mockSource } from './mockSource';
import type { MailSource } from './source';

const url = import.meta.env.VITE_CONVEX_URL as string | undefined;

/** Con VITE_CONVEX_URL usa Convex; sin ella, los datos de prueba. */
export const source: MailSource = url ? createConvexSource(url) : mockSource;
export const usingConvex = !!url;
