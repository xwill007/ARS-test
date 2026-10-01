# Requerimiento 015 — Ingesta automática de canciones desde YouTube (letra + traducción + descarga)

## 1. Objetivo

Permitir que, a partir de una URL de YouTube, el sistema arme una canción para el karaoke sin
escribir todo a mano: obtiene la letra en inglés con tiempos por frase (subtítulos automáticos del
video vía `yt-dlp`), la traduce al español frase por frase y palabra por palabra (LibreTranslate
self-hosted), y guarda todo en `canciones_vr` / `frases_vr` / `palabras_vr`. El video puede
descargarse al **servidor** (queda como canción local pública, reproducible como textura 3D igual
que las precargadas) o al **dispositivo** del usuario (se streamea al navegador y vive en su
IndexedDB, canción privada). Complementa al Requerimiento 014 (alta manual vía `POST /songs`).

> **Nota de alcance (estado real del código).** El diseño original de este requerimiento preveía un
> endpoint único `POST /song-ingestion/from-youtube` con `sourceMode: 'download'|'stream'` y un
> overlay de streaming (`youtube-karaoke`). Al implementarlo se reorientó hacia **tres acciones
> separadas y explícitas** (obtener letra / descargar al servidor / descargar al dispositivo)
> expuestas como botones del overlay `songText`, más un overlay de previsualización (`youtubeVideo`).
> **Quedan sin implementar**: el fallback a LRCLIB, el overlay de streaming `youtube-karaoke` y el
> endpoint único orquestador con `sourceMode`. Ver sección 4 (Pendiente).

## 2. Antecedentes y estado actual

- **Depende del Requerimiento 014**: usa `SongsService.create()`/`POST /songs` como base para crear
  o reutilizar la fila de `canciones_vr`.
- **`frases_vr`/`palabras_vr` ya admiten escritura.** `PhrasesService`/`WordsService` fueron
  ampliados con `create()` y las entidades completadas:
  - `Phrase` mapea `tiempo_frase` (TIME) como `time`.
  - `Word` mapea `id_frase_palabra` como `phraseId` (obligatoria al crear, era `NOT NULL` en el dump
    pero no se mapeaba porque el flujo de lectura no la necesitaba).
- **`canciones_vr` es multi-source.** `fuente_cancion` pasó de un valor único a una lista separada
  por comas (p. ej. `youtube,server`), para conservar a la vez el origen (`youtube`) y la forma de
  reproducción (`server`/`local`). La visibilidad se define por **presencia** de fuentes:
  - Pública → contiene `server` (archivo real en el servidor).
  - Privada (solo su creador) → contiene `local` o `youtube` pero **no** `server`.
  Migración `db/015-songs-fuente-multi.sql`.
- **Columna `url_cancion`** (`VARCHAR(255) NULL`) agregada vía `db/014-songs-url-cancion.sql`: guarda
  la URL de origen del video de forma agnóstica al proveedor (YouTube hoy, Vimeo/etc. a futuro).
  Se conserva aunque la descarga sobreescriba `archivo_cancion` (que pasa de URL a `.mp4`), porque
  es el dato autoritativo de "esta canción vino de una URL".
- **El video local se renderiza como textura 3D**, no iframe: `VRKaraokeAf` crea un `<video>` oculto
  y lo mapea con `<a-video>` como textura WebGL. Un iframe de YouTube no se puede leer como textura
  (restricción cross-origin), por eso **la previsualización embebida** es un `<iframe>` de DOM
  superpuesto con CSS, no un plano 3D (overlay `youtubeVideo` y el panel de "PREVIEW ON YOUTUBE").
- **Registro de overlays de AR-SYNC** (`SYNCABLE_OVERLAYS` en `SyncStereoTestView.jsx`,
  `OVERLAY_OPTIONS` en `SyncConfigCompassMenu.jsx`, más la clave de traducción en
  `src/locales/{es,en,br}.json`): los 3 lugares obligatorios para que un overlay aparezca como
  checkbox en el menú ⚙️ y se sincronice entre paneles. Nota: el skill `overlay-ar-sync-aframe`
  documentaba `OVERLAY_OPTIONS` en `SyncConfigMenu.jsx`, pero ese componente ya no existe — la lista
  real vive en `SyncConfigCompassMenu.jsx`.
