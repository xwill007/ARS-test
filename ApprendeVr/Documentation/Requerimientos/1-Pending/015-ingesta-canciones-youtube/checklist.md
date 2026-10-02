# Checklist de ejecución (paso a paso)

> Depende del Requerimiento 014 (`POST /songs`, `SongsService.create`, `JwtAuthGuard`).
>
> Estado real: las fases 1–6 están **completas** (marcadas `[x]`). Quedan pendientes el fallback a
> LRCLIB, el overlay de streaming `youtube-karaoke` y el endpoint único `from-youtube` con
> `sourceMode` (ver sección "Pendiente" al final).

### Fase 1 — Backend: completar entidades `Phrase`/`Word`/`Song` para poder crear filas

- [x] 1.1 `Phrase`: `@Column({ name: 'tiempo_frase', type: 'time' }) time: string;`.
- [x] 1.2 `PhrasesService.create(dto)`: inserta una fila (con `tiempo_frase`).
- [x] 1.3 `phrases.service.spec.ts`: test de `create()` con repo mockeado.
- [x] 1.4 `Word`: `@Column({ name: 'id_frase_palabra' }) phraseId: number;`.
- [x] 1.5 `WordsService.create(songId, phraseId, english, spanish)`: inserta una fila.
- [x] 1.6 `words.service.spec.ts`: test de `create()` con repo mockeado.
- [x] 1.7 `db/014-songs-url-cancion.sql`: `url_cancion VARCHAR(255) NULL` + backfill.
- [x] 1.8 `db/015-songs-fuente-multi.sql`: backfill `fuente_cancion` multi-source.
- [x] 1.9 Montar ambas migraciones en `docker-compose.yml` (`15-…`, `16-…sql`).
- [x] 1.10 `Song`: `@Column({ name: 'url_cancion', nullable: true }) url: string | null;`.
- [x] 1.11 `SongsService` multi-source: `hasSource`/`addSource`/`serializeSources`,
       `markAsDownloaded`, `markAsLocal`, `create` con `url`/`source` array, `findAll`/`findMine`.

### Fase 2 — Backend: fuente de letra (subtítulos de YouTube)

- [x] 2.1 `youtube-captions.util.ts`: `fetchYoutubePhrases` (invoca `yt-dlp --write-auto-sub
      --sub-lang en --skip-download`) + `parseVttToPhrases` (puro, testeable sin el binario).
- [x] 2.2 Normalización de URL (`normalizeYoutubeUrl`/`extractYoutubeVideoId`) para recortar
      parámetros de playlist que cuelgan a `yt-dlp`.
- [x] 2.3 `youtube-captions.util.spec.ts`: parser VTT (normal, vacío, efectos de sonido `♪`/`(...)`).

### Fase 2b — Backend: descarga del video completo

- [x] 2b.1 `youtube-video.util.ts`: `downloadYoutubeVideo` (`yt-dlp -f bestvideo[vcodec^=avc1]+
      bestaudio[ext=m4a]/best` + `ffmpeg` a mp4 h264/aac).
- [x] 2b.2 `slugifyFileName(title, author)`: nombre de archivo seguro.
- [x] 2b.3 `youtube-video.util.spec.ts`: construcción de comando/nombre (sin `yt-dlp` real).

### Fase 3 — Backend: traducción (LibreTranslate)

- [x] 3.1 Servicio `translate` (imagen `libretranslate/libretranslate`) en `docker-compose.yml`,
       host `5001` → contenedor `5000`.
- [x] 3.2 `libreTranslateUrl` en `configuration.ts` + `.env`/`.env.example`.
- [x] 3.3 `translation.util.ts`: `translateText(baseUrl, text, from, to)` + `.spec.ts` (fetch
      mockeado). `lyrics.util.ts`: `tokenizeWords` (puro) + `.spec.ts`.

### Fase 4 — Backend: orquestador `song-ingestion` (tres endpoints)

- [x] 4.1 `lyrics-from-youtube.dto.ts` (`{ youtubeUrl, archivo }`) + `.spec.ts`.
- [x] 4.2 `download-video.dto.ts` (`{ youtubeUrl, title?, author?, archivo? }`) + `.spec.ts`.
- [x] 4.3 `song-ingestion.service.ts`: `lyricsFromYoutube` (captions → traducir frases y palabras →
      crear frases/palabras, todo o nada), `downloadVideo` (descarga a servidor → `source:
      ['youtube','server']`), `downloadVideoToDevice` (temporal → stream → `source:
      ['youtube','local']`).
- [x] 4.4 `song-ingestion.controller.ts`: `POST lyrics-from-youtube` (sin auth),
      `POST download-video` y `POST download-video-to-device` (ambos con `JwtAuthGuard`).
- [x] 4.5 `song-ingestion.module.ts`: registra controller/service + `SongsModule`/`PhrasesModule`/
      `WordsModule`.
- [x] 4.6 `song-ingestion.service.spec.ts` / `controller.spec.ts`: casos felices y de error.

