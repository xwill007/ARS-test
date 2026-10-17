# Requerimiento 017 — Overlay "Explore Youtube AR": buscar en YouTube desde New Song, reproducir y rellenar los campos para guardar

## 1. Objetivo

Que el botón **"BUSCAR EN YOUTUBE"** del panel "New Song" (formulario de alta de canciones,
`VRNewSongAf.js`) deje de abrir una pestaña externa del navegador y, en su lugar, active un overlay
nuevo e independiente de AR-SYNC, **"Explore Youtube AR"**, que recibe automáticamente el artista
y/o nombre de la canción ya escritos en el formulario, busca en YouTube (a través de un endpoint
propio del backend), muestra una lista de resultados (miniatura + título) dentro de la propia vista
AR, y al seleccionar uno lo **reproduce embebido** y **rellena los campos URL / título / artista** del
panel "New Song" para que el usuario pueda guardarlos — todo sin salir de la vista AR ni copiar
nada a mano.

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
  decisión: la aborda con un enfoque distinto (API propia + UI 3D/DOM propia) que sí es viable.
- **Antecedente de "Buscar en YouTube" actual (salida a pestaña externa):**
  `VRNewSongAf.js` (panel "New Song" del karaoke,
  `ApprendeVr/frontend/src/views/A-frame/components/VRKaraokeAf/components/VRNewSongAf/VRNewSongAf.js`,
  ~línea 349, `onSearchClick`) tiene un botón "BUSCAR EN YOUTUBE" que arma una consulta con el
  título y el autor escritos (`[titulo, autor].filter(Boolean).join(' ')`) y hace
  `window.open('https://www.youtube.com/results?search_query=' + query, '_blank', 'noopener')`. El
  usuario sale de la vista AR, busca en una pestaña normal del navegador y vuelve a copiar la URL
  encontrada a mano. **Este requerimiento cambia ese comportamiento**: el botón activa el overlay
  nuevo y le pasa la consulta, en lugar de abrir una pestaña externa (se conserva el `window.open`
  como fallback solo en la vista de producción `src/views/A-frame/index.html`, donde no existe
  AR-SYNC ni este overlay).
- **Overlay existente más cercano: `youtubeVideo` ("Youtube Video"), ver Requerimiento 015.**
  `VRYoutubeVideoOverlaySync.jsx` monta `youtube-video.html` (página Vite real, no `srcDoc`, para
  poder importar `vrPositionControl.js`) que a su vez carga `youtube-video-modules.js`. Ese overlay
  ya resuelve, y este requerimiento reutiliza como precedente directo:
  - Un panel de **DOM normal** (no geometría 3D de A-Frame) que sigue en pantalla a un ancla 3D
    (`#youtube-video-anchor`) con la técnica "billboard" (`Vector3.project(camera)` en cada frame).
  - Un mecanismo de **gaze/dwell sobre botones de DOM** (no raycaster de A-Frame): como los
    controles son `<button>` normales y no mallas 3D, se usa `document.elementFromPoint()` en el
    centro del canvas (donde apunta el reticle) para saber qué botón está "mirado", acumula tiempo
    de activación (`FUSE_MS`, leído de `localStorage['apprendevr_cursor_fuse_timeout']`, configurable
    desde la fila "Cursor" del Requerimiento 016) y dispara `btn.click()` al completarse — mismo
    patrón que este requerimiento necesita para que los resultados de búsqueda sean clickeables con
    el cursor.
  - Reproducción embebida de un video ya elegido vía **YouTube IFrame Player API**
    (`loadYoutubeApi()`/`showVideo()`), con controles play/pause/rewind/forward y sincronización
    entre los dos paneles estéreo por `postMessage`.
  - Botón "PEGAR URL DEL PORTAPAPELES" (`navigator.clipboard.readText()` + `window.focus()` previo,
    necesario porque el foco real del navegador en `mirror-fix` lo tiene la brújula 3D, no el
    iframe de contenido).
  - Puente de sincronización de cámara (rotación + posición) por `postMessage`, idéntico en los 3
    overlays de contenido existentes.
