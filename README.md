# ThunderBB

Visor web del archivo de correo respaldado, con una interfaz al estilo de un cliente de escritorio
(panel de carpetas, lista de tarjetas y panel de lectura). Pensado para desplegarse en Vercel con los
datos en Convex.

## Desarrollo

```bash
npm install
npm run dev
```

## Fuente de datos

- Sin `VITE_CONVEX_URL`: datos ficticios generados en el navegador (`src/data/mockSource.ts`).
- Con `VITE_CONVEX_URL`: lee de Convex (`src/data/convexSource.ts`).

## Convex

```
convex/
  schema.ts     folders, messages (fila ligera + índice de búsqueda), messageBodies, attachments
  folders.ts    list
  messages.ts   listByFolder (paginado), search, get, setFlags
  importer.ts   ensureFolder, insertMessages, generateUploadUrl, wipeBatch (protegidas con IMPORT_TOKEN)
```

Los adjuntos e imágenes inline se guardan como binarios en el storage de Convex (no en base64:
base64 ocupa un 33% más). En el HTML las imágenes inline quedan como `cid:...` y se sustituyen por
la URL del storage al abrir el mensaje.

Puesta en marcha:

1. `npx convex dev` (o con `CONVEX_DEPLOY_KEY` en el entorno, `npx convex dev --once`): despliega
   las funciones y escribe `VITE_CONVEX_URL` en `.env.local`.
2. `npx convex env set IMPORT_TOKEN <valor-largo-aleatorio>` y el mismo valor en `.env.local`.
3. `npm run seed -- --limit 300` para cargar datos de prueba.
4. En Vercel: variable `VITE_CONVEX_URL`.

## Funcionalidades

- Árbol de carpetas desplegable
- Lista virtualizada (aguanta decenas de miles de mensajes), hilos con "N respuestas"
- Filtro rápido (texto, no leídos, destacados, etiquetas, adjuntos) y búsqueda global (`Ctrl+K`)
- Lector con cabeceras, cuerpo HTML aislado en un iframe con sandbox, imágenes inline en base64 y adjuntos descargables
- Paneles redimensionables, menús, atajos de teclado (↑ ↓ → ← S)

## Formato de datos

Los tipos están en `src/types.ts` y son el formato que generará el conversor `.mbox/.eml → JSON`:

- `Folder`: árbol de carpetas con contadores
- `MessageSummary`: fila ligera para la lista (se descarga por carpeta)
- `MessageDetail`: mensaje completo (HTML, destinatarios, adjuntos como `data:` URI); se pide al abrirlo

La UI sólo habla con la interfaz `MailSource` (`src/data/source.ts`). Para pasar a Convex basta con
otra implementación de esa interfaz.
