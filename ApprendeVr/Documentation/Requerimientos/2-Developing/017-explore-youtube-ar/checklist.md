# Checklist de ejecución — Requerimiento 017

## Fase 0 — Prerrequisito

- [ ] Conseguir `YOUTUBE_API_KEY` (Google Cloud Console: crear/usar proyecto, habilitar "YouTube
      Data API v3", generar API key). No bloquea empezar el desarrollo (tests con mock), sí bloquea
      la verificación end-to-end contra la API real.

## Fase 1 — Backend: dominio `youtube-search`

- [x] `youtube-search.module.ts`, `youtube-search.controller.ts`, `youtube-search.service.ts`,
      `youtube-search.util.ts` (esqueleto + `.spec.ts` de cada uno).
- [x] `youtube-search.util.ts`: normalización de la respuesta cruda de la API a
      `[{ videoId, title, thumbnailUrl, channelTitle }]`, con tests.
- [x] `youtube-search.service.ts`: cliente HTTP a `googleapis.com/youtube/v3/search`, manejo de
      errores (cuota, key inválida, red, key no configurada) como errores controlados.
- [x] `youtube-search.controller.ts`: `GET /youtube-search`, valida `q` no vacío (400), público (sin
      `JwtAuthGuard`).
- [x] `src/config/configuration.ts` + `.env.example`: agregar `YOUTUBE_API_KEY`.
- [x] `app.module.ts`: importar `YoutubeSearchModule`.
- [x] `user-settings.util.ts`: agregar `exploreYoutube` a `isValidArsSyncOverlaysConfig` (y a `AFRAME_VIEW_ELEMENTS` para la posición).
- [x] `npm run build` y `npm test` (backend) pasan sin `YOUTUBE_API_KEY` real.
- [ ] Verificar con `curl` contra la API real (una vez conseguida la key, Fase 0).

## Fase 2 — Frontend: cliente HTTP

- [x] `vrYoutubeSearchApi.util.js`: `searchYoutube(query)`.

## Fase 3 — Frontend: overlay "Explore Youtube AR"

- [x] `explore-youtube.html` (página Vite real) + registro en `vite.config.js`.
- [x] `explore-youtube-modules.js`: panel de búsqueda + botón "BUSCAR".
- [x] Auto-búsqueda al montar desde `localStorage['apprendevr_youtube_search_query']`.
- [x] Lista de resultados (miniatura + título) como filas de DOM clickeables.
- [x] Mecanismo de gaze/dwell sobre las filas (reusando `document.elementFromPoint()` + `FUSE_MS`
      del patrón de `youtube-video-modules.js`).
- [x] Reproductor embebido (YouTube IFrame Player API) al seleccionar un resultado, con
      play/pause/rewind/forward y botón "NUEVA BÚSQUEDA".
- [x] Emisión de `explore-youtube-select` (url, title, artist) al seleccionar un resultado.
- [x] Volumen por panel (evitar eco en modo estéreo doble panel).
- [x] Estados de error visibles (sin resultados, cuota agotada, sin conexión, backend no
      configurado).
- [x] Fallback sin API key: botón "BUSCAR CON INVIDIOUS" visible al recibir `NOT_CONFIGURED`,
      que busca por la API pública de Invidious (`searchYoutubeInvidious`) y muestra la misma
      lista de resultados.
- [x] Puente de sincronización de cámara (rotación + posición) por `postMessage`.
- [x] Ancla 3D `#explore-youtube-anchor` + billboard (panel sigue al ancla en pantalla).
- [x] `VRYoutubeExploreOverlaySync.jsx` (`forwardRef`, `<iframe src>` real).

## Fase 4 — Integración "New Song" ↔ "Explore Youtube AR"

- [x] `VRNewSongAf.js` `onSearchClick`: guardar consulta en `localStorage['apprendevr_youtube_search_query']`
      y mandar `activate-overlay` (`exploreYoutube`); fallback `window.open` fuera de `mirror-fix`.
- [x] `SyncStereoTestView.jsx`: handler `explore-youtube-select` → fan-out `explore-youtube-fill`
      a ambos overlays `newSong` (izquierdo y derecho).
- [x] `new-song-modules.js`: handler `explore-youtube-fill` — rellena `youtubeUrl` (siempre) y
      `titulo`/`autor` (solo si vacíos), refrescando los campos.

## Fase 5 — Registro como overlay de AR-SYNC

- [x] `SYNCABLE_OVERLAYS` en `SyncStereoTestView.jsx`.
- [x] `OVERLAY_OPTIONS` en `SyncConfigCompassMenu.jsx` (el layout dinámico ya se ajusta por `OVERLAY_OPTIONS.length`).
- [x] Claves `syncConfig.overlay.exploreYoutube`/`exploreYoutubeShort` en
      `src/locales/{es,en,br}.json`.
- [x] `vrPositionControl.js`: nueva entrada `exploreYoutube` en `ELEMENTS`.

## Fase 6 — Validación en navegador

- [ ] Activar el overlay desde el menú ⚙️ → "Overlays", aislado (resto desactivados), sin consulta
      previa: campo vacío.
- [ ] Escribir título/autor en "New Song" y pulsar "BUSCAR EN YOUTUBE": el overlay se activa y
      busca automáticamente con esa consulta (sin abrir pestaña externa).
- [ ] Buscar un texto, ver resultados, seleccionar uno con gaze/dwell y con click directo.
- [ ] Reproducir/pausar/adelantar/atrasar el video seleccionado.
- [ ] Volver a "NUEVA BÚSQUEDA" sin perder el texto buscado.
- [ ] Verificar que los campos URL/título/autor de "New Song" quedan rellenados (URL siempre;
      título/autor solo si estaban vacíos), en ambos paneles con "Doble panel".
- [ ] Probar con la red del backend caída / sin `YOUTUBE_API_KEY` (mensaje de error visible).
- [ ] Mover la posición del overlay (marcador 📍 + d-pad), guardar, recargar y confirmar que
      persiste sin borrar la posición de los demás overlays.
- [x] `npm run build` (frontend) genera `explore-youtube.html`.
- [x] `npm run check:i18n` (frontend) pasa.
- [x] `npm run test:cov` (backend) no baja de 80% global (94.57% statements).

## Fase 7 — Documentación

- [x] `ApprendeVr/Documentation/backend-nestjs.md`: documentar `GET /api/youtube-search`.