- **El overlay `youtubeVideo` no busca nada — solo reproduce una URL ya conocida.** No tiene campo
  de búsqueda ni lista de resultados. "Explore Youtube AR" es el paso previo que falta: buscar y
  elegir, y (nuevo respecto del 017 original) **devolver esa elección al panel "New Song"**.
- **No existe ningún cliente de la YouTube Data API en el proyecto** (confirmado por búsqueda en el
  repo): ni backend ni frontend consultan hoy `googleapis.com`/`YOUTUBE_API_KEY`. Hay que agregarlo
  desde cero.
- **Registro de overlays de AR-SYNC**, los 3 lugares obligatorios (ver skill
  `overlay-ar-sync-aframe` y su aplicación real en el overlay `youtubeVideo`, Requerimiento 015):
  `SYNCABLE_OVERLAYS` en `SyncStereoTestView.jsx` (~línea 40), `OVERLAY_OPTIONS` en
  `SyncConfigCompassMenu.jsx` (~línea 132, la lista real vive ahí, no en `SyncConfigMenu.jsx`, que
  ya no se usa como panel), y la clave de traducción `syncConfig.overlay.<clave>` en
  `src/locales/{es,en,br}.json`.
- **Patrón de backend ya establecido** (`SongsModule`, Requerimiento 014): un dominio por carpeta
  bajo `src/`, `GET` público sin `JwtAuthGuard` cuando el dato no es por-usuario, DTO con
  `class-validator`, `.spec.ts` junto a cada archivo. Este requerimiento sigue el mismo patrón para
  un nuevo dominio `youtube-search`.
- **Puente de campos del panel "New Song"**: `new-song-modules.js` (entrada del overlay `newSong`)
  ya mantiene sincronizados los campos `titulo`/`autor`/`archivo`/`youtubeUrl` entre los paneles
  izquierdo/derecho vía `postMessage` (`action: 'new-song-field-update'`), y escribe la URL en
  `localStorage['apprendevr_youtube_preview_url']` para que el overlay `youtubeVideo` la lea. Ese
  mismo archivo es el lugar natural para recibir la selección del overlay "Explore Youtube AR" y
  rellenar los campos del formulario.
- **Configuración de variables de entorno del backend** (`src/config/configuration.ts`,
  `.env.example`): hoy solo tiene `port`, `database`, `jwt`, `corsOrigin` — no hay precedente de una
  API key de un servicio externo; se agrega siguiendo la misma forma (`process.env.X ?? default`).

## 3. Historias de usuario

- Como usuario que está armando una canción nueva en el karaoke VR, quiero pulsar "BUSCAR EN
  YOUTUBE" y que se abra una búsqueda de YouTube con el artista/canción que ya escribí, para no
  tener que salir a una pestaña del navegador ni copiar la URL a mano.
- Como usuario que mira los resultados de una búsqueda, quiero seleccionar uno con el mismo cursor
  con el que interactúo con el resto del menú AR, para no necesitar el mouse o el teclado físico.
- Como usuario que encontró el video que buscaba, quiero verlo reproducirse ahí mismo en el overlay
  de exploración, para confirmar que es el correcto antes de usarlo.
- Como usuario que confirmó el video correcto, quiero que su URL (y, si están vacíos, su título y
  artista) queden rellenados en el formulario "New Song", para guardarlo como canción con un solo
  paso más.
- Como usuario en el modo espejo estéreo (`mirror-fix`), quiero poder activar "Explore Youtube AR"
  como un overlay más desde el menú de overlays, igual que el resto, para elegir explícitamente
  cuándo lo necesito.
- Como usuario que busca algo y no obtiene resultados (o la búsqueda falla por cuota agotada o error
  de red), quiero ver un mensaje explícito en el propio overlay, para saber que debo reintentar o
  refinar la búsqueda.

## 4. Alcance

### Incluido

