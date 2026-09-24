# Problemas e incidentes

## 1. `NotAllowedError: Document is not focused` al pegar la URL del portapapeles en mirror-fix

**Síntoma**: el botón "PEGAR URL DEL PORTAPAPELES" de `VRNewSongAf.js` mostraba "No se pudo leer
el portapapeles (revisa los permisos del navegador)" siempre que se probaba dentro de `mirror-fix`,
aunque el mismo click sí llegaba al botón (otros botones del mismo panel, como "BUSCAR EN
YOUTUBE"/`window.open`, funcionaban bien).

**Causa real** (confirmada con `document.hasFocus()` en cada iframe del panel): en `mirror-fix`,
la brújula 3D (`SyncConfigCompassMenu.jsx`, capa más externa de cada panel) es la que recibe el
`mousedown`/`mousemove` real del navegador — los clicks SÍ llegan al overlay de contenido de abajo
(vía el raycast manual propio de cada componente), pero el FOCO del documento nunca se mueve a ese
iframe, se queda en el `<body>` de la página top-level. `navigator.clipboard.readText()` exige que
el documento que lo invoca tenga el foco real, y lo rechaza si no.

**Solución**: llamar `window.focus()` (el `window` del propio iframe) justo antes de
`navigator.clipboard.readText()`. Un script siempre puede pedir foco para su propia ventana, y
alcanza para que `document.hasFocus()` pase a `true` ahí antes de invocar la Clipboard API.
Verificado en vivo con `iframe.contentWindow.focus()` desde la página top-level: `hasFocus` pasa de
`false` a `true` de inmediato.

## 2. `PUT /api/user-settings/aframe-view` devolvía 400 al guardar la posición del overlay
   "Youtube Video"

**Síntoma**: agregar `{ key: 'youtubeVideo', selector: '#youtube-video-anchor' }` a `ELEMENTS` en
`vrPositionControl.js` no alcanzó — el botón GUARDAR del d-pad de ese elemento seguía devolviendo
400.

**Causa real (dos partes)**:
1. `isValidAframeViewConfig`/`isValidArsSyncOverlaysConfig` (`backend/src/user-settings/
   user-settings.util.ts`) todavía no conocían la clave `youtubeVideo` — mismo tipo de bug que
   `problems_solutions.md` del Requerimiento 010 ya había documentado para karaoke/songList/newSong
   ("dejando ese elemento fuera de la config guardada y haciendo fallar la validación del backend
   que exigía las claves exactas").
2. Al agregarla como clave **obligatoria** junto a las otras tres, apareció un problema distinto:
   `youtube-video.html` no tiene `#karaoke-vr-component`/`#new-song-component` en su DOM, así que
   `persist()` (`vrPositionControl.js`) desde ESA página solo manda `{ youtubeVideo: {...} }` —
   exigir las 4 claves juntas en el mismo payload rompía el guardado de esa página en particular
   (y, simétricamente, `index.html`/`aframe-overlay-modules.html` nunca mandan `youtubeVideo`
   porque no tienen ese elemento).

**Solución (dos partes)**:
1. `isValidAframeViewConfig` deja de exigir un conjunto fijo de claves: acepta cualquier
   subconjunto NO VACÍO de `['karaoke', 'songList', 'newSong', 'youtubeVideo']`, validando la forma
   (`{ position: [x,y,z] }`) de cada clave que esté presente. Mismo criterio aplicado a
   `isValidArsSyncOverlaysConfig` (agregar `youtubeVideo` a las claves de overlay conocidas).
2. `UserSettingsService.saveConfig` pasa de reemplazo completo del `config`
   (`row.config = config`) a **merge superficial** (`row.config = { ...row.config, ...config }`).
   Sin esto, un guardado parcial desde una página (p. ej. solo `youtubeVideo` desde
   `youtube-video.html`) borraría en silencio lo que otra página ya había guardado (p. ej. karaoke/
   songList/newSong desde `index.html`). Para las demás vistas de `user-settings` (siempre un
   objeto completo con un solo productor: `login-form`, `evaluation-panel`, `ars-sync-config`,
   `ars-sync-compass-position`) el merge se comporta idéntico al reemplazo anterior — mismas claves
   sobrescritas con los valores nuevos, sin regresión.

**Verificado en vivo**: `PUT /api/user-settings/aframe-view` responde 200 al guardar solo
`youtubeVideo`; un `GET` posterior confirma que karaoke/songList/newSong guardados antes siguen
intactos junto al `youtubeVideo` nuevo. Tests nuevos en `user-settings.util.spec.ts`
(subconjuntos válidos/inválidos) y `user-settings.service.spec.ts` (merge en vez de reemplazo);
`npx jest` completo del backend: 132/132 OK.

## 3. "Este video no está disponible" en local — la causa real es el `origin`, NO el permiso de embed

**Síntoma**: la mayoría de los videos de YouTube (incluido el guardado "Always" de Bon Jovi) daba
"Este video no está disponible" en el overlay `youtubeVideo`, y además "se reproducen una vez y ya
no se pueden volver a reproducir".

**Hipótesis inicial (INCORRECTA, descartada en vivo)**: que era la restricción de embed de los
sellos (VEVO/disqueras), que se sirve en `youtube.com` pero se niega en `<iframe>`. Esa era la
explicación obvia, pero **resultó falsa**: al abrir la vista desde un túnel Cloudflare
(`https://...trycloudflare.com/.../artest-mirror.html`), el mismo video "Always" **SÍ reprodujo**.
Si el dueño tuviera el embed bloqueado, también fallaría por el túnel — no es un permiso del video,
es el origen desde el que se embebe.

**Causa real — chequeo de `origin`/`Referer` de YouTube**: en local se sirve con `host: '0.0.0.0'` y
certificado autofirmado (`frontend/vite.config.js`, `server.host`/`server.https`). El navegador le
manda a YouTube un `Origin`/`Referer` tipo `https://<ip-lan>:3000` (una IP, no un dominio
reconocido, con TLS no confiable). YouTube **rechaza ese origen** y devuelve "Este video no está
disponible" dentro del iframe. El túnel (`*.trycloudflare.com`) es un dominio público real con TLS
válido → YouTube lo acepta → reproduce. Es el porqué de que `origin: window.location.origin` en los
`playerVars` no arregle nada en local: el origen sigue siendo `https://<ip>:3000`, que es justo lo
que YouTube no acepta.

**Nota sobre el diagnóstico**: chequear `playabilityStatus` vía `POST youtubei/v1/player` (clave web
genérica) devuelve `UNPLAYABLE / Video unavailable` ante cualquier request sin contexto de cliente
web válido — **no sirve** para distinguir "bloqueado para embed" de "origen rechazado". La única
prueba confiable es abrir el iframe real (`https://www.youtube.com/embed/<id>` o la vista completa)
desde el origen en cuestión.

**Acciones tomadas (parte "se reproduce una vez y no más", que SÍ era bug de código)**:
- `onStateChange` nuevo en `youtube-video-modules.js` (mantiene el label PLAY/PAUSE sincronizado y
  resetea con `seekTo(0)` + `playVideo()` al pasar por `ENDED`, en el botón propio y en el panel
  hermano) — un `playVideo()` directo sobre un player en `ENDED` no arranca de forma fiable.
- `onError` nuevo (mensaje claro: 101/150 = embed bloqueado por el dueño, 100 = eliminado/privado).
- `origin: window.location.origin` y `playsinline: 1` en `playerVars`.

**Pendiente / a tener en cuenta en desarrollo**:
- **Desktop**: probar sirviendo por `https://localhost:3000` en vez de `0.0.0.0` (YouTube suele
  tener `localhost` en whitelist). Si reproduce, confirma el diagnóstico y es el fix para desarrollo
  local en desktop.
- **Móvil**: la IP de LAN nunca va a pasar el chequeo de origen — ahí hace falta el túnel (o un
  dominio real). No es un bug corregible en el frontend para el caso móvil.
- No hay "dato que delate" a la app ni forma de evadir el chequeo de origen desde el cliente: es una
  decisión del lado de YouTube, la variable es el `origin`/`Referer` con el que llega el iframe.

**Estado**: causa raíz confirmada en vivo (túnel reproduce, local no). Fix de código aplicado y con
`npm run build` verde. Pendiente validar desktop por `localhost` y confirmar el comportamiento en
móvil con túnel.

## 4. Ingesta real (letra + descarga) — botones "GET TEXT FROM YOUTUBE" / "SAVE VIDEO YOUTUBE IN LOCAL"

**Pedido del usuario**: continuar el requerimiento 015 probando con "Always" de Bon Jovi: agregar al
panel "Add text" del overlay `songText` dos botones — obtener la letra desde YouTube y descargar el
video a local.

**Lo que se implementó** (variante acotada del diseño original, sin el overlay `youtube-karaoke` de
streaming ni LibreTranslate todavía):
- Backend, módulo nuevo `src/song-ingestion/`:
  - `POST /api/song-ingestion/lyrics-from-youtube` `{ youtubeUrl, archivo }` (sin auth, igual que
    `/frases`): baja los subtítulos automáticos en inglés con `yt-dlp --write-auto-sub`, parsea el
    VTT y crea una frase por verso en `frases_vr` (con `tiempo_frase`) asociada a la canción cuyo
    `fileName` es `archivo`.
  - `POST /api/song-ingestion/download-video` `{ youtubeUrl, archivo?, title?, author? }` (con
    `JwtAuthGuard`, igual que `POST /songs`): descarga el video con `yt-dlp` + `ffmpeg` a
    `frontend/public/videos/karaoke/<slug>.mp4` y lo deja como `source: 'server'`. Si `archivo`
    apunta a una canción existente (p. ej. la URL de una canción `source: 'youtube'`), se reutiliza
    esa fila (deriva su título/autor para el nombre de archivo) en vez de duplicar — así conserva
    las frases ya guardadas.
- Frontend, overlay `songText` (`song-text-modules.js`, panel "Add text song"): input de URL
  (pre-llenado con la URL de la canción seleccionada si es `source: 'youtube'`) + botones
  "GET TEXT FROM YOUTUBE" y "SAVE VIDEO YOUTUBE IN LOCAL".

**Verificado end-to-end con "Always"** (`9BMwcO6_hyA`): `lyrics-from-youtube` → 68 frases con tiempo
(00:00:38.5 … 00:05:58.7); `download-video` → `Always-Bon-Jovi.mp4` (h264/aac, 87 MB) en
`public/videos/karaoke/`, y la fila 259 pasó de `source: 'youtube'`/`fileName`=URL a
`source: 'server'`/`fileName=Always-Bon-Jovi.mp4`. `GET /api/songs` ahora la incluye (pública) y
`GET /api/frases?archivo=Always-Bon-Jovi.mp4` devuelve la letra.

**Hallazgos técnicos importantes (para la implementación completa del requerimiento):**

1. **Las URLs con parámetros de playlist cuelgan a `yt-dlp`.** La canción "Always" estaba guardada
   con `fileName = https://www.youtube.com/watch?v=9BMwcO6_hyA&list=RD...&index=21`. Pasada tal cual
   a `yt-dlp`, el proceso se colgaba (procesaba la playlist entera) y el endpoint daba 500 por el
   timeout de 60s. **Solución**: `normalizeYoutubeUrl()` en el backend — extrae el video ID y arma
   la URL canónica `https://www.youtube.com/watch?v=<id>` ANTES de invocar `yt-dlp` (tanto para
   subtítulos como para descarga).

2. **El "mejor mp4" de VEVO es vp9/opus, que Safari/iOS no reproducen.** Con `-f
   bestvideo+bestaudio` se descargó un `.mp4` con streams `vp9`+`opus` (el contenedor mp4 no
   garantiza h264). **Solución**: forzar h264/aac con
   `bestvideo[vcodec^=avc1]+bestaudio[ext=m4a]/best[vcodec^=avc1]/best`, que para "Always" eligió
   `137` (h264 1080p) + `140` (m4a aac).

3. **`yt-dlp` y `ffmpeg` son dependencias de sistema, no de npm** (ya previsto en el requerimiento,
   sección 5). En este Mac se instalaron con `brew install yt-dlp ffmpeg`. Hay que documentarlo en
   el README del backend para otros entornos.

4. **Limpieza de subtítulos**: los auto-subtítulos de canciones traen sonidos entre paréntesis
   (`(dog barking)`, `(rock ballad music)`) y notas musicales `♪`. El parser descarta los cues que
   son solo sonidos (envueltos en `(...)`/`[...]`) y quita las `♪` — de los ~72 cues de "Always"
   quedaron 68 versos reales.

**Pendiente (siguiente paso del requerimiento)**: la traducción al español real (LibreTranslate) —
por ahora `espanol_frase` repite el inglés para no dejar la columna NOT NULL vacía; la letra se
muestra y se canta correctamente, pero sin traducción. Tampoco se agregaron las palabras
(`palabras_vr`) ni la columna `youtube_video_url` (migración), que son parte del pipeline completo
pero no de esta prueba.

## 5. Traducción real (LibreTranslate) — frases y palabras

**Pedido del usuario**: "continúa con la traducción; no debería insertar el texto en inglés en
`español_frase`". El `lyrics-from-youtube` de la fase 4 repetía el inglés en `espanol_frase` como
placeholder — había que traducirlo de verdad.

**Lo que se implementó:**

1. **Servicio Docker `translate` (LibreTranslate)** en `docker-compose.yml`: imagen
   `libretranslate/libretranslate`, con `LT_LOAD_ONLY=en,es` (solo inglés y español, arranque más
   rápido). **Puerto 5001 del host → 5000 del contenedor**, no 5000: en macOS el 5000 lo usa AirPlay
   Receiver (`Error response from daemon: ports are not available... 0.0.0.0:5000`).
2. **Config**: `libreTranslateUrl` en `configuration.ts` (default `http://localhost:5001`) +
   `LIBRETRANSLATE_URL` en `.env`/`.env.example`.
3. **`translation.util.ts`**: `translateText(baseUrl, text, from, to)` — `POST /translate` a
   LibreTranslate, devuelve `translatedText` o lanza si el servicio falla. Testeado mockeando
   `global.fetch`.
4. **`lyrics.util.ts`**: `tokenizeWords(text)` — tokeniza una frase en palabras únicas, minúsculas,
   conservando el apóstrofo de contracciones (`i'll`, `can't`) y descartando signos/`♪`/tokens sin
   letras. Mismo criterio que el dump legacy de `palabras_vr`.
5. **`Word` entity**: agregada la columna `phraseId` (`id_frase_palabra`, NOT NULL en el dump — la
   entidad no la mapeaba porque el flujo de lectura no la necesitaba, pero es obligatoria al crear).
6. **`WordsService.create(songId, phraseId, english, spanish)`** + `WordsModule` ahora exporta el
   service (lo consume `song-ingestion`).
7. **`SongIngestionService.lyricsFromYoutube`**: traduce TODAS las frases y TODAS las palabras únicas
   por adelantado (todo o nada: si una traducción falla, no se inserta nada), y recién después crea
   las frases (con `espanol_frase` traducido) y una palabra por token (con `esp_palabra` traducido y
   su `phraseId`). Las palabras repetidas entre frases se traducen una sola vez (cache global).

**Verificado end-to-end con "Always"** (fila 259, `fileName=Always-Bon-Jovi.mp4` tras la descarga de
la fase 4): `lyrics-from-youtube` → `{ count: 68, words: 371 }`. Ejemplos reales del resultado:
- "This Romeo is bleeding" → "Este Romeo está sangrando"
- "But you can't see his blood" → "Pero no puedes ver su sangre"
- `this → esto`, `bleeding → sangrado`, `can't → no puede`, `blood → sangre`

`GET /api/frases` devuelve `espanol_frase` traducido y `GET /api/palabras` devuelve las 371 palabras
traducidas con su frase de origen. Backend 227 tests verdes, cobertura global 96.55%.

**Hallazgos técnicos (traducción):**

1. **macOS ya usa el puerto 5000 (AirPlay Receiver)** — LibreTranslate no puede bindear ahí. Usar
   5001 (o cualquier puerto libre) como default del host.
2. **Node ≥18 tiene `fetch` global** (acá corre Node v24.18.0) — no hizo falta agregar una lib HTTP
   para llamar a LibreTranslate.
3. **`español_frase` tiene la ñ** — al consultarla por `docker exec mysql` en la terminal, la ñ se
   corrompe (error de sintaxis MySQL). Para verificar usar la API (`GET /api/frases`) o
   `--default-character-set=utf8mb4`, no el `SELECT` directo en consola.
4. **Orden de flujo en la UI**: si primero se descarga el video (SAVE VIDEO) y después se pide la
   letra (GET TEXT), el `fileName` de la canción ya cambió a `<slug>.mp4`, así que `archivo` debe
   ser ese nombre, no la URL. El frontend ya manda `state.fileName` (el valor actual), así que
   cubre ambos casos.

**Pendiente (siguiente paso del requerimiento)**: la columna `youtube_video_url` (migración) para
conservar la URL de origen después de la descarga (hoy `markAsDownloaded` sobreescribe `fileName` y
se pierde la URL); el overlay `youtube-karaoke` de streaming; y el fallback a LRCLIB cuando no hay
subtítulos.
