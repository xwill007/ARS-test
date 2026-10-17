# Estrategia de testing — Requerimiento 017

## Estrategia

- **Backend (unitarios, Jest):** el dominio `youtube-search` se testea con el cliente HTTP a la
  YouTube Data API completamente mockeado — ningún test real llama a `googleapis.com`. Cubre:
  normalización de la respuesta (`youtube-search.util.ts`), manejo de errores de la API (cuota, key
  inválida, red) traducidos a errores controlados, validación de `q` vacío, y el caso de
  `YOUTUBE_API_KEY` no configurada.
- **Backend (manual con `curl`):** una vez conseguida una `YOUTUBE_API_KEY` real (Fase 0 del
  checklist), verificar `GET /api/youtube-search?q=...` contra la API real, con `docker compose up`.
- **Frontend (manual en navegador):** no hay suite de tests automatizados de UI en este repo para
  overlays de `mirror-fix` (mismo criterio que los overlays existentes, Requerimiento 015) — se
  valida a mano en AR-SYNC siguiendo la Fase 5 del checklist.
- **i18n:** `npm run check:i18n` verifica que las claves nuevas existan en `es`/`en`/`br`.
- **Build:** `npm run build` (frontend) confirma que `explore-youtube.html` quedó registrado en
  `vite.config.js` y compila sin errores.

## Casos de test

| # | Caso | Tipo | Estado |
|---|---|---|---|
| 1 | `youtube-search.util.ts` normaliza una respuesta cruda válida de la API a `[{videoId,title,thumbnailUrl,channelTitle}]` | Unitario | Pendiente |
| 2 | `youtube-search.util.ts` normaliza una respuesta vacía (`items: []`) a `[]` | Unitario | Pendiente |
| 3 | `YoutubeSearchService.search()` propaga un error controlado si la API de YouTube responde 403 (cuota agotada) | Unitario | Pendiente |
| 4 | `YoutubeSearchService.search()` propaga un error controlado si `YOUTUBE_API_KEY` no está configurada | Unitario | Pendiente |
| 5 | `YoutubeSearchController` `GET /youtube-search` sin `q` devuelve 400 sin llamar al service | Unitario | Pendiente |
| 6 | `YoutubeSearchController` `GET /youtube-search?q=texto` delega al service y devuelve su resultado | Unitario | Pendiente |
| 7 | `GET /api/youtube-search?q=<texto>` contra la API real devuelve hasta 10 resultados | Manual (curl) | Pendiente |
| 8 | `GET /api/youtube-search` sin key configurada devuelve 503 con mensaje explícito | Manual (curl) | Pendiente |
| 9 | Activar el overlay "Explore Youtube AR" desde el menú ⚙️ → Overlays lo muestra sin errores de consola | Manual (navegador) | Pendiente |
| 10 | Buscar un texto muestra hasta 10 resultados con miniatura + título | Manual (navegador) | Pendiente |
| 11 | Gaze/dwell sostenido sobre una fila de resultado la selecciona y reproduce el video | Manual (navegador) | Pendiente |
| 12 | Click directo de mouse sobre una fila de resultado la selecciona (equivalente de escritorio) | Manual (navegador) | Pendiente |
| 13 | Controles play/pause/rewind/forward del reproductor embebido funcionan | Manual (navegador) | Pendiente |
| 14 | Botón "NUEVA BÚSQUEDA" vuelve a la lista sin perder el texto buscado | Manual (navegador) | Pendiente |
| 15 | Búsqueda sin resultados muestra mensaje explícito (no lista vacía sin explicación) | Manual (navegador) | Pendiente |
| 16 | Con el backend apagado / sin key, el overlay muestra un error explícito | Manual (navegador) | Pendiente |
| 17 | En `mirror-fix` con "Doble panel", el video se reproduce/escucha en ambos paneles con volumen distinto por panel | Manual (navegador) | Pendiente |
| 18 | Guardar la posición del overlay (marcador 📍/d-pad) persiste tras recargar, sin borrar la de otros overlays | Manual (navegador) | Pendiente |
| 19 | `npm run check:i18n` pasa con las claves nuevas en los 3 idiomas | Automatizado (script) | Pendiente |
| 20 | `npm run build` (frontend) genera `explore-youtube.html` | Automatizado (build) | Pendiente |
| 21 | `npm run test:cov` (backend) no baja de 80% global con los archivos nuevos | Automatizado (cobertura) | Pendiente |