- **Backend — nuevo dominio `youtube-search` (`src/youtube-search/`):**
  - `YoutubeSearchService.search(query: string)`: llama a la YouTube Data API v3
    (`GET https://www.googleapis.com/youtube/v3/search`, `part=snippet&type=video&maxResults=10`)
    con la API key desde configuración, devuelve una lista normalizada
    `[{ videoId, title, thumbnailUrl, channelTitle }]`. Sin paginación (una sola página de hasta 10
    resultados) ni filtros adicionales.
  - `YoutubeSearchController` (`@Controller('youtube-search')`): `GET /api/youtube-search?q=<texto>`
    (público, sin `JwtAuthGuard`). Valida que `q` no esté vacío (400 si falta); si la YouTube Data
    API responde error (cuota agotada, key inválida, red), lo traduce a un error controlado (502 o
    503, no un 500 crudo) con un mensaje que el frontend pueda mostrar.
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
  `/api/youtube-search?q=...`, no-op silencioso con `console.warn` si falla la red.
- **Frontend — overlay nuevo "Explore Youtube AR" (clave `exploreYoutube`), siguiendo el skill
  `overlay-ar-sync-aframe` y el patrón concreto ya usado por el overlay `youtubeVideo`:**
  - Página Vite real `explore-youtube.html` + `explore-youtube-modules.js` (mismo patrón `src` real
    que `youtube-video.html`/`youtube-video-modules.js` — no `srcDoc`, para poder reusar
    `vrPositionControl.js` real), registrada en `vite.config.js` → `build.rollupOptions.input`.
  - Panel de DOM (no geometría 3D) que sigue a un ancla 3D propia (`#explore-youtube-anchor`) con la
    misma técnica "billboard" que `youtube-video-modules.js`, y tiene su propio marcador
    📍/d-pad de posición (`vrPositionControl.js`, nueva clave `exploreYoutube`).
  - Campo de texto de búsqueda + botón "BUSCAR" (mismo patrón de `stopPropagation` en
    `pointerdown`/`mousedown`/`click` que ya usa `youtube-video-modules.js` para no disparar el
    raycast manual de la escena al escribir).
  - **Auto-búsqueda al abrirse desde "BUSCAR EN YOUTUBE"**: lee la consulta que dejó el panel
    `New Song` en `localStorage['apprendevr_youtube_search_query']` al montar y, si existe, la
    precarga en el campo y lanza la búsqueda automáticamente (sin que el usuario tenga que volver a
    escribir). Si el overlay se activa a mano desde el menú ⚙️ → "Overlays" (sin consulta previa),
    arranca con el campo vacío como siempre.
  - Lista de resultados como filas de DOM (miniatura + título, hasta 10), cada una un `<button>`
    normal — reusa tal cual el mecanismo de gaze/dwell de `youtube-video-modules.js`
    (`findGazeButton()`/`document.elementFromPoint()` sobre el centro del canvas + `FUSE_MS` desde
    `localStorage['apprendevr_cursor_fuse_timeout']`) para que mirar sostenido una fila la
    seleccione, más click directo de mouse para el caso de escritorio.
  - Al seleccionar un resultado: se reproduce el video embebido en el propio overlay (YouTube IFrame
    Player API, misma implementación que `showVideo()`/`loadYoutubeApi()` de
    `youtube-video-modules.js`, con controles play/pause/rewind/forward y volumen por panel para
    AR-SYNC estéreo) **y además** se envía al panel "New Song" la selección (URL + título + autor)
    para rellenar sus campos (ver integración más abajo). Un botón "NUEVA BÚSQUEDA" vuelve a la
    lista sin perder el texto buscado.
  - Puente de sincronización de cámara (rotación + posición) por `postMessage`, copiado del mismo
    patrón que los 3 overlays de contenido existentes.
  - Estados de error visibles en el propio panel (sin resultados, cuota agotada, sin conexión, API
    key no configurada en el backend) — nunca falla en silencio ni deja la lista vacía sin
    explicación.
  - `VRYoutubeExploreOverlaySync.jsx` (`forwardRef`, monta `explore-youtube.html` en un
    `<iframe src>` real).
  - Registro en los 3 lugares obligatorios: `SYNCABLE_OVERLAYS` (`SyncStereoTestView.jsx`),
    `OVERLAY_OPTIONS` (`SyncConfigCompassMenu.jsx` — ajustar también el layout dinámico del grupo
    Overlays, que ya depende de `OVERLAY_OPTIONS.length`), y clave
    `syncConfig.overlay.exploreYoutube`/`exploreYoutubeShort` en `src/locales/{es,en,br}.json`.
  - `vrPositionControl.js`: nueva entrada en `ELEMENTS` (clave `exploreYoutube`, ancla
    `#explore-youtube-anchor`).
  - `user-settings.util.ts`: agregar `exploreYoutube` a las claves válidas de
    `isValidArsSyncOverlaysConfig` (mismo ajuste que ya requirió el overlay `youtubeVideo`).
