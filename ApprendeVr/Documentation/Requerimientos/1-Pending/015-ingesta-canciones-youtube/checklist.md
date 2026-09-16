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
- [x] 6.4 Botón "BUSCAR EN YOUTUBE" en `VRNewSongAf` (mismo patrón `window.open(url, '_blank',
      'noopener')` que el botón "PREVIEW ON YOUTUBE" ya existente): abre
      `https://www.youtube.com/results?search_query=<titulo>+<autor>` si esos campos tienen algo
      escrito, o `https://www.youtube.com` si están vacíos — pestaña nueva del navegador, no un
      iframe, para que el usuario busque el video con su propia sesión de YouTube y copie la URL
      de vuelta al campo `youtubeUrl`. Implementado de forma independiente al resto del
      requerimiento 015 (no depende del pipeline backend ni del 014).
- [x] 6.5 Botón "PEGAR URL DEL PORTAPAPELES" en `VRNewSongAf` (`navigator.clipboard.readText()`,
      agrega al final del valor actual de `youtubeUrl`): pedido del usuario tras probar 6.4, porque
      escribir la URL letra por letra con el teclado es incómodo y en `mirror-fix` el teclado
      físico no siempre llega a este panel (ver hallazgo de la brújula en `requerimiento.md`,
      sección 5). Requiere agregar `clipboard-read` al `allow` del `<iframe>` en
      `VRKaraokeOverlaySync.jsx`. Alto del panel ampliado `5.15` → `5.5` (en el schema de
      `VRNewSongAf.js` y en el atributo de `aframe-overlay-modules.html`) para que entren los dos
      botones nuevos (6.4 + 6.5) sin desbordar el fondo del panel.
- [x] 6.6 "PREVIEW ON YOUTUBE" cambia de `window.open` a un panel 2D flotante (DOM, no A-Frame) con
      el video embebido `youtube.com/embed/<id>` (pedido del usuario: no salir de la vista al
      previsualizar). Nueva función pura `extractYoutubeVideoId(url)` (regex sobre `watch?v=`,
      `youtu.be/`, `embed/`, `shorts/`); si no matchea, error en `status`. Toggle: un segundo click
      cierra el panel. Limpieza del overlay agregada a `remove()`.
- [x] 6.7 Puente de sincronización nuevo en `aframe-overlay-modules.js` (mismo patrón que el de
      video del overlay `karaoke`): poll-ea `vr-new-song-af._values` (los 4 campos) cada 300ms y
      reenvía `{action: 'new-song-field-update', field, value}` por `postMessage`; el panel
      opuesto lo aplica directo a su propio `_values` + `_refreshFieldText`. No requirió tocar
      `SyncStereoTestView.jsx` (su relay genérico ya reenvía cualquier acción no reservada del
      overlay `karaoke` al panel opuesto). Pedido del usuario tras notar que "PEGAR URL DEL
      PORTAPAPELES" solo actualizaba el panel donde se hizo click.
- [x] 6.8 Nuevo overlay `youtubeVideo` ("Youtube Video") en AR-SYNC, pedido del usuario para no
      depender del botón "PREVIEW ON YOUTUBE" cada vez: se activa/desactiva desde el menú ⚙️ →
      pestaña "Overlays" como cualquier otro (`video`/`cone`/`karaoke`), y muestra el video
      embebido de la URL que haya en `youtubeUrl` del panel New Song. Implementación (sigue el
      skill `overlay-ar-sync-aframe`):
      - `VRYoutubeVideoOverlaySync.jsx` (nuevo, patrón `srcDoc` autocontenido como
        `VRConeOverlaySync.jsx` — sin dependencias de Vite): puente de cámara por postMessage
        (copia del de `VRConeOverlaySync.jsx`) + panel de video que sigue a un ancla 3D fija
        (`#youtube-video-anchor`) proyectada a pantalla en cada frame, mismo truco "billboard" que
        el panel de previsualización de `VRNewSongAf.js`.
      - Se entera de qué video mostrar leyendo `localStorage['apprendevr_youtube_preview_url']`
        (escrito por el puente de campos de `aframe-overlay-modules.js`, tarea 6.7, cada vez que
        cambia `youtubeUrl`) y escuchando el evento `storage` — no necesita su propio puente de
        postMessage para este dato porque todos los iframes de `mirror-fix` comparten origen.
      - Registrado en los 3 lugares obligatorios: `SYNCABLE_OVERLAYS` (`SyncStereoTestView.jsx`),
        `OVERLAY_OPTIONS` (`SyncConfigCompassMenu.jsx` — **no** `SyncConfigMenu.jsx`, que ya no
        existe: el skill estaba desactualizado en ese punto, corroborado leyendo el código real),
        clave `syncConfig.overlay.youtubeVideo`/`youtubeVideoShort` en `{es,en,br}.json`.
      - Corregido de paso un bug de layout ya latente en `SyncConfigCompassMenu.jsx`: el botón
        "Guardar"/subtexto del grupo Overlays tenían posición Y fija, pensada para 4 filas — con
        la 5ta (`youtubeVideo`) la última fila casi pisaba el botón. Se vuelven dinámicos en base a
        `OVERLAY_OPTIONS.length` para que agregar overlays a futuro no repita el problema.
      - Validado en el navegador: activar el overlay vía el mismo mensaje `compass-toggle-overlay`
        que dispara el click real del menú — aparece en ambos paneles con el video embebido, sin
        errores de consola.
