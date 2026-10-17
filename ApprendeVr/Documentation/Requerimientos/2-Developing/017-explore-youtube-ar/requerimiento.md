# Requerimiento 017 — Overlay "Explore Youtube AR": buscar videos de YouTube sin salir de la vista AR

## 1. Objetivo

Agregar un overlay nuevo e independiente a AR-SYNC, "Explore Youtube AR", que permita escribir una
búsqueda de texto y ver una lista de resultados de YouTube (miniatura + título) dentro de la propia
vista AR, interactuables con el mismo mecanismo de cursor/mirada (gaze/dwell) que ya usa el resto de
la interfaz — sin tener que salir a una pestaña externa del navegador para encontrar un video.

## 2. Antecedentes y estado actual

- **Esta misma pregunta ya se hizo y se respondió en el Requerimiento 015**
  (`1-Pending/015-ingesta-canciones-youtube`, sección "Diseño técnico", entrada *"Botón 'Buscar en
  YouTube': pestaña nueva (`window.open`), no un navegador embebido"*), a partir de la pregunta
  literal del usuario "¿es posible agregar un navegador web que abra YouTube con la sesión del
  usuario?". La respuesta documentada ahí, y que sigue vigente, es que **no es viable embeber
  `youtube.com` completo en un `<iframe>`**: Google bloquea el framing de todo el sitio con
  `X-Frame-Options`/CSP `frame-ancestors` — solo permite iframe-ar el reproductor de un video
  puntual ya elegido vía `youtube.com/embed/<id>` (lo que ya usa el overlay `youtubeVideo`
  existente), nunca la página de búsqueda/resultados/canal. Este requerimiento no reabre esa
  decisión: la aborda con un enfoque distinto (API propia + UI 3D/DOM propia) que si es viable.
- **Antecedente de "Buscar en YouTube" actual (salida a pestaña externa):**
  `VRNewSongAf.js` (panel "New Song" del karaoke,
  `ApprendeVr/frontend/src/views/A-frame/components/VRKaraokeAf/components/VRNewSongAf/VRNewSongAf.js`,
  línea ~213) tiene un botón "BUSCAR EN YOUTUBE" que hace
  `window.open('https://www.youtube.com/results?search_query=' + query, '_blank', 'noopener')`. El
  usuario sale de la vista AR, busca en una pestaña normal del navegador (con su sesión real de
  YouTube: login, historial, recomendaciones) y vuelve a copiar la URL encontrada a mano. Esto sigue
  existiendo sin cambios — este requerimiento agrega una alternativa que no requiere salir, no lo
  reemplaza.
- **Overlay existente más cercano: `youtubeVideo` ("Youtube Video"), ver Requerimiento 015.**
  `VRYoutubeVideoOverlaySync.jsx` monta `youtube-video.html` (página Vite real, no `srcDoc`, para
  poder importar `vrPositionControl.js`) que a su vez carga `youtube-video-modules.js`. Ese overlay
  ya resuelve, y este requerimiento reutiliza como precedente directo:
  - Un panel de **DOM normal** (no geometría 3D de A-Frame) que sigue en pantalla a un ancla 3D
    (`#youtube-video-anchor`) con la técnica "billboard" (`Vector3.project(camera)` en cada frame,
    `youtube-video-modules.js` línea ~509 `trackAnchor()`).
  - Un mecanismo de **gaze/dwell sobre botones de DOM** (no raycaster de A-Frame): como los
    controles son `<button>` normales y no mallas 3D, `findGazeButton()`
    (`youtube-video-modules.js` línea ~571) usa `document.elementFromPoint()` en el centro del
    canvas (donde apunta el reticle) para saber qué botón está "mirado", acumula tiempo de
    activación (`FUSE_MS`, leído de `localStorage['apprendevr_cursor_fuse_timeout']`, configurable
    desde la fila "Cursor" del Requerimiento 016) y dispara `btn.click()` al completarse — mismo
    patrón que este requerimiento nuevo necesita para que los resultados de búsqueda sean
    "clickeables con el cursor".
  - Reproducción embebida de un video ya elegido vía **YouTube IFrame Player API**
    (`youtube-video-modules.js` línea ~291 `loadYoutubeApi()`/`showVideo()`), con controles
    play/pause/rewind/forward y sincronización entre los dos paneles estéreo por `postMessage`.
  - Botón "PEGAR URL DEL PORTAPAPELES" (`navigator.clipboard.readText()` + `window.focus()` previo,
    necesario porque el foco real del navegador en `mirror-fix` lo tiene la brújula 3D, no el
    iframe de contenido).
  - Puente de sincronización de cámara (rotación + posición) por `postMessage`, idéntico en los 3
    overlays de contenido existentes.
- **El overlay `youtubeVideo` no busca nada — solo reproduce una URL ya conocida.** No tiene campo
  de búsqueda ni lista de resultados; asume que el usuario ya tiene la URL (pegada desde
  `VRNewSongAf` vía `localStorage['apprendevr_youtube_preview_url']`, o pegada directo en el propio
  overlay). "Explore Youtube AR" es el overlay que falta antes de esa URL: buscar y elegir.
- **No existe ningún cliente de la YouTube Data API en el proyecto** (confirmado por búsqueda en el
  repo): ni backend ni frontend consultan hoy `googleapis.com`/`YOUTUBE_API_KEY`. Hay que agregarlo
  desde cero.
- **Registro de overlays de AR-SYNC**, los 3 lugares obligatorios (ver skill
  `overlay-ar-sync-aframe` y su aplicación real en el overlay `youtubeVideo`, Requerimiento 015):
  `SYNCABLE_OVERLAYS` en `SyncStereoTestView.jsx` (línea ~38), `OVERLAY_OPTIONS` en
  `SyncConfigCompassMenu.jsx` (la lista real vive ahí, no en `SyncConfigMenu.jsx`, que ya no se usa
  como panel — hallazgo documentado en el Requerimiento 015), y la clave de traducción
  `syncConfig.overlay.<clave>` en `src/locales/{es,en,br}.json`.
- **Patrón de backend ya establecido** (`SongsModule`, Requerimiento 014): un dominio por carpeta
  bajo `src/`, `GET` público sin `JwtAuthGuard` cuando el dato no es por-usuario, DTO con
  `class-validator`, `.spec.ts` junto a cada archivo. Este requerimiento sigue el mismo patrón para
  un nuevo dominio `youtube-search`.
- **Configuración de variables de entorno del backend** (`src/config/configuration.ts`,
  `.env.example`): hoy solo tiene `port`, `database`, `jwt`, `corsOrigin` — no hay precedente de una
  API key de un servicio externo; se agrega siguiendo la misma forma (`process.env.X ?? default`).

## 3. Historias de usuario

- Como usuario que está armando una canción nueva en el karaoke VR, quiero buscar un video de
  YouTube por texto y ver los resultados (miniatura y título) sin salir de la vista AR, para no
  perder la inmersión abriendo una pestaña del navegador.
- Como usuario que mira los resultados de una búsqueda, quiero seleccionar uno con el mismo cursor
  con el que interactúo con el resto del menú AR, para no necesitar el mouse o el teclado físico.
- Como usuario que encontró el video que buscaba, quiero verlo reproducirse ahí mismo en el overlay
  de exploración, para confirmar que es el correcto antes de usarlo.
- Como usuario en el modo espejo estéreo (`mirror-fix`), quiero poder activar "Explore Youtube AR"
  como un overlay más desde el menú de overlays, igual que el resto, para elegir explícitamente
  cuándo lo necesito.
- Como usuario que busca algo y no obtiene resultados (o la búsqueda falla por cuota agotada o error
  de red), quiero ver un mensaje explícito en el propio overlay, para saber que debo reintentar o
  usar el botón "Buscar en YouTube" existente (pestaña externa) como alternativa.

## 4. Alcance

### Incluido

- **Backend — nuevo dominio `youtube-search` (`src/youtube-search/`):**
  - `YoutubeSearchService.search(query: string)`: llama a la YouTube Data API v3
    (`GET https://www.googleapis.com/youtube/v3/search`, `part=snippet&type=video&maxResults=10`)
    con la API key desde configuración, devuelve una lista normalizada
    `[{ videoId, title, thumbnailUrl, channelTitle }]`. Sin paginación (una sola página de hasta 10
    resultados) ni filtros adicionales (duración, fecha, etc.).
  - `YoutubeSearchController` (`@Controller('youtube-search')`): `GET /api/youtube-search?q=<texto>`
    (público, sin `JwtAuthGuard` — mismo criterio que `GET /songs`: no es un dato por-usuario, y el
    overlay debe poder buscar sin depender de que haya sesión activa). Valida que `q` no esté vacío
    (400 si falta); si la YouTube Data API responde error (cuota agotada, key inválida, red), lo
    traduce a un error controlado (502 o 503, no un 500 crudo) con un mensaje que el frontend pueda
    mostrar.
  - `youtube-search.util.ts`: función pura de normalización de la respuesta cruda de la API al
    formato `[{ videoId, title, thumbnailUrl, channelTitle }]`, con su `.spec.ts`.
  - `youtube-search.controller.spec.ts` y `youtube-search.service.spec.ts` (mock del cliente HTTP a
    la API de YouTube, sin llamadas reales en los tests).
  - `src/config/configuration.ts`: agregar `youtube.apiKey` (`process.env.YOUTUBE_API_KEY ?? ''`).
  - `.env.example`: agregar `YOUTUBE_API_KEY=` con un comentario indicando que se obtiene en Google
    Cloud Console habilitando "YouTube Data API v3".
  - Si `YOUTUBE_API_KEY` no está configurada, `GET /api/youtube-search` devuelve un error controlado
    explícito (503, "búsqueda de YouTube no configurada"), no una excepción sin manejar.
- **Frontend — cliente HTTP:** `vrYoutubeSearchApi.util.js` (nuevo, en `src/views/A-frame/`, mismo
  patrón sin-auth que `vrSongsApi.util.js.getSongs()`): `searchYoutube(query)` → `fetch` a
  `/api/youtube-search?q=...`, no-op silencioso con `console.warn` si falla la red (mismo criterio
  defensivo que el resto de los clientes HTTP de esta vista).
- **Frontend — overlay nuevo "Explore Youtube AR" (clave `exploreYoutube`), siguiendo el skill
  `overlay-ar-sync-aframe` y el patrón concreto ya usado por el overlay `youtubeVideo`:**
  - Página Vite real `explore-youtube.html` + `explore-youtube-modules.js` (mismo patrón `src` real
    que `youtube-video.html`/`youtube-video-modules.js` — no `srcDoc`, para poder reusar
    `vrPositionControl.js` real), registrada en `vite.config.js` →
    `build.rollupOptions.input`.
  - Panel de DOM (no geometría 3D) que sigue a un ancla 3D propia (`#explore-youtube-anchor`) con la
    misma técnica "billboard" que `youtube-video-modules.js`, y tiene su propio marcador
    📍/d-pad de posición (`vrPositionControl.js`, nueva clave `exploreYoutube`).
  - Campo de texto de búsqueda + botón "BUSCAR" (mismo patrón de `stopPropagation` en
    `pointerdown`/`mousedown`/`click` que ya usa `youtube-video-modules.js` para no disparar el
    raycast manual de la escena al escribir), y botón "PEGAR URL DEL PORTAPAPELES" para completar el
    campo desde el portapapeles del sistema como atajo (mismo patrón ya existente).
  - Lista de resultados como filas de DOM (miniatura + título, hasta 10), cada una un `<button>`
    normal — reusa tal cual el mecanismo de gaze/dwell de `youtube-video-modules.js`
    (`findGazeButton()`/`document.elementFromPoint()` sobre el centro del canvas + `FUSE_MS` desde
    `localStorage['apprendevr_cursor_fuse_timeout']`) para que mirar sostenido una fila la
    seleccione, más click directo de mouse para el caso de escritorio.
  - Al seleccionar un resultado, se reemplaza la lista por el reproductor embebido (YouTube IFrame
    Player API, misma implementación que `showVideo()`/`loadYoutubeApi()` de
    `youtube-video-modules.js`: controles play/pause/rewind/forward, volumen por panel para AR-SYNC
    estéreo) y un botón "NUEVA BÚSQUEDA" para volver a la lista. **No** se envía nada a
    `VRNewSongAf` ni se toca `localStorage['apprendevr_youtube_preview_url']` — este overlay es de
    exploración/reproducción autocontenida, no reemplaza ni alimenta al panel "New Song" ni al
    overlay `youtubeVideo` (si el usuario quiere usar el video encontrado como canción, copia la URL
    manualmente, igual que ya hace hoy con el botón "BUSCAR EN YOUTUBE" existente).
  - Puente de sincronización de cámara (rotación + posición) por `postMessage`, copiado del mismo
    patrón que los 3 overlays de contenido existentes.
  - Estados de error visibles en el propio panel (sin resultados, cuota agotada, sin conexión, API
    key no configurada en el backend) — nunca falla en silencio ni deja la lista vacía sin
    explicación.
  - `VRYoutubeExploreOverlaySync.jsx` (`forwardRef`, monta `explore-youtube.html` en un
    `<iframe src>` real).
  - Registro en los 3 lugares obligatorios: `SYNCABLE_OVERLAYS` (`SyncStereoTestView.jsx`),
    `OVERLAY_OPTIONS` (`SyncConfigCompassMenu.jsx` — ajustar también el layout dinámico del grupo
    Overlays, que ya depende de `OVERLAY_OPTIONS.length` desde el Requerimiento 015), y clave
    `syncConfig.overlay.exploreYoutube`/`exploreYoutubeShort` en `src/locales/{es,en,br}.json`.
  - `vrPositionControl.js`: nueva entrada en `ELEMENTS` (clave `exploreYoutube`, ancla
    `#explore-youtube-anchor`).
  - `user-settings.util.ts`: agregar `exploreYoutube` al set de claves válidas de
    `isValidArsSyncOverlaysConfig` (mismo ajuste que ya requirió el overlay `youtubeVideo` en el
    Requerimiento 015 para que "Guardar selección de overlays" no rechace la nueva clave con 400).
- **Documentación:** actualizar `ApprendeVr/Documentation/backend-nestjs.md` con la ruta
  `GET /api/youtube-search`.

### No incluido

- **Embeber la página real de `youtube.com` (búsqueda/resultados/canal) en un iframe:** confirmado
  no viable por `X-Frame-Options`/CSP (ver "Antecedentes", Requerimiento 015). Este requerimiento no
  vuelve a evaluar esa opción.
- **Paginación de resultados** ("cargar más", scroll infinito, `pageToken` de la API): se muestra
  una sola página de hasta 10 resultados; si no está lo que se busca, el usuario refina el texto o
  usa el botón "BUSCAR EN YOUTUBE" (pestaña externa) existente.
- **Filtros de búsqueda** (duración, fecha de subida, canal, orden por relevancia/fecha/vistas):
  siempre los parámetros por defecto de la API (`type=video`, sin más filtros).
- **Integración con `VRNewSongAf`/el flujo de alta de canciones** (completar `youtubeUrl`
  automáticamente al elegir un resultado, o disparar el pipeline del Requerimiento 015): decisión
  tomada con el usuario — este overlay es de exploración/reproducción independiente, no un selector
  de fuente para crear canciones. Puede evaluarse como ampliación futura si hace falta.
- **Conseguir la API key de Google Cloud (YouTube Data API v3) como parte de este requerimiento:**
  el usuario confirmó que no la tiene todavía — conseguirla (crear proyecto en Google Cloud
  Console, habilitar "YouTube Data API v3", generar una API key, opcionalmente restringirla por
  referrer/IP) es un paso previo necesario para poder probar el flujo end-to-end, pero no bloquea
  redactar ni empezar a implementar este requerimiento (el backend/frontend se implementan y testean
  con el cliente HTTP mockeado; sin la key real, `GET /api/youtube-search` en un ambiente real
  devuelve el error controlado 503 documentado arriba).
- **Manejo de cuota de la YouTube Data API más allá de reportar el error:** no se implementa caché,
  rate-limiting propio, ni fallback a otro proveedor si se agota la cuota diaria (10,000 unidades/día
  en el tier gratuito, cada `search.list` consume 100 unidades — alcanza para ~100 búsquedas/día).
- **Reproducir el resultado elegido dentro de `VRKaraokeAf`** (overlay de karaoke local) o en el
  overlay `youtubeVideo`: la reproducción de este requerimiento vive solo dentro del propio overlay
  "Explore Youtube AR".
- **Descargar o transcribir el video elegido** (letra, subtítulos, traducción): eso es el alcance
  del Requerimiento 015 (`song-ingestion`), no de este.

## 5. Diseño técnico

**Enfoque elegido: API propia (YouTube Data API v3) + UI de resultados propia, no un navegador
embebido (decisión tomada con el usuario tras confirmar la limitación de `X-Frame-Options`, ver
Requerimiento 015).** La única forma de tener "búsqueda de YouTube interactuable con el cursor
dentro del AR" es no depender de renderizar la página real de YouTube: se consulta su API pública de
datos (resultados como JSON) y se dibuja una lista propia, que sí puede ser controlada por el mismo
mecanismo de cursor que el resto de la interfaz. El costo aceptado es que la lista de resultados no
tiene la personalización de la sesión real del usuario (historial, recomendaciones, login) que sí
tendría una pestaña de navegador real — para ese caso sigue existiendo el botón "BUSCAR EN YOUTUBE"
(`window.open`) ya implementado en `VRNewSongAf.js`.

**API key proxeada desde el backend, nunca expuesta en el frontend.** Mismo criterio de seguridad
que el resto del backend NestJS: un cliente HTTP directo desde el navegador a
`googleapis.com/youtube/v3/search` expondría la key en el código fuente servido (visible en
DevTools/Network), permitiendo que cualquiera la copie y agote la cuota diaria compartida. El
endpoint propio `GET /api/youtube-search` es el único que conoce `YOUTUBE_API_KEY` (variable de
entorno del servidor).

**`GET /api/youtube-search` público (sin `JwtAuthGuard`), igual criterio que `GET /songs`.** Buscar
videos no es una acción que modifique datos ni sea específica de un usuario — el overlay debe poder
buscar apenas se activa, sin depender de sesión. (A diferencia de `POST /songs`, que sí requiere
sesión porque escribe en la base de canciones compartida — acá no hay escritura.)

**DOM + gaze/dwell manual, no geometría 3D + raycaster de A-Frame (decisión por consistencia con el
overlay `youtubeVideo` ya existente, Requerimiento 015).** Se consideró construir la lista de
resultados como planos/texto de A-Frame (mismo patrón que `SyncConfigCompassMenu.jsx`), pero se
descarta: el overlay `youtubeVideo` (el precedente más cercano en función — mostrar contenido de
YouTube dentro de AR-SYNC) ya resolvió este mismo problema (panel con inputs, botones y video
embebido) como DOM real con billboard + gaze/dwell manual vía `document.elementFromPoint()`, porque
el contenido (input de texto, iframe de reproductor) no puede ser geometría 3D de todos modos. Armar
la lista de resultados como texto/planos A-Frame por un lado y el reproductor final como DOM por el
otro obligaría a mezclar dos mecanismos de interacción distintos dentro del mismo overlay; se
prefiere un único mecanismo consistente (DOM + gaze/dwell) de punta a punta, igual que
`youtubeVideo`.

**Sin paginación ni filtros, alcance acotado a "una búsqueda, una lista de hasta 10".** No hay
precedente de scroll/paginación en ningún panel de DOM de `mirror-fix` (los paneles existentes son
listas cortas fijas); agregarlo implicaría diseñar interacción de scroll con gaze/dwell, fuera de
alcance de este requerimiento. Si 10 resultados no alcanzan, el usuario refina el texto de búsqueda.

**No se integra con `VRNewSongAf` (decisión tomada con el usuario).** Se evaluó que, al seleccionar
un resultado, se enviara la URL al panel "New Song" (mismo puente de campos que ya sincroniza
`youtubeUrl` entre paneles de `mirror-fix`, Requerimiento 015). Se descarta para este requerimiento:
el usuario pidió un overlay de exploración independiente, no un selector de fuente para crear
canciones — mantiene el alcance acotado a "buscar y ver". Queda anotado como ampliación posible a
futuro si se necesita ese flujo combinado.

## 6. Archivos a modificar

| Archivo | Cambio |
|---|---|
| `ApprendeVr/backend/src/youtube-search/youtube-search.module.ts` | Nuevo: registra el dominio. |
| `ApprendeVr/backend/src/youtube-search/youtube-search.controller.ts` | Nuevo: `GET /youtube-search` (público), valida `q`. |
| `ApprendeVr/backend/src/youtube-search/youtube-search.controller.spec.ts` | Nuevo: verifica que delega al service y valida `q`. |
| `ApprendeVr/backend/src/youtube-search/youtube-search.service.ts` | Nuevo: llama a la YouTube Data API v3, maneja errores (cuota, key inválida, red) como errores controlados. |
| `ApprendeVr/backend/src/youtube-search/youtube-search.service.spec.ts` | Nuevo: tests con cliente HTTP mockeado (éxito, sin resultados, error de la API, key no configurada). |
| `ApprendeVr/backend/src/youtube-search/youtube-search.util.ts` | Nuevo: normaliza la respuesta cruda de la API a `[{ videoId, title, thumbnailUrl, channelTitle }]`. |
| `ApprendeVr/backend/src/youtube-search/youtube-search.util.spec.ts` | Nuevo: tests de la normalización. |
| `ApprendeVr/backend/src/config/configuration.ts` | Agregar `youtube.apiKey`. |
| `ApprendeVr/backend/.env.example` | Agregar `YOUTUBE_API_KEY=` con comentario de cómo obtenerla. |
| `ApprendeVr/backend/src/app.module.ts` | Importar `YoutubeSearchModule`. |
| `ApprendeVr/backend/src/user-settings/user-settings.util.ts` | `isValidArsSyncOverlaysConfig`: agregar `exploreYoutube` a las claves de overlay válidas. |
| `ApprendeVr/frontend/src/views/A-frame/vrYoutubeSearchApi.util.js` | Nuevo: cliente `searchYoutube(query)`, mismo patrón sin-auth que `vrSongsApi.util.js`. |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/explore-youtube.html` | Nuevo: página Vite real (mismo patrón que `youtube-video.html`). |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/explore-youtube-modules.js` | Nuevo: panel de búsqueda + lista de resultados + reproductor embebido, gaze/dwell, billboard, puente de cámara, marcador de posición (mismo patrón que `youtube-video-modules.js`). |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/VRYoutubeExploreOverlaySync.jsx` | Nuevo: `forwardRef`, monta `explore-youtube.html` en `<iframe src>` real. |
| `ApprendeVr/frontend/vite.config.js` | Registrar `explore-youtube.html` en `build.rollupOptions.input`. |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/SyncStereoTestView.jsx` | Agregar `exploreYoutube` a `SYNCABLE_OVERLAYS`. |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/SyncConfigCompassMenu.jsx` | Agregar `exploreYoutube` a `OVERLAY_OPTIONS`. |
| `ApprendeVr/frontend/src/locales/{es,en,br}.json` | Claves `syncConfig.overlay.exploreYoutube`/`exploreYoutubeShort` (regla del skill `texto-multidioma`). |
| `ApprendeVr/frontend/src/views/A-frame/vrPositionControl.js` | Agregar `{ key: 'exploreYoutube', selector: '#explore-youtube-anchor', offset: [...] }` a `ELEMENTS`. |
| `ApprendeVr/Documentation/backend-nestjs.md` | Documentar `GET /api/youtube-search`. |

## 7. Criterios de aceptación

- [ ] `npm run build` y `npm test` (backend) pasan sin necesidad de una `YOUTUBE_API_KEY` real ni
      conexión a internet (cliente HTTP mockeado en los tests).
- [ ] `GET /api/youtube-search?q=` (vacío) devuelve `400` con un mensaje explícito, sin llamar a la
      API de YouTube.
- [ ] `GET /api/youtube-search` sin `YOUTUBE_API_KEY` configurada devuelve `503` con un mensaje
      explícito ("búsqueda de YouTube no configurada"), no una excepción sin manejar (`500`).
- [ ] Con una `YOUTUBE_API_KEY` real configurada, `GET /api/youtube-search?q=<texto>` devuelve hasta
      10 resultados `{ videoId, title, thumbnailUrl, channelTitle }`. Verificado con `curl`.
- [ ] Si la YouTube Data API responde error (cuota agotada, key inválida), el endpoint propio
      devuelve un error controlado (no un `500` crudo ni la respuesta cruda de Google).
- [ ] El overlay "Explore Youtube AR" aparece como checkbox en el menú ⚙️ → "Overlays" de AR-SYNC,
      junto a los demás (Cámara, Video, Cono, Karaoke, Youtube Video).
- [ ] Al activar el overlay, aparece el panel con campo de búsqueda + botón "BUSCAR" (y "PEGAR URL
      DEL PORTAPAPELES"), sin resultados todavía.
- [ ] Escribir un texto y buscar muestra una lista de hasta 10 resultados (miniatura + título) sin
      salir de la vista AR.
- [ ] Mirar sostenido una fila de resultado (gaze/dwell, mismo tiempo configurable que el resto de
      la interfaz vía la fila "Cursor" del menú brújula) la selecciona y reproduce el video embebido
      en el propio overlay; un click directo de mouse también funciona (equivalente de escritorio).
- [ ] El reproductor embebido tiene controles play/pause/rewind/forward funcionales, y un botón
      "NUEVA BÚSQUEDA" que vuelve a la lista sin perder el texto buscado.
- [ ] En `mirror-fix` con "Doble panel" activo, el video reproducido se ve/escucha en ambos paneles
      estéreo (volumen por panel para evitar eco, mismo criterio que `youtubeVideo`).
- [ ] Una búsqueda sin resultados, o con la red caída, muestra un mensaje explícito en el panel (no
      una lista vacía sin explicación ni un error sin manejar en consola).
- [ ] El overlay tiene su propio marcador 📍/d-pad de posición (menú "Interfaz" → "Position"), y
      guardar su posición devuelve `200` sin borrar las posiciones ya guardadas de los demás
      overlays (mismo merge superficial ya validado para `youtubeVideo` en el Requerimiento 015).
- [ ] `npm run check:i18n` (frontend) pasa con las claves `syncConfig.overlay.exploreYoutube`/
      `exploreYoutubeShort` en los 3 idiomas.
- [ ] `npm run build` (frontend) genera `explore-youtube.html` (confirma que quedó registrado en
      `vite.config.js`).
- [ ] `npm run test:cov` (backend) no baja la cobertura global de 80% con los archivos nuevos.

## 8. Referencias

- Requerimiento 015 (`1-Pending/015-ingesta-canciones-youtube`): decisión original de que embeber
  `youtube.com` completo no es viable (`X-Frame-Options`), y patrón concreto del overlay
  `youtubeVideo` (DOM + billboard + gaze/dwell + YouTube IFrame Player API) que este requerimiento
  reutiliza directamente.
- Requerimiento 014 (`1-Pending/014-agregar-nuevas-canciones`): patrón de dominio de backend
  (`SongsModule`) que sigue el nuevo dominio `youtube-search`.
- Requerimiento 016 (`2-Developing/016-cursor-interface-ar-sync`): configuración del tiempo de
  activación del cursor (`apprendevr_cursor_fuse_timeout`), reusada por el gaze/dwell de este
  overlay.
- Skill `overlay-ar-sync-aframe`: patrón de registro de un overlay nuevo en AR-SYNC (3 lugares
  obligatorios).
- [YouTube Data API v3 — `search.list`](https://developers.google.com/youtube/v3/docs/search/list):
  endpoint externo consultado desde el backend.
- Decisiones tomadas por el usuario en la conversación de origen: overlay independiente (no
  integrado con `VRNewSongAf`), sin API key propia todavía (paso previo a conseguir antes de
  implementar), solo reproduce en el propio overlay al seleccionar un resultado.