- **Integración "New Song" ↔ "Explore Youtube AR" (diferencia central con el 017 original):**
  - `VRNewSongAf.js`, `onSearchClick` (botón "BUSCAR EN YOUTUBE"): en vez de `window.open`, arma la
    consulta (`[titulo, autor].filter(Boolean).join(' ')`), la guarda en
    `localStorage['apprendevr_youtube_search_query']` y, si el panel está embebido en `mirror-fix`
    (`window.parent !== window`), manda `activate-overlay` con `key: 'exploreYoutube'` al padre
    (mismo patrón que ya usa el botón "PREVIEW ON YOUTUBE" para `youtubeVideo`). En la vista de
    producción (`src/views/A-frame/index.html`, sin AR-SYNC) conserva el `window.open` actual como
    fallback.
  - `explore-youtube-modules.js`, al seleccionar un resultado: además de reproducirlo, manda al
    padre `{ action: 'explore-youtube-select', url, title, artist }`.
  - `SyncStereoTestView.jsx`: nuevo handler de `explore-youtube-select` que reenvía a **ambos**
    overlays `newSong` (izquierdo y derecho, no solo al opuesto — mismo fan-out que ya usa
    `cancion-agregada`) un mensaje `{ action: 'explore-youtube-fill', url, title, artist }`.
  - `new-song-modules.js`: nuevo handler de `explore-youtube-fill` que rellena los campos del
    componente `vr-new-song-af`: `youtubeUrl` **siempre** (es la fuente elegida), y `titulo`/`autor`
    **solo si están vacíos** (no pisa lo que el usuario ya escribió — mismo criterio que el
    autocompletado por URL existente en `VRNewSongAf.js`), refrescando el texto de cada campo.
- **Documentación:** actualizar `ApprendeVr/Documentation/backend-nestjs.md` con la ruta
  `GET /api/youtube-search`.

### No incluido

- **Embeber la página real de `youtube.com` (búsqueda/resultados/canal) en un iframe:** confirmado
  no viable por `X-Frame-Options`/CSP (ver "Antecedentes", Requerimiento 015). Este requerimiento no
  vuelve a evaluar esa opción.
- **Paginación de resultados** ("cargar más", scroll infinito, `pageToken` de la API): se muestra
  una sola página de hasta 10 resultados; si no está lo que se busca, el usuario refina el texto.
- **Filtros de búsqueda** (duración, fecha de subida, canal, orden por relevancia/fecha/vistas):
  siempre los parámetros por defecto de la API (`type=video`, sin más filtros).
- **Disparar automáticamente el pipeline de ingesta** (`song-ingestion`, Requerimiento 015: letra,
  subtítulos, traducción) al seleccionar un resultado: este requerimiento solo **rellena los campos
  URL/título/autor** del formulario y deja que el usuario pulse "GUARDAR CANCION" como ya lo hace.
