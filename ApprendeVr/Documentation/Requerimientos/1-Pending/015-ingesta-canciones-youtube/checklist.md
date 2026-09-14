# Checklist de ejecución (paso a paso)

> Depende del Requerimiento 014 (`POST /songs`, `SongsService.create`, `JwtAuthGuard`) — completarlo
> primero si no lo está.

### Fase 1 — Backend: completar entidades `Phrase`/`Word`/`Song` para poder crear filas

- [ ] 1.1 `Phrase`: agregar `@Column({ name: 'tiempo_frase', type: 'time' }) time: string;`.
- [ ] 1.2 `PhrasesService.create(songId, english, spanish, time)`: inserta una fila.
- [ ] 1.3 `phrases.service.spec.ts`: test de `create()` con repo mockeado.
- [ ] 1.4 `Word`: agregar `@Column({ name: 'id_frase_palabra' }) phraseId: number;`.
- [ ] 1.5 `WordsService.create(songId, phraseId, english, spanish)`: inserta una fila.
- [ ] 1.6 `words.service.spec.ts`: test de `create()` con repo mockeado.
- [ ] 1.7 `db/009-songs-youtube-video-url.sql`: `ALTER TABLE canciones_vr ADD COLUMN
      youtube_video_url VARCHAR(255) NULL;` (mismo patrón/comentario que `db/001` a `008`).
- [ ] 1.8 Montar `009-songs-youtube-video-url.sql` en `docker-compose.yml`
      (`/docker-entrypoint-initdb.d/10-...sql`).
- [ ] 1.9 `Song`: agregar `@Column({ name: 'youtube_video_url', nullable: true })
      youtubeVideoUrl: string | null;`.
- [ ] 1.10 `CreateSongDto` (Requerimiento 014): agregar `youtubeVideoUrl?` opcional
      (`class-validator`), con su caso en `create-song.dto.spec.ts`.

### Fase 2 — Backend: fuente de letra (subtítulos de YouTube + fallback LRCLIB)

- [ ] 2.1 Verificar que `yt-dlp` está disponible en el entorno de desarrollo/CI (documentar en el
      README del backend cómo instalarlo si falta).
- [ ] 2.2 `youtube-captions.util.ts`: función pura que recibe la salida VTT/SRT de `yt-dlp` (como
      string) y devuelve `[{ text, time }]` — separar el parseo (testeable sin invocar el binario)
      de la invocación del proceso hijo.
- [ ] 2.3 Función que invoca `yt-dlp --write-auto-sub --sub-lang en --skip-download` sobre la URL
      (independiente del `sourceMode`: los subtítulos siempre se piden solos), lee el archivo de
      subtítulos generado, lo pasa al parser de 2.2, y borra el archivo temporal.
- [ ] 2.4 `youtube-captions.util.spec.ts`: casos del parser con muestras reales de VTT/SRT (normal,
      vacío, con superposiciones de texto típicas de auto-subtítulos).
- [ ] 2.5 `lrclib.util.ts`: cliente `GET https://lrclib.net/api/get?artist_name=...&track_name=...`
      + parser de LRC a `[{ text, time }]`, con su `.spec.ts` (parser testeado sin red real).

### Fase 2b — Backend: descarga del video completo (solo `sourceMode: 'download'`)

- [ ] 2b.1 `youtube-video.util.ts`: función que invoca `yt-dlp -f best -o
      public/videos/karaoke/<slug>.mp4 <url>` (o el formato equivalente), devuelve el `fileName`
      generado. Solo se llama cuando `sourceMode === 'download'`.
- [ ] 2b.2 Slug del nombre de archivo a partir de título+autor (reusar/definir una función pura de
      normalización, coherente con `normalizeSongText` del Requerimiento 014 si ya existe).
- [ ] 2b.3 `youtube-video.util.spec.ts`: test de la construcción del comando/nombre de archivo (sin
      invocar `yt-dlp` real).

### Fase 3 — Backend: traducción (LibreTranslate)

- [ ] 3.1 Agregar servicio `translate` (imagen `libretranslate/libretranslate`) a
      `docker-compose.yml`, puerto configurable.
- [ ] 3.2 `libreTranslateUrl` en `configuration.ts` + `.env.example`.
- [ ] 3.3 `translation.util.ts`: `translateText(text, from, to)` vía `fetch`/HTTP al servicio, con
      su `.spec.ts` (cliente HTTP mockeado).

### Fase 4 — Backend: orquestador `song-ingestion`

- [ ] 4.1 `create-from-youtube.dto.ts`: `youtubeUrl`, `title`, `author`,
      `sourceMode: 'download'|'stream'`, `artistNameForLyrics?` (`class-validator`, `@IsIn` para
      `sourceMode`), con su `.spec.ts`.
- [ ] 4.2 `song-ingestion.service.ts`: si `sourceMode === 'download'`, descarga el video (2b.1)
      antes de decidir el `fileName`; obtiene frases (2.3, fallback 2.5), si no hay ninguna lanza
      un error explícito; traduce cada frase (3.3) y cada palabra tokenizada de la frase; llama a
      `SongsService.create` (con el `fileName` que corresponda al modo y **siempre**
      `youtubeVideoUrl: youtubeUrl`, en ambos modos), `PhrasesService.create` (uno por frase),
      `WordsService.create` (uno por palabra).
- [ ] 4.3 `song-ingestion.service.spec.ts`: caso feliz modo `stream` (frases + traducción → 1
      canción + N frases + M palabras, sin tocar el video), caso feliz modo `download` (además crea
      el archivo local), caso "sin subtítulos ni LRCLIB" en ambos modos (error, nada se guarda),
      caso de traducción fallando en una frase puntual.
