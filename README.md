# ThunderBB

Visor web del archivo de correo respaldado, con una interfaz al estilo de un cliente de escritorio
(panel de carpetas, lista de tarjetas y panel de lectura). Pensado para desplegarse en Vercel con los
datos en Convex.

## Desarrollo

```bash
npm install
npm run dev
```

## Estado actual

Sólo el frontend, con datos ficticios generados en el navegador (`src/data/mockSource.ts`).

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