- **Conseguir la API key de Google Cloud (YouTube Data API v3) como parte de este requerimiento:**
  el usuario confirmó que no la tiene todavía — conseguirla (crear proyecto en Google Cloud
  Console, habilitar "YouTube Data API v3", generar una API key) es un paso previo necesario para
  probar el flujo end-to-end, pero no bloquea redactar ni empezar a implementar este requerimiento
  (el backend/frontend se implementan y testean con el cliente HTTP mockeado; sin la key real,
  `GET /api/youtube-search` en un ambiente real devuelve el error controlado 503 documentado).
- **Manejo de cuota de la YouTube Data API más allá de reportar el error:** no se implementa caché,
  rate-limiting propio, ni fallback a otro proveedor si se agota la cuota diaria (10,000 unidades/día
  en el tier gratuito, cada `search.list` consume 100 unidades — alcanza para ~100 búsquedas/día).
- **Reproducir el resultado elegido dentro del overlay `youtubeVideo`:** la reproducción de este
  requerimiento vive solo dentro del propio overlay "Explore Youtube AR" (el overlay `youtubeVideo`
  sigue existiendo como alternativa independiente, alimentada por `apprendevr_youtube_preview_url`).
- **Descargar o transcribir el video elegido** (letra, subtítulos, traducción): eso es el alcance
  del Requerimiento 015 (`song-ingestion`), no de este.

## 5. Diseño técnico

**Enfoque elegido: API propia (YouTube Data API v3) + UI de resultados propia, no un navegador
embebido (decisión tomada con el usuario tras confirmar la limitación de `X-Frame-Options`, ver
Requerimiento 015).** La única forma de tener "búsqueda de YouTube interactuable con el cursor
dentro del AR" es no depender de renderizar la página real de YouTube: se consulta su API pública de
datos (resultados como JSON) y se dibuja una lista propia, que sí puede ser controlada por el mismo
mecanismo de cursor que el resto de la interfaz. El costo aceptado es que la lista de resultados no
tiene la personalización de la sesión real del usuario (historial, recomendaciones, login).

**API key proxeada desde el backend, nunca expuesta en el frontend.** Mismo criterio de seguridad
que el resto del backend NestJS: un cliente HTTP directo desde el navegador a
`googleapis.com/youtube/v3/search` expondría la key en el código fuente servido. El endpoint propio
`GET /api/youtube-search` es el único que conoce `YOUTUBE_API_KEY` (variable de entorno del servidor).

**`GET /api/youtube-search` público (sin `JwtAuthGuard`), igual criterio que `GET /songs`.** Buscar
videos no modifica datos ni es específico de un usuario; el overlay debe poder buscar apenas se
activa, sin depender de sesión.

**DOM + gaze/dwell manual, no geometría 3D + raycaster de A-Frame (decisión por consistencia con el
overlay `youtubeVideo` ya existente, Requerimiento 015).** Se consideró construir la lista de
resultados como planos/texto de A-Frame, pero se descarta: el overlay `youtubeVideo` ya resolvió
este mismo problema (panel con inputs, botones y video embebido) como DOM real con billboard +
gaze/dwell manual vía `document.elementFromPoint()`, porque el contenido (input de texto, iframe de
reproductor) no puede ser geometría 3D de todos modos. Se prefiere un único mecanismo consistente
(DOM + gaze/dwell) de punta a punta.

**Integración con `New Song` por puente de mensajes + `localStorage` (decisión nueva, cambia el 017
original que era "overlay independiente sin integrar").** El flujo completo es:
1. **Abrir con consulta**: `VRNewSongAf.js` escribe la consulta en
   `localStorage['apprendevr_youtube_search_query']` y manda `activate-overlay` con
   `key: 'exploreYoutube'` (idéntico mecanismo al botón "PREVIEW ON YOUTUBE" existente). Se usa
   `localStorage` (mismo origen) para el dato puntual de la consulta, en vez de un mensaje
   `postMessage` con payload, porque el overlay puede montarse **después** de que el botón se pulsó
   y un `postMessage` enviado antes del mount se perdería (mismo motivo por el que la URL de
   `youtubeVideo` ya viaja por `localStorage['apprendevr_youtube_preview_url']`).