- [x] 6.9 Ampliación pedida por el usuario tras probar 6.8 ("al seleccionar el overlay no muestra
      nada"): el overlay ahora siempre muestra algo, y suma el componente de edición de ubicación
      con persistencia real en base de datos.
      - `youtube-video-modules.js` reescrito: panel SIEMPRE visible (antes solo aparecía si ya
        había una URL puesta desde New Song) con input de URL + botón "PEGAR URL" (mismo patrón de
        `window.focus()` antes de `navigator.clipboard.readText()` que `VRNewSongAf.js`) + el
        recuadro (16:9, borde punteado como placeholder o el iframe embebido real) donde se ve el
        video — lee/escribe la misma clave de `localStorage` que el panel New Song.
      - **Conversión de `srcDoc` a página Vite real** (`youtube-video.html` +
        `youtube-video-modules.js`, registrada en `vite.config.js`): necesaria para poder
        `import`ar `vrPositionControl.js` real (un `srcDoc` en blanco no resuelve imports de
        proyecto) — mismo criterio que ya usa el overlay `karaoke`. `VRYoutubeVideoOverlaySync.jsx`
        pasa de `srcDoc` a `src="./youtube-video.html"` + `allow="...; clipboard-read"`.
      - `vrPositionControl.js` → `ELEMENTS`: nueva entrada `{ key: 'youtubeVideo', selector:
        '#youtube-video-anchor', offset: [-0.3, 0.3, 0.05] }` — el marcador 📍/d-pad/GUARDAR
        aparece igual que para karaoke/newSong, moviendo el ancla 3D que el panel de video sigue en
        pantalla.
      - **Bug de backend descubierto y corregido en el camino** (mismo tipo de bug que
        `problems_solutions.md` del Requerimiento 010 ya documentaba para karaoke/songList/newSong):
        `isValidAframeViewConfig`/`isValidArsSyncOverlaysConfig`
        (`backend/src/user-settings/user-settings.util.ts`) no conocían la clave `youtubeVideo` →
        `PUT /api/user-settings/aframe-view` devolvía 400 al guardar. Al agregarla, apareció un
        segundo problema real: `youtube-video.html` no tiene `#karaoke-vr-component`/
        `#new-song-component` en su DOM, así que su propio `persist()` solo manda `{youtubeVideo:
        ...}` — exigir las 4 claves juntas rompía el guardado de ESTA página. Se resolvió en dos
        partes:
        1. `isValidAframeViewConfig` ya no exige NINGUNA clave en particular — acepta cualquier
           subconjunto no vacío de `['karaoke','songList','newSong','youtubeVideo']`, validando la
           forma de cada una que esté presente.
        2. `UserSettingsService.saveConfig` pasa de reemplazo completo (`row.config = config`) a
           **merge superficial** (`row.config = {...row.config, ...config}`) — sin esto, guardar
           desde una página que solo conoce un subconjunto de claves borraría en silencio lo que
           otra página ya había guardado. Para las demás vistas (siempre un objeto completo, un
           solo productor) el merge se comporta igual que el reemplazo anterior — sin regresión.
        Tests nuevos en `user-settings.util.spec.ts`/`user-settings.service.spec.ts`
        (`npx jest src/user-settings` → 61/61 OK) y `npm run build`/`npx jest` completos del
        backend (132/132 OK) verificados tras el cambio.
      - Validado en el navegador end-to-end: activar el overlay → mover el ancla con
        `position-move` → `position-save` → `PUT /api/user-settings/aframe-view` responde 200 (no
        400) → recargar la página → la posición guardada (`x: 0.5`) se reaplica sola al
        `#youtube-video-anchor`, y las posiciones de karaoke/songList/newSong guardadas antes
        siguen intactas (confirma el merge, no solo el guardado).
- [x] 6.10 "PREVIEW ON YOUTUBE" activa el overlay real en vez de su panel propio (pedido del
      usuario tras probar 6.9): dentro de AR-SYNC (`window.parent !== window`), el click manda
      `{ source: 'ars-sync-test', action: 'activate-overlay', key: 'youtubeVideo' }` a
      `SyncStereoTestView.jsx` en vez de abrir `_openPreviewOverlay` — la URL ya viaja sola por
      `localStorage` (mismo puente de campos de la tarea 6.7), así que el mensaje solo necesita
      pedir que el overlay quede seleccionado. Nueva función `activateOverlay(key)` en
      `SyncStereoTestView.jsx` (agrega la clave a `selectedOverlays` si falta; a diferencia de
      `toggleOverlay`, nunca la apaga — un click repetido en "PREVIEW" no debe desactivar el
      overlay que el propio usuario acaba de pedir ver). En la vista de producción
      (`src/views/A-frame/index.html`, sin AR-SYNC, `window.parent === window`) se mantiene el
      panel flotante propio de siempre, porque ahí no existe el overlay "Youtube Video". Validado
      en el navegador: `hasLocalPanel: false`, `hasYoutubeVideoOverlay: true`, sin errores de
      consola, visible en ambos paneles estéreo.

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
