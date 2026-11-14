/** Borra todo el contenido de Convex (carpetas, mensajes y adjuntos). Uso: npm run wipe */
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';
import { loadEnv } from './env.js';

const env = loadEnv();
if (!env.VITE_CONVEX_URL || !env.IMPORT_TOKEN) { console.error('Faltan VITE_CONVEX_URL o IMPORT_TOKEN (.env.local)'); process.exit(1); }
const client = new ConvexHttpClient(env.VITE_CONVEX_URL);
let n: number, total = 0;
do {
  n = await client.mutation(api.importer.wipeBatch, { token: env.IMPORT_TOKEN });
  total += n;
  process.stdout.write(`\rBorrados ${total} documentos...`);
} while (n > 0);
console.log('\nListo.');