2. **Buscar y reproducir**: el overlay lee la consulta al montar, la precarga y busca; seleccionar
   un resultado lo reproduce embebido (YouTube IFrame Player API, copiado de `youtubeVideo`).
3. **Devolver la selección**: el overlay manda `explore-youtube-select` al padre; el padre hace
   fan-out a ambos overlays `newSong` con `explore-youtube-fill` (mismo fan-out a las 4
   combinaciones que ya usa `cancion-agregada`, porque "New Song" es un iframe DISTINTO del de
   "Explore" incluso dentro del MISMO panel); `new-song-modules.js` rellena los campos. Se eligió un
   mensaje nuevo (`explore-youtube-fill`) en vez de reutilizar `new-song-field-update` porque aquel
   es una sincronización ciega de valores entre paneles, mientras que este debe respetar la regla
   "rellenar solo si está vacío" — y esa lógica necesita conocer el valor actual, cosa que solo
   `new-song-modules.js` (dueño del componente `vr-new-song-af`) puede hacer.

**Regla de relleno de campos: `youtubeUrl` siempre, `titulo`/`autor` solo si están vacíos.** Es la
URL la que identifica el video elegido (y puede pisarse sin pérdida: es el resultado de la
selección); el título y el autor vienen de la metadata del resultado de YouTube (que puede diferir
del texto que el usuario ya tipeó a mano), así que solo se completan si el campo está vacío — mismo
criterio que el autocompletado por URL de `autofillFromYoutubeUrl` en `VRNewSongAf.js`.

**Sin paginación ni filtros, alcance acotado a "una búsqueda, una lista de hasta 10".** No hay
precedente de scroll/paginación en ningún panel de DOM de `mirror-fix`; si 10 resultados no alcanzan,
el usuario refina el texto de búsqueda.

**No se dispara la ingesta (Requerimiento 015) al seleccionar.** Solo se rellenan los campos; el
guardado sigue siendo una acción explícita del usuario ("GUARDAR CANCION"), que ya tiene su propio
flujo (`_saveSong` → `POST /api/songs` o catálogo local). Queda como ampliación futura posible si se
necesita el flujo combinado "buscar → elegir → ingerir" en un solo paso.

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
| `ApprendeVr/frontend/src/views/A-frame/components/VRKaraokeAf/components/VRNewSongAf/VRNewSongAf.js` | `onSearchClick`: guardar consulta en `localStorage['apprendevr_youtube_search_query']` y mandar `activate-overlay` (`exploreYoutube`) al padre; `window.open` solo como fallback fuera de `mirror-fix`. |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/components/SyncStereoTestView/components/VRYoutubeExploreOverlaySync/explore-youtube.html` | Nuevo: página Vite real (mismo patrón que `youtube-video.html`). |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/components/SyncStereoTestView/components/VRYoutubeExploreOverlaySync/explore-youtube-modules.js` | Nuevo: panel de búsqueda + lista de resultados + reproductor embebido; auto-búsqueda desde `localStorage`; emite `explore-youtube-select`; gaze/dwell, billboard, puente de cámara, marcador de posición. |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/components/SyncStereoTestView/components/VRYoutubeExploreOverlaySync/VRYoutubeExploreOverlaySync.jsx` | Nuevo: `forwardRef`, monta `explore-youtube.html` en `<iframe src>` real (con `index.js` re-export). |
| `ApprendeVr/frontend/vite.config.js` | Registrar `explore-youtube.html` en `build.rollupOptions.input`. |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/SyncStereoTestView.jsx` | Agregar `exploreYoutube` a `SYNCABLE_OVERLAYS`; nuevo handler `explore-youtube-select` → fan-out `explore-youtube-fill` a ambos overlays `newSong`. |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/components/SyncStereoTestView/components/SyncConfigCompassMenu/SyncConfigCompassMenu.jsx` | Agregar `exploreYoutube` a `OVERLAY_OPTIONS`. |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/components/SyncStereoTestView/components/VRNewSongOverlaySync/new-song-modules.js` | Nuevo handler `explore-youtube-fill`: rellena `youtubeUrl` (siempre) y `titulo`/`autor` (solo si vacíos), y refresca los campos. |
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
      junto a los demás.
