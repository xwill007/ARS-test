# Checklist de ejecución — Requerimiento 017

## Fase 0 — Prerrequisito

- [ ] Conseguir `YOUTUBE_API_KEY` (Google Cloud Console: crear/usar proyecto, habilitar "YouTube
      Data API v3", generar API key). No bloquea empezar el desarrollo (tests con mock), sí bloquea
      la verificación end-to-end contra la API real.

## Fase 1 — Backend: dominio `youtube-search`

- [ ] `youtube-search.module.ts`, `youtube-search.controller.ts`, `youtube-search.service.ts`,
      `youtube-search.util.ts` (esqueleto + `.spec.ts` de cada uno).
- [ ] `youtube-search.util.ts`: normalización de la respuesta cruda de la API a
      `[{ videoId, title, thumbnailUrl, channelTitle }]`, con tests.
- [ ] `youtube-search.service.ts`: cliente HTTP a `googleapis.com/youtube/v3/search`, manejo de
      errores (cuota, key inválida, red, key no configurada) como errores controlados.
- [ ] `youtube-search.controller.ts`: `GET /youtube-search`, valida `q` no vacío (400), público (sin
      `JwtAuthGuard`).
- [ ] `src/config/configuration.ts` + `.env.example`: agregar `YOUTUBE_API_KEY`.
- [ ] `app.module.ts`: importar `YoutubeSearchModule`.
- [ ] `user-settings.util.ts`: agregar `exploreYoutube` a `isValidArsSyncOverlaysConfig`.
- [ ] `npm run build` y `npm test` (backend) pasan sin `YOUTUBE_API_KEY` real.
- [ ] Verificar con `curl` contra la API real (una vez conseguida la key, Fase 0).

## Fase 2 — Frontend: cliente HTTP

- [ ] `vrYoutubeSearchApi.util.js`: `searchYoutube(query)`.

## Fase 3 — Frontend: overlay "Explore Youtube AR"

- [ ] `explore-youtube.html` (página Vite real) + registro en `vite.config.js`.
- [ ] `explore-youtube-modules.js`: panel de búsqueda + botón "PEGAR URL DEL PORTAPAPELES".
- [ ] Lista de resultados (miniatura + título) como filas de DOM clickeables.
- [ ] Mecanismo de gaze/dwell sobre las filas (reusando `document.elementFromPoint()` + `FUSE_MS`
      del patrón de `youtube-video-modules.js`).
- [ ] Reproductor embebido (YouTube IFrame Player API) al seleccionar un resultado, con
      play/pause/rewind/forward y botón "NUEVA BÚSQUEDA".
- [ ] Volumen por panel (evitar eco en modo estéreo doble panel).
- [ ] Estados de error visibles (sin resultados, cuota agotada, sin conexión, backend no
      configurado).
- [ ] Puente de sincronización de cámara (rotación + posición) por `postMessage`.
- [ ] Ancla 3D `#explore-youtube-anchor` + billboard (panel sigue al ancla en pantalla).
- [ ] `VRYoutubeExploreOverlaySync.jsx` (`forwardRef`, `<iframe src>` real).

## Fase 4 — Registro como overlay de AR-SYNC

- [ ] `SYNCABLE_OVERLAYS` en `SyncStereoTestView.jsx`.
- [ ] `OVERLAY_OPTIONS` en `SyncConfigCompassMenu.jsx` (verificar que el layout dinámico del grupo
      Overlays sigue sin recortarse con una 6ta fila).
- [ ] Claves `syncConfig.overlay.exploreYoutube`/`exploreYoutubeShort` en
      `src/locales/{es,en,br}.json`.
- [ ] `vrPositionControl.js`: nueva entrada `exploreYoutube` en `ELEMENTS`.

## Fase 5 — Validación en navegador

- [ ] Activar el overlay desde el menú ⚙️ → "Overlays", aislado (resto desactivados).
- [ ] Buscar un texto, ver resultados, seleccionar uno con gaze/dwell y con click directo.
- [ ] Reproducir/pausar/adelantar/atrasar el video seleccionado.
- [ ] Volver a "NUEVA BÚSQUEDA" sin perder el texto buscado.
- [ ] Probar con la red del backend caída / sin `YOUTUBE_API_KEY` (mensaje de error visible).
- [ ] Mover la posición del overlay (marcador 📍 + d-pad), guardar, recargar y confirmar que
      persiste sin borrar la posición de los demás overlays.
- [ ] `npm run build` (frontend) genera `explore-youtube.html`.
- [ ] `npm run check:i18n` (frontend) pasa.
- [ ] `npm run test:cov` (backend) no baja de 80% global.

## Fase 6 — Documentación

- [ ] `ApprendeVr/Documentation/backend-nestjs.md`: documentar `GET /api/youtube-search`.