- [ ] 4.4 `song-ingestion.controller.ts`: `POST /song-ingestion/from-youtube` (`JwtAuthGuard`).
- [ ] 4.5 `song-ingestion.controller.spec.ts`: delega al service con el DTO validado.
- [ ] 4.6 `song-ingestion.module.ts`: registra controller/service/dependencias (`SongsModule`,
      `PhrasesModule`, `WordsModule`).

### Fase 5 — Frontend: overlay nuevo `youtube-karaoke` (modo `stream`)

- [ ] 5.1 `VRYoutubeKaraokeAf.js` (nuevo componente A-Frame, `src/views/A-frame/components/
      VRYoutubeKaraokeAf/`): carga el script del YouTube IFrame Player API y arma `YT.Player`
      posicionado con CSS sobre el plano correspondiente (no `<a-video>`); lista de canciones
      filtrada por `youtubeVideoUrl` no nulo (dato explícito de `GET /api/songs`, no una
      heurística sobre `fileName`).
- [ ] 5.2 Reusar `VREvaluacionAf.js` para el botón "EVALUATE SONG" de este overlay, igual que hace
      `VRKaraokeAf.js` hoy (sin duplicar esa lógica).
- [ ] 5.3 `youtube-karaoke.html` + `youtube-karaoke-modules.js` en `mirror-fix/` (mismo patrón que
      `aframe-overlay-modules.html`/`.js`): importa `VRYoutubeKaraokeAf.js` real + puente de
      sincronización de cámara.
- [ ] 5.4 Adaptar el puente de sincronización de reproducción (nuevos mensajes o los mismos
      `karaoke-play`/`-pause`/`-seek` con un `source` distinto) para llamar a
      `playVideo()`/`pauseVideo()`/`seekTo()` de cada instancia `YT.Player`.
- [ ] 5.5 Registrar `youtube-karaoke.html` en `vite.config.js` → `build.rollupOptions.input`.
- [ ] 5.6 `VRYoutubeKaraokeOverlaySync.jsx` (`forwardRef`, monta el `.html` en `<iframe src>` real).
- [ ] 5.7 Registrar `youtube-karaoke` en `SYNCABLE_OVERLAYS` (`SyncStereoTestView.jsx`) — confirmar
      que `leftRefs`/`rightRefs` se derivan de `Object.keys(SYNCABLE_OVERLAYS)` (no un objeto
      hardcodeado aparte, ver gotcha del skill `overlay-ar-sync-aframe`).
- [ ] 5.8 Registrar `youtube-karaoke` en `OVERLAY_OPTIONS` (`SyncConfigMenu.jsx`).
- [ ] 5.9 Clave `syncConfig.overlay.youtubeKaraoke` en `src/locales/{es,en,br}.json`.
- [ ] 5.10 Verificar manualmente en `artest-mirror.html` → AR-SYNC → menú ⚙️ → "Overlays": activar
      `youtube-karaoke` (y desactivar `karaoke` para verlo aislado), confirmar que reproduce en
      ambos paneles sin errores de consola, y que play/pause/seek desde un panel se replica en el
      otro con desincronización mínima.

### Fase 6 — Frontend: UI de ingesta desde `VRNewSongAf`

- [ ] 6.1 `vrSongsApi.util.js`: `createSongFromYoutube({ youtubeUrl, title, author, sourceMode,
      artistNameForLyrics })`.
- [ ] 6.2 Campo de URL de YouTube + selector `descargar`/`solo reproducir` + botón "Generar desde
      YouTube" en `VRNewSongAf` (reusa el teclado virtual/físico ya existente para escribir la
      URL).
- [ ] 6.3 Mostrar el resultado (éxito con conteo de frases/palabras — y qué overlay corresponde
      usar según el modo elegido —, o el error específico de "no se encontró letra") en el
      `status` del panel.

### Fase 7 — Verificación y cierre

- [ ] 7.1 `npm run build` y `npm test` (backend) pasan sin levantar MySQL ni LibreTranslate.
- [ ] 7.2 `npm run test:cov` (backend): revisar la tabla por archivo de los módulos nuevos.
- [ ] 7.3 `npm run build` (frontend): confirmar que genera `youtube-karaoke.html`.
- [ ] 7.4 `npm run check:i18n` (frontend): confirmar la clave `syncConfig.overlay.youtubeKaraoke`.
- [ ] 7.5 Prueba manual end-to-end modo `stream`: pegar una URL real de YouTube con subtítulos,
      generar la canción, activar el overlay `youtube-karaoke` en `mirror-fix` y cantarla con las
      frases/palabras traducidas.
- [ ] 7.6 Prueba manual end-to-end modo `download`: misma URL, generar en modo `download`, confirmar
      que aparece y se reproduce en el overlay `karaoke` existente (no en `youtube-karaoke`).
- [ ] 7.7 Prueba manual del caso sin subtítulos ni LRCLIB (ambos modos): confirmar que no se guarda
      una canción "vacía".
- [ ] 7.8 Confirmar que en modo `stream` ningún archivo de video quedó en disco tras la ingesta
      (solo el `.vtt`/`.srt` temporal, que también se borra).
- [ ] 7.9 Confirmar que las 3 canciones locales del dump siguen andando igual en el overlay
      `karaoke` (sin regresión).
- [ ] 7.10 Marcar los criterios de aceptación de `requerimiento.md` como cumplidos.