- Ver Requerimiento 014, sección 2, para el resto del contexto de `SongsModule`/`VRNewSongAf`.

## 3. Historias de usuario

- Como usuario que quiere agregar una canción, quiero pegar una URL de YouTube y que el sistema
  obtenga la letra en inglés con tiempos y la traduzca al español, para no escribir todo a mano.
- Como usuario que ya tiene una canción guardada desde una URL de YouTube, quiero poder traer su
  letra con un botón ("GET TEXT FROM YOUTUBE") y verla traducida frase por frase y palabra por
  palabra, igual que las canciones que ya vienen con esa información.
- Como usuario, quiero poder descargar el video al **servidor** ("SAVE VIDEO YOUTUBE IN SERVER")
  para que quede como canción pública y se reproduzca igual que las precargadas (textura 3D).
- Como usuario, quiero poder descargar el video a **mi dispositivo** ("SAVE VIDEO YOUTUBE IN
  LOCAL") para que no ocupe espacio en el servidor y quede como canción privada mía.
- Como usuario que pega una URL, quiero ver una previsualización del video embebido sin salir de la
  vista (overlay "Youtube Video" y botón "PREVIEW ON YOUTUBE").
- Como usuario que pega una URL de un video sin subtítulos disponibles, quiero que el sistema me
  avise en vez de guardar una letra vacía en silencio.
- Como usuario que todavía no tiene la URL, quiero un botón "BUSCAR EN YOUTUBE" que abra YouTube en
  una pestaña nueva con mi sesión real, y un botón "PEGAR URL DEL PORTAPAPELES" para no teclear la
  URL letra por letra.

## 4. Alcance

### Incluido (implementado)

- **Backend — dominio `song-ingestion` (`src/song-ingestion/`)**, orquestador que no duplica lógica
  de `songs`/`phrases`/`words`, solo la combina. Tres endpoints:
  1. `POST /song-ingestion/lyrics-from-youtube` (sin `JwtAuthGuard`, igual que `/frases`): body
     `{ youtubeUrl, archivo }`. Invoca `yt-dlp --write-auto-sub --skip-download` para bajar los
     subtítulos automáticos en inglés, los parsea a frases con tiempo, traduce todas las frases y
     todas las palabras únicas (todo o nada), y crea las frases (con `tiempo_frase`) y palabras
     (con `id_frase_palabra`) asociadas a la canción cuyo `fileName` es `archivo`.
  2. `POST /song-ingestion/download-video` (con `JwtAuthGuard`, como `POST /songs`): body
     `{ youtubeUrl, title?, author?, archivo? }`. Descarga el video con `yt-dlp` + `ffmpeg` a
     `public/videos/karaoke/<slug>.mp4` (h264/aac) y lo deja como canción `source:
     ['youtube','server']`. Si `archivo` apunta a una canción existente, se reutiliza esa fila
     (conserva letra ya guardada y su `url` de origen); si no, se crea una nueva.
  3. `POST /song-ingestion/download-video-to-device` (con `JwtAuthGuard`): descarga a un archivo
     **temporal** (`os.tmpdir()`), registra la canción como `source: ['youtube','local']` y
     streamea el `.mp4` de vuelta al navegador (header `X-File-Name`) para que el frontend lo guarde
     en su IndexedDB; el temporal se borra al terminar.
- **Backend — entidades y servicios completados:**
  - `Phrase.time` (`tiempo_frase`, TIME) y `PhrasesService.create()`.
  - `Word.phraseId` (`id_frase_palabra`) y `WordsService.create(songId, phraseId, english, spanish)`.
  - `Song.url` (`url_cancion`, nullable) y `SongsService` multi-source: `markAsDownloaded`,
    `markAsLocal`, `create` (con `url` y `source` como array), `findAll`/`findMine` por presencia de
    fuentes.
- **Backend — traducción**: servicio Docker `translate` (LibreTranslate) en `docker-compose.yml`
  (puerto host `5001` → contenedor `5000`, porque macOS usa el 5000 para AirPlay), más
  `libreTranslateUrl` en `configuration.ts`/`.env.example` y `translation.util.ts`
  (`translateText` vía `POST /translate`).
- **Backend — utilidades puras**: `youtube-captions.util.ts` (normalizar URL / extraer video ID /
  parsear VTT / `secondsToHms`), `youtube-video.util.ts` (`slugifyFileName`, `downloadYoutubeVideo`,
  `karaokeVideosDir`), `lyrics.util.ts` (`tokenizeWords`).
- **Backend — migraciones**: `db/014-songs-url-cancion.sql` (columna `url_cancion` + backfill) y
  `db/015-songs-fuente-multi.sql` (backfill `,youtube` en filas con `url_cancion`).
- **Frontend — overlay `songText`** ("Song Text"): panel de letra sincronizada (frase anterior /
  actual / futura) con la sección "Add text song" que expone el input de URL de YouTube y los tres
  botones de ingesta: "GET TEXT FROM YOUTUBE", "SAVE VIDEO YOUTUBE IN SERVER" y "SAVE VIDEO YOUTUBE
  IN LOCAL". Es la UI de ingesta real de este requerimiento (no `VRNewSongAf`).
- **Frontend — overlay `youtubeVideo`** ("Youtube Video"): previsualización embebida del video de la
  URL pegada en New Song. Panel siempre visible (input de URL + botón "PEGAR URL" + recuadro 16:9),
  sincronizado vía `localStorage['apprendevr_youtube_preview_url']`, con su propio marcador 📍/
  d-pad de edición de ubicación persistida en base de datos.
- **Frontend — `VRNewSongAf`**: campo `youtubeUrl` + botón "BUSCAR EN YOUTUBE" (`window.open` a
  `youtube.com/results?search_query=...` o `youtube.com`), botón "PEGAR URL DEL PORTAPAPELES"
  (`navigator.clipboard.readText()` con `window.focus()` previo), y "PREVIEW ON YOUTUBE" cambiado a
  un panel 2D flotante con `youtube.com/embed/<id>` (en AR-SYNC activa el overlay `youtubeVideo`).
- **Frontend — sincronización de campos** de `VRNewSongAf` entre paneles de `mirror-fix`
  (`aframe-overlay-modules.js`, poll de `_values` cada 300ms vía `postMessage`).
- **Frontend/Backend — guardado de posición con merge**: `UserSettingsService.saveConfig` hace merge
  superficial y `isValidAframeViewConfig`/`isValidArsSyncOverlaysConfig` aceptan la clave
  `youtubeVideo` (ver `problems_solutions.md`).

### No incluido

- Editar/corregir manualmente la letra o traducción generada antes de guardarla (se guarda tal cual
  lo que devuelven yt-dlp + LibreTranslate).
- Alineación de tiempos a nivel de palabra individual (`palabras_vr` no tiene columna de tiempo).
- Idiomas distintos de inglés→español.
- Manejo de cuota/rate-limit de LibreTranslate o de YouTube ante volumen alto (uso esporádico).
- Exponer `PhrasesService.create`/`WordsService.create` como endpoints públicos independientes.

### Pendiente (diseñado pero NO implementado todavía)

- **Fallback a LRCLIB** (`https://lrclib.net/api/get`, sin API key) cuando el video no tiene
  subtítulos en inglés: hoy `lyrics-from-youtube` devuelve `NO_LYRICS_FOUND` y no intenta LRCLIB por
  `artist_name`/`track_name`. Falta `lrclib.util.ts` (cliente + parser LRC) y su uso en el servicio.
- **Overlay de streaming `youtube-karaoke`**: reproducir canciones cuyo `fileName` es un video ID de
  YouTube sin descargar el archivo, vía YouTube IFrame Player. Falta `VRYoutubeKaraokeAf.js`,
  `youtube-karaoke.html`/`-modules.js`, `VRYoutubeKaraokeOverlaySync.jsx` y su registro en los 3
  lugares obligatorios + `vite.config.js`.
- **Endpoint único `POST /song-ingestion/from-youtube`** con `sourceMode: 'download'|'stream'`
  (y `create-from-youtube.dto.ts` + `createSongFromYoutube()` en `vrSongsApi.util.js`): el diseño
  original de un pipeline de un solo paso; hoy se resuelve con las tres acciones separadas de arriba.

## 5. Diseño técnico

**Tres acciones separadas en vez de un pipeline único (decisión tomada en la implementación).** El
diseño original proponía un único endpoint con `sourceMode`; en la práctica se separó en
"obtener letra" / "descargar al servidor" / "descargar al dispositivo" porque cada acción tiene su
propia granularidad de auth, efecto secundario y destino de archivo. El frontend las expone como
tres botones del overlay `songText`, y el usuario las dispara en el orden que quiera (p. ej. primero
descargar el video y después traer la letra, o al revés).

**Letra: subtítulos del propio video vía `yt-dlp`.** Se bajan con `--write-auto-sub --sub-lang en
--skip-download --sub-format vtt` a un directorio temporal y se parsea el VTT. El parser descarta
los cues que son solo efectos de sonido (`(dog barking)`, `[Music]`) y quita las notas musicales
`♪`; une los versos repartidos en varias líneas del mismo cue. Las URLs con parámetros de playlist
(`&list=...`) se normalizan a `watch?v=<id>` antes de invocar `yt-dlp` (si no, el proceso procesa la
playlist entera y cuelga).

**Traducción: LibreTranslate self-hosted vía Docker.** Sin costo por carácter, sin API key externa.
`translateText(baseUrl, text, from, to)` llama a `POST /translate`. Se traduce **todo o nada**: si
falla una frase o una palabra, no se inserta nada. Las palabras repetidas entre frases se traducen
una sola vez (cache global).

**Descarga del video: `yt-dlp` + `ffmpeg` a h264/aac.** El "mejor mp4" de VEVO/disqueras es
vp9/opus (no reproducible en Safari/iOS), así que se fuerza
`bestvideo[vcodec^=avc1]+bestaudio[ext=m4a]/best[vcodec^=avc1]/best` y `--merge-output-format mp4`.
`yt-dlp` y `ffmpeg` son dependencias de sistema (`brew install yt-dlp ffmpeg` en este Mac), no de
npm.

**`archivo_cancion` vs `url_cancion`.** `archivo_cancion` (entity `fileName`) = CÓMO se reproduce;
`url_cancion` (entity `url`) = DE DÓNDE vino. Al descargar, `fileName` pasa de URL a `<slug>.mp4`, y
es justo el momento en que se perdería la URL — por eso `markAsDownloaded`/`markAsLocal` conservan
`url` y `source` agrega `youtube` (origen) además de `server`/`local` (reproducción).

**Previsualización embebida (overlay `youtubeVideo` y "PREVIEW ON YOUTUBE").** Un iframe de YouTube
no se puede leer como textura WebGL, así que se muestra como `<div>`/`<iframe>` de DOM superpuesto
con CSS (no plano 3D). El video ID se extrae con una regex que cubre `watch?v=`, `youtu.be/`,
`embed/` y `shorts/`. El overlay lee/escribe `localStorage['apprendevr_youtube_preview_url']` (todos
los iframes de `mirror-fix` comparten origen, no hace falta un puente propio).

**Pegar del portapapeles dentro de `mirror-fix`.** `navigator.clipboard.readText()` exige foco real
del documento. En `mirror-fix` el foco se queda en la brújula (`SyncConfigCompassMenu.jsx`, capa más
externa), así que se llama `window.focus()` justo antes, y se agrega `clipboard-read` al `allow` del
`<iframe>` que monta el panel.

## 6. Archivos (implementados)

| Archivo | Cambio |
|---|---|
| `backend/src/song-ingestion/song-ingestion.module.ts` | Nuevo: registra controller/service + `SongsModule`/`PhrasesModule`/`WordsModule`. |
| `backend/src/song-ingestion/song-ingestion.controller.ts` | Nuevo: `POST lyrics-from-youtube` (sin auth), `POST download-video` y `POST download-video-to-device` (ambos con `JwtAuthGuard`). |
| `backend/src/song-ingestion/song-ingestion.service.ts` | Nuevo: `lyricsFromYoutube`, `downloadVideo`, `downloadVideoToDevice`. |
| `backend/src/song-ingestion/youtube-captions.util.ts` | Nuevo: `fetchYoutubePhrases`, `parseVttToPhrases`, `extractYoutubeVideoId`, `normalizeYoutubeUrl`, `secondsToHms`. |
| `backend/src/song-ingestion/youtube-video.util.ts` | Nuevo: `downloadYoutubeVideo`, `slugifyFileName`, `karaokeVideosDir`. |
| `backend/src/song-ingestion/translation.util.ts` | Nuevo: `translateText` (LibreTranslate). |
| `backend/src/song-ingestion/lyrics.util.ts` | Nuevo: `tokenizeWords`. |
| `backend/src/song-ingestion/dto/lyrics-from-youtube.dto.ts` | Nuevo: `{ youtubeUrl, archivo }`. |
| `backend/src/song-ingestion/dto/download-video.dto.ts` | Nuevo: `{ youtubeUrl, title?, author?, archivo? }`. |
| `backend/db/014-songs-url-cancion.sql` | Nuevo: `url_cancion VARCHAR(255) NULL` + backfill. |
| `backend/db/015-songs-fuente-multi.sql` | Nuevo: backfill `fuente_cancion` multi-source. |
| `backend/src/songs/entities/song.entity.ts` | Agregar columna `url` (`url_cancion`, nullable). |
| `backend/src/songs/songs.service.ts` | Multi-source (`markAsDownloaded`, `markAsLocal`, `create` con `url`/`source` array, `findAll`/`findMine` por presencia). |
| `backend/src/songs/songs.util.ts` | `hasSource`/`addSource`/`serializeSources`/`buildDuplicateCriteria`. |
| `backend/src/phrases/entities/phrase.entity.ts` | Agregar columna `time` (`tiempo_frase`). |
| `backend/src/phrases/phrases.service.ts` | Agregar `create()`. |
| `backend/src/words/entities/word.entity.ts` | Agregar columna `phraseId` (`id_frase_palabra`). |
| `backend/src/words/words.service.ts` | Agregar `create()`. |
| `backend/src/config/configuration.ts` | Agregar `libreTranslateUrl`. |
| `backend/docker-compose.yml` | Agregar servicio `translate` (LibreTranslate) + montar migraciones 014/015. |
| `backend/.env.example` / `.env` | Agregar `LIBRETRANSLATE_URL`. |
| `frontend/.../VRSongTextOverlaySync/` (`.jsx`, `song-text.html`, `song-text-modules.js`) | Overlay `songText` + panel "Add text song" con los 3 botones de ingesta. |
| `frontend/.../VRYoutubeVideoOverlaySync/` (`.jsx`, `youtube-video.html`, `youtube-video-modules.js`) | Overlay `youtubeVideo` (previsualización + edición de ubicación). |
| `frontend/src/views/A-frame/components/VRKaraokeAf/components/VRNewSongAf/VRNewSongAf.js` | Campo `youtubeUrl` + botones BUSCAR / PEGAR / PREVIEW. |
| `frontend/src/views/A-frame/vrSongsApi.util.js` | `createSong` multi-source (envía `url` y `source` array). |
| `frontend/src/views/A-frame/vrPositionControl.js` | Clave `youtubeVideo` en `ELEMENTS`. |
| `frontend/.../SyncStereoTestView.jsx` | `SYNCABLE_OVERLAYS` + `activateOverlay`. |
| `frontend/.../SyncConfigCompassMenu.jsx` | `OVERLAY_OPTIONS` (lista real) + layout dinámico. |
| `frontend/src/locales/{es,en,br}.json` | Claves `syncConfig.overlay.youtubeVideo`/`songText`/`newSong` (+ `Short`). |
| `frontend/.../aframe-overlay-modules.js` | Puente de sync de campos de `vr-new-song-af`. |
| `frontend/vite.config.js` | Registrar `youtube-video.html` y `song-text.html` en `rollupOptions.input`. |
| `backend/src/user-settings/user-settings.util.ts` | Aceptar clave `youtubeVideo` en validaciones. |
| `backend/src/user-settings/user-settings.service.ts` | `saveConfig` con merge superficial. |

## 7. Criterios de aceptación

- [x] Requerimiento 014 completado y validado (dependencia dura).
- [x] `POST /song-ingestion/lyrics-from-youtube` con una URL con subtítulos en inglés crea las
      frases (con `tiempo_frase`) y palabras (con `id_frase_palabra` y traducción) de la canción
      indicada por `archivo`, sin descargar ningún video.
- [x] `POST /song-ingestion/download-video` descarga el video a `public/videos/karaoke/` y deja la
      canción como `source: ['youtube','server']`, conservando `url_cancion`.
- [x] `POST /song-ingestion/download-video-to-device` descarga el video a un temporal, lo streamea
      al navegador (header `X-File-Name`) y deja la canción como `source: ['youtube','local']`.
- [x] La URL de origen se guarda en `url_cancion` y se conserva aunque la descarga sobreescriba
      `archivo_cancion`.
- [x] Si no hay subtítulos en YouTube, `lyrics-from-youtube` devuelve un error explícito
      (`NO_LYRICS_FOUND`) y no guarda nada.
- [x] Las 3 canciones locales del dump siguen reproduciéndose igual (overlay `karaoke`, textura 3D).
- [x] El botón "BUSCAR EN YOUTUBE" abre una pestaña nueva (no un iframe) con la sesión real del
      usuario.
- [x] El botón "PEGAR URL DEL PORTAPAPELES" funciona dentro de `mirror-fix` (con `window.focus()` +
      `clipboard-read` en el `allow` del iframe).
- [x] En `mirror-fix` con doble panel, escribir/pegar en un campo de `VRNewSongAf` se replica al
      panel opuesto (~300ms).
- [x] Click en "PREVIEW ON YOUTUBE" abre un panel flotante embebido (toggle); en AR-SYNC activa el
      overlay `youtubeVideo`.
- [x] El overlay "Youtube Video" aparece como checkbox en ⚙️ → "Overlays", muestra el video embebido
      en ambos paneles, y su marcador 📍/d-pad guarda posición con 200 (no 400) vía merge.
- [x] Guardar la posición del overlay "Youtube Video" no borra las posiciones de karaoke/songList/
      newSong (merge, no reemplazo).
- [x] `npm run build` (frontend) genera `youtube-video.html` y `song-text.html`.
- [x] `npm run build` y `npm test` (backend) pasan sin levantar MySQL ni LibreTranslate.
- [ ] **PENDIENTE**: fallback a LRCLIB cuando no hay subtítulos en YouTube.
- [ ] **PENDIENTE**: overlay de streaming `youtube-karaoke` (reproducir sin descargar, dos iframes
      2D sincronizados).
- [ ] **PENDIENTE**: endpoint único `POST /song-ingestion/from-youtube` con `sourceMode`
      (`download`/`stream`) + `createSongFromYoutube()` en el frontend.

## 8. Referencias

- Requerimiento 014 (`1-Pending/014-agregar-nuevas-canciones`): dependencia (`SongsService`,
  `POST /songs`, `JwtAuthGuard`).
- [yt-dlp](https://github.com/yt-dlp/yt-dlp): subtítulos (`--write-auto-sub --skip-download`) y
  descarga de video.
- [LibreTranslate](https://github.com/LibreTranslate/LibreTranslate): traducción self-hosted.
- [LRCLIB](https://www.lrclib.net/) (`https://lrclib.net/api/get`): letra sincronizada gratuita
  (fallback pendiente).
- `A-frame/Proyecto/BaseDatos/english_vr.sql`: esquema real de `frases_vr`/`palabras_vr`.
- Skill `overlay-ar-sync-aframe`: patrón de registro de un overlay nuevo en AR-SYNC.
- Decisiones tomadas en la conversación de origen: traducir con LibreTranslate self-hosted vía
  Docker; separar las tres acciones de ingesta (letra / servidor / dispositivo); agregar
  `url_cancion` y `fuente_cancion` multi-source; previsualización embebida como iframe de DOM (no
  textura 3D) por la restricción cross-origin de YouTube.