### Fase 5 — Frontend: overlay `songText` (UI de ingesta)

- [x] 5.1 `VRSongTextOverlaySync.jsx` + `song-text.html` + `song-text-modules.js`: overlay `songText`
      con panel "Add text song" (input URL + 3 botones).
- [x] 5.2 Botón "GET TEXT FROM YOUTUBE" → `POST /song-ingestion/lyrics-from-youtube`.
- [x] 5.3 Botón "SAVE VIDEO YOUTUBE IN SERVER" → `POST /song-ingestion/download-video`.
- [x] 5.4 Botón "SAVE VIDEO YOUTUBE IN LOCAL" → `POST /song-ingestion/download-video-to-device`
      (guarda el blob en IndexedDB vía `vrLocalVideoStore.util.js`).
- [x] 5.5 Registro en `SYNCABLE_OVERLAYS`/`OVERLAY_OPTIONS`/locales + `vite.config.js`.

### Fase 6 — Frontend: overlay `youtubeVideo` + botones de `VRNewSongAf`

- [x] 6.1 `VRYoutubeVideoOverlaySync.jsx` + `youtube-video.html` + `youtube-video-modules.js`:
      panel siempre visible (input + PEGAR + recuadro 16:9), lee/escribe
      `localStorage['apprendevr_youtube_preview_url']`.
- [x] 6.2 Edición de ubicación: `vrPositionControl.js` clave `youtubeVideo` + `#youtube-video-anchor`.
- [x] 6.3 Botón "BUSCAR EN YOUTUBE" en `VRNewSongAf` (`window.open`, pestaña nueva).
- [x] 6.4 Botón "PEGAR URL DEL PORTAPAPELES" en `VRNewSongAf` (`window.focus()` +
      `navigator.clipboard.readText()`) + `clipboard-read` en el `allow` del iframe.
- [x] 6.5 "PREVIEW ON YOUTUBE" → panel 2D flotante embebido (`extractYoutubeVideoId`, toggle); en
      AR-SYNC activa el overlay `youtubeVideo` (`activateOverlay`).
- [x] 6.6 Puente de sync de campos de `vr-new-song-af` en `aframe-overlay-modules.js` (poll 300ms).
- [x] 6.7 Backend `user-settings`: validar `youtubeVideo` + merge superficial en `saveConfig`.

### Fase 7 — Verificación

- [x] 7.1 `npm run build` y `npm test` (backend) pasan sin MySQL ni LibreTranslate (mockeando
      clientes HTTP). Backend 237 tests verdes.
- [x] 7.2 `npm run build` (frontend): genera `youtube-video.html` y `song-text.html`.
- [x] 7.3 `npm run check:i18n` (frontend): claves `youtubeVideo`/`songText`/`newSong` en 3 idiomas.
- [x] 7.4 Prueba manual end-to-end con "Always" de Bon Jovi: `lyrics-from-youtube` (68 frases,
      371 palabras traducidas), `download-video` (`.mp4` h264/aac en servidor),
      `download-video-to-device` (blob + IndexedDB).
- [x] 7.5 Confirmar que las 3 canciones locales del dump siguen andando en el overlay `karaoke`.
- [x] 7.6 Marcar los criterios de aceptación de `requerimiento.md` como cumplidos (los pendientes
      quedan abiertos — ver abajo).

### Pendiente (diseñado pero NO implementado)

- [x] P1. **LRCLIB** (botón "GET TEXT LYRICS", flujo separado de STAGING + aprobación):
      `lrclib.util.ts` (cliente `GET https://lrclib.net/api/get` + `parseLrcToLines`),
      `lyrics-comparison.util.ts` (`compareLyrics`), tabla `frases_vr_staging`
      (`db/016`, entidad `StagedPhrase`), endpoints `POST /song-ingestion/lyrics-from-lrclib` y
      `POST /song-ingestion/apply-lyrics-sync`, y botón + panel de confirmación en `song-text-
      modules.js`.
- [x] P2. Fallback **automático** a LRCLIB dentro de `lyrics-from-youtube` cuando
      `fetchYoutubePhrases` devuelve `[]` (hoy LRCLIB es un botón separado, no un fallback).
- [ ] P3. Overlay de **streaming `youtube-karaoke`**: `VRYoutubeKaraokeAf.js` (YouTube IFrame
      Player), `youtube-karaoke.html`/`-modules.js`, `VRYoutubeKaraokeOverlaySync.jsx`, registro en
      `SYNCABLE_OVERLAYS`/`OVERLAY_OPTIONS`/locales + `vite.config.js`, y puente de
      `playVideo()`/`pauseVideo()`/`seekTo()` entre dos instancias `YT.Player`.
- [ ] P4. Endpoint único **`POST /song-ingestion/from-youtube`** con `sourceMode:
      'download'|'stream'` (`create-from-youtube.dto.ts`) + `createSongFromYoutube()` en
      `vrSongsApi.util.js`.