- [ ] Al pulsar "BUSCAR EN YOUTUBE" en el panel "New Song" (con título/autor escritos), el overlay
      "Explore Youtube AR" se activa y busca automáticamente con esa consulta, sin abrir una pestaña
      externa del navegador.
- [ ] Al activar el overlay a mano desde el menú ⚙️ → "Overlays" (sin consulta previa), aparece con
      el campo de búsqueda vacío.
- [ ] Escribir un texto y buscar muestra una lista de hasta 10 resultados (miniatura + título) sin
      salir de la vista AR.
- [ ] Mirar sostenido una fila de resultado (gaze/dwell, mismo tiempo configurable que el resto de
      la interfaz) la selecciona y reproduce el video embebido en el propio overlay; un click directo
      de mouse también funciona.
- [ ] Al seleccionar un resultado, el campo "YouTube URL" del panel "New Song" queda rellenado con
      la URL del video, y "Titulo"/"Autor" quedan rellenados solo si estaban vacíos (nunca se pisa lo
      que el usuario ya escribió).
- [ ] El reproductor embebido tiene controles play/pause/rewind/forward funcionales, y un botón
      "NUEVA BÚSQUEDA" que vuelve a la lista sin perder el texto buscado.
- [ ] En `mirror-fix` con "Doble panel" activo, el video reproducido se ve/escucha en ambos paneles
      estéreo (volumen por panel para evitar eco, mismo criterio que `youtubeVideo`), y los campos
      de "New Song" quedan rellenados en ambos paneles.
- [ ] Una búsqueda sin resultados, o con la red caída, muestra un mensaje explícito en el panel (no
      una lista vacía sin explicación ni un error sin manejar en consola).
- [ ] El overlay tiene su propio marcador 📍/d-pad de posición, y guardar su posición devuelve `200`
      sin borrar las posiciones ya guardadas de los demás overlays.
- [ ] `npm run check:i18n` (frontend) pasa con las claves `syncConfig.overlay.exploreYoutube`/
      `exploreYoutubeShort` en los 3 idiomas.
- [ ] `npm run build` (frontend) genera `explore-youtube.html` (confirma que quedó registrado en
      `vite.config.js`).
- [ ] `npm run test:cov` (backend) no baja la cobertura global de 80% con los archivos nuevos.

## 8. Referencias

- Requerimiento 015 (`3-Completed/015-ingesta-canciones-youtube`): decisión original de que embeber
  `youtube.com` completo no es viable (`X-Frame-Options`), y patrón concreto del overlay
  `youtubeVideo` (DOM + billboard + gaze/dwell + YouTube IFrame Player API) que este requerimiento
  reutiliza directamente.
- Requerimiento 014 (`2-Developing/014-agregar-nuevas-canciones`): patrón de dominio de backend
  (`SongsModule`) que sigue el nuevo dominio `youtube-search`, y overlay `newSong` + puente de
  campos (`new-song-modules.js`).
- Requerimiento 016 (`2-Developing/016-cursor-interface-ar-sync`): configuración del tiempo de
  activación del cursor (`apprendevr_cursor_fuse_timeout`), reusada por el gaze/dwell de este
  overlay.
- Skill `overlay-ar-sync-aframe`: patrón de registro de un overlay nuevo en AR-SYNC (3 lugares
  obligatorios).
- [YouTube Data API v3 — `search.list`](https://developers.google.com/youtube/v3/docs/search/list):
  endpoint externo consultado desde el backend.
- Decisiones tomadas por el usuario en la conversación de origen: el botón "BUSCAR EN YOUTUBE" abre
  el overlay (no una pestaña externa) pasándole artista/canción; al seleccionar un resultado se
  reproduce y se rellenan URL/título/artista del formulario "New Song"; sin API key propia todavía
  (paso previo a conseguir antes de implementar).
