# Requerimiento 015 — Ingesta automática de canciones desde YouTube (descarga o reproducción embebida) + letra + traducción

## 1. Objetivo

Permitir que, a partir de una URL de YouTube, el sistema arme automáticamente una canción completa
para el karaoke: el usuario elige si **descargar** el video (queda local, se reproduce igual que las
canciones precargadas, con textura 3D) o **reproducirlo embebido** desde YouTube sin descargarlo
(iframe 2D). En ambos casos obtiene la letra en inglés con tiempos por frase, la traduce al español
frase por frase y palabra por palabra, y guarda todo en `canciones_vr` / `frases_vr` /
`palabras_vr`. Complementa al Requerimiento 014 (que resuelve el alta manual vía `POST /songs`):
este requerimiento es el pipeline automático que reemplaza tener que escribir
título/autor/letra/traducción a mano desde el teclado virtual de `VRNewSongAf`.

## 2. Antecedentes y estado actual

- **Depende del Requerimiento 014**: usa `SongsService.create()`/`POST /songs` como paso final del
  pipeline para guardar la fila de `canciones_vr`. Si 014 no está implementado todavía, este
  requerimiento lo bloquea (no lo reemplaza).
- **`frases_vr`/`palabras_vr` hoy son de solo lectura en el backend.** `PhrasesService`/
  `WordsService` (`ApprendeVr/backend/src/phrases/`, `src/words/`) solo tienen `findBySongFile()`;
  no existe `create()` en ninguno de los dos, ni `PhrasesController`/`WordsController` exponen
  `POST`.
- **Las entidades `Phrase`/`Word` están incompletas respecto al esquema real:**
  - `Phrase` (`phrases/entities/phrase.entity.ts`) no mapea la columna `tiempo_frase` (TIME, el
    momento del video en que empieza la frase — imprescindible para el karaoke).
  - `Word` (`words/entities/word.entity.ts`) no mapea `id_frase_palabra` (a qué frase pertenece
    cada palabra) — hoy solo linkea `songId`, no la frase específica.
  Ambas hay que ampliarlas antes de poder guardar filas reales generadas por este pipeline.
- **El video hoy se renderiza como textura 3D, no como iframe.** `VRKaraokeAf.loadVideo()`
  (`ApprendeVr/frontend/src/views/A-frame/components/VRKaraokeAf/VRKaraokeAf.js`, línea ~414) crea
  un `<video crossorigin="anonymous">` oculto y lo mapea con `<a-video>` como textura WebGL sobre un
  plano de la escena — funciona porque el archivo es propio (mismo origen). **Un iframe de YouTube
  no se puede leer como textura WebGL** (restricción cross-origin del navegador), así que los dos
  modos de este requerimiento terminan en caminos de reproducción distintos:
  - **Modo "descargar"**: el video queda como archivo local (igual que las 3 canciones del dump), y
    sigue el camino de textura 3D `<a-video>` sin cambios — es indistinguible de una canción cargada
    a mano una vez guardada.
  - **Modo "reproducir desde YouTube"**: el video se muestra como **dos iframes 2D superpuestos con
    CSS** (uno por panel estéreo), no como plano 3D texturizado, porque no hay forma de evitar la
    restricción cross-origin.
  Decisión tomada con el usuario: ofrecer ambos modos como elección explícita al agregar la canción,
  no uno solo.
- **El modo `mirror-fix` no usa una sesión WebXR inmersiva real** (confirmado: no hay
  `requestSession('immersive-vr')` en `artest-mirror.html`/`.jsx`) — es un split-screen simulado en
  una página normal, así que superponer un `<iframe>` con CSS encima de cada panel (modo
  "reproducir desde YouTube") es viable sin las restricciones de `dom-overlay` de WebXR.
- **Ya existe un puente de sincronización play/pause/seek entre los dos paneles estéreo**
  (`aframe-overlay-modules.js`, mensajes `karaoke-play`/`karaoke-pause`/`karaoke-seek`) para el
  `<video>` compartido. Decisión tomada con el usuario: se adapta este mismo puente para controlar
  dos instancias del YouTube IFrame Player en el modo "reproducir desde YouTube" (el modo
  "descargar" sigue usando el puente actual sin cambios, porque sigue siendo un `<video>` local),
  aceptando que en el modo streaming puede haber una **desincronización leve** entre ambos paneles
  que no existe con un `<video>` local compartido.
- **El overlay `karaoke` (`VRKaraokeAf`) ya sabe reproducir una canción "descargada"/local sin
  ningún cambio**: una vez que el modo "descargar" del pipeline guarda el `.mp4` en
  `public/videos/karaoke/` y crea la fila en `canciones_vr` (mismo `fileName` que una canción
  cargada a mano), el overlay existente la reproduce igual que a las 3 del dump — no hay que tocar
  `VRKaraokeAf.js` para el modo "descargar". Decisión tomada con el usuario: el modo "reproducir
  desde YouTube" (streaming, sin archivo local) **no se agrega adentro de `VRKaraokeAf`**, sino
  como un **overlay nuevo y separado** de AR-SYNC (`VRYoutubeKaraokeAf`), seleccionable de forma
  independiente en el menú de overlays — sigue la regla central del skill `overlay-ar-sync-aframe`
  ("no crear una vista o botón nuevo", pero sí una clave nueva en el registro de overlays ya
  existente).
- **Registro de overlays de AR-SYNC** (`SyncStereoTestView.jsx` → `SYNCABLE_OVERLAYS`,
  `SyncConfigMenu.jsx` → `OVERLAY_OPTIONS`, más la clave de traducción en
  `src/locales/{es,en,br}.json`): son los 3 lugares obligatorios para que un overlay nuevo aparezca
  como checkbox en el menú ⚙️ y se sincronice entre paneles — omitir alguno rompe algo distinto (ver
  skill `overlay-ar-sync-aframe`). El overlay `karaoke` existente ya sigue este patrón con `src`
  real (no `srcDoc`) porque depende de imports encadenados (`aframe-overlay-modules.html`/`.js`,
  Requerimiento 011) — el overlay nuevo sigue el mismo camino por la misma razón.
- Ver Requerimiento 014, sección 2, para el resto del contexto de `SongsModule`/`VRNewSongAf` que
  este requerimiento reutiliza.

## 3. Historias de usuario

- Como usuario que quiere agregar una canción, quiero pegar una URL de YouTube y que el sistema
  complete título, autor, letra y traducción automáticamente, para no tener que escribir todo eso a
  mano con el teclado virtual del panel "New Song".
- Como usuario que agrega una canción desde YouTube, quiero elegir si descargarla (para que quede
  como las canciones precargadas) o solo reproducirla en streaming (sin ocupar espacio ni depender
  de copiar el archivo), para decidir según el caso.
- Como usuario que descargó una canción desde YouTube, quiero verla en el mismo overlay de karaoke
  de siempre, sin diferencia con las canciones que ya venían cargadas.
- Como usuario que quiere cantar una canción en modo streaming, quiero activar el overlay
  "YouTube karaoke" (separado del overlay de karaoke local) desde el menú de overlays de AR-SYNC,
  para elegir explícitamente cuál de los dos usar.
- Como usuario en el modo espejo estéreo (`mirror-fix`) usando el overlay de streaming, quiero que
  el video de YouTube se reproduzca en ambos paneles a la vez (aunque no estén perfectamente
  sincronizados cuadro a cuadro), para mantener la experiencia estéreo del resto de la vista.
- Como usuario aprendiendo inglés, quiero ver cada frase de la canción traducida al español y
  también desglosada palabra por palabra, igual que las canciones que ya vienen con esa
  información, para poder estudiar el vocabulario nuevo.
- Como usuario que pega una URL de un video sin subtítulos disponibles, quiero que el sistema me
  avise que no pudo obtener la letra en vez de guardar una canción sin frases/palabras en
  silencio, para saber que tengo que buscar otra fuente o cargarla a mano.
- Como usuario que todavía no tiene la URL del video, quiero un botón "Buscar en YouTube" en el
  mismo panel que abra YouTube en una pestaña nueva del navegador (con mi sesión real: historial,
  recomendaciones, login), para encontrar el video sin salir de la app a buscarlo por mi cuenta y
  después volver a copiar la URL en el campo del formulario.
- Como usuario que ya copió la URL del video encontrado, quiero un botón "Pegar URL del
  portapapeles" en el panel, para no tener que escribirla letra por letra con el teclado virtual
  (o depender del teclado físico, que en el modo `mirror-fix` no siempre llega a este panel — ver
  sección 5).

## 4. Alcance

### Incluido

- **Backend — nuevo dominio `song-ingestion` (`src/song-ingestion/`)**, orquestador que no duplica
  lógica de `songs`/`phrases`/`words`, solo la combina:
  1. `YoutubeVideoService` (o util): según el `sourceMode` del DTO, o bien descarga el video
     completo con `yt-dlp` a `public/videos/karaoke/<slug>.mp4` (**modo `download`**), o bien no
     toca el video en absoluto y solo guarda el video ID de YouTube (**modo `stream`**).
  2. `YoutubeCaptionsService` (o util): invoca `yt-dlp --write-auto-sub --sub-lang en
     --skip-download` (child process) sobre la URL recibida y parsea el VTT/SRT resultante a
     `[{ text, startTime }]`. Esta llamada **siempre** es solo de subtítulos, independiente del
     `sourceMode` elegido para el video.
  3. Fallback a **LRCLIB** (`https://lrclib.net/api/get`, sin API key) si el video no tiene
     subtítulos, buscando por `artist_name`/`track_name` (provistos por el usuario junto con la
     URL) y parseando el LRC a la misma forma `[{ text, startTime }]`.
  4. `TranslationService` (o util): llama a un **LibreTranslate self-hosted** (nuevo servicio
     Docker, ver más abajo) para traducir cada frase completa (`español_frase`) y cada palabra
     individual de la frase (`esp_palabra`/`ing_palabra`).
  5. Orquestación: crea la canción (`SongsService.create`, con `fileName` = el `.mp4` local si
     `sourceMode` es `download`, o el video ID de YouTube si es `stream`), crea las frases
     (`PhrasesService.create`, nuevo) con su `time`, y crea las palabras (`WordsService.create`,
     nuevo) linkeadas a su frase.
  6. `POST /song-ingestion/from-youtube` (protegido con `JwtAuthGuard`, mismo criterio que
     `POST /songs` en 014): body `{ youtubeUrl, title, author, sourceMode: 'download'|'stream',
     artistNameForLyrics? }`, devuelve la canción creada con el conteo de frases/palabras generadas
     (o un error explícito si no se pudo obtener letra por ninguna de las dos fuentes).
- **Backend — completar `Phrase`/`Word` (entidades + create):**
  - `Phrase`: agregar columna `time` (`tiempo_frase`, tipo `time` de MySQL).
  - `Word`: agregar columna `phraseId` (`id_frase_palabra`).
  - `PhrasesService.create()` / `WordsService.create()` (inserción simple, sin controller propio
    todavía — se usan solo desde `song-ingestion`, no se exponen como `POST /frases`/`POST
    /palabras` públicos en este requerimiento).
- **Backend — nuevo servicio Docker `translate` (LibreTranslate)** en `docker-compose.yml`, más
  `LIBRETRANSLATE_URL` en `configuration.ts`/`.env.example`.
- **Frontend — modo `download`: sin cambios en reproducción.** Una vez que la canción queda
  guardada con un `fileName` local, el overlay `karaoke` (`VRKaraokeAf`) ya existente la reproduce
  igual que a las 3 canciones del dump — no requiere tocar `VRKaraokeAf.js`.
- **Frontend — modo `stream`: overlay nuevo y separado `youtube-karaoke`** (no se mezcla con el
  overlay `karaoke` existente), siguiendo el patrón del skill `overlay-ar-sync-aframe`:
  - `VRYoutubeKaraokeAf.js` (nuevo componente A-Frame, en `src/views/A-frame/components/`): carga
    el YouTube IFrame Player API y reproduce las canciones cuyo `fileName` es un video ID de
    YouTube (no un `.mp4`), con su propia lista de canciones (filtrando las que vinieron en modo
    `stream`) y su botón "EVALUATE SONG" reusando `VREvaluacionAf.js` igual que el overlay actual.
  - `youtube-karaoke.html` + entrada `.js` propia en `mirror-fix/` (mismo patrón `src` real que
    `aframe-overlay-modules.html`/`.js` del overlay `karaoke`), registrada en
    `vite.config.js` → `build.rollupOptions.input`.
  - `VRYoutubeKaraokeOverlaySync.jsx` (`forwardRef`, monta el `.html` en un `<iframe src>` real) +
    puente de sincronización de cámara (mismo patrón que los demás overlays) y de play/pause/seek
    adaptado a `playVideo()`/`pauseVideo()`/`seekTo()` de dos instancias `YT.Player` (una por panel
    estéreo), en vez de un `<video>` compartido.
  - Registro en los 3 lugares obligatorios: `SYNCABLE_OVERLAYS` (`SyncStereoTestView.jsx`),
    `OVERLAY_OPTIONS` (`SyncConfigMenu.jsx`), clave de traducción `syncConfig.overlay.
    youtubeKaraoke` en `src/locales/{es,en,br}.json`.
  - `VRNewSongAf` (o un nuevo panel simple, ver más abajo): campo para pegar la URL de YouTube +
    selector `descargar`/`solo reproducir` + botón "Generar desde YouTube" que llama a
    `POST /song-ingestion/from-youtube` y muestra el resultado.
  - Botón nuevo **"BUSCAR EN YOUTUBE"** en el mismo panel (junto al botón "PREVIEW ON YOUTUBE" ya
    existente, mismo patrón `window.open(url, '_blank', 'noopener')`): si los campos `titulo`/
    `autor` ya tienen algo escrito, abre `https://www.youtube.com/results?search_query=<titulo>
    +<autor>` (URL-encoded); si están vacíos, abre `https://www.youtube.com` a secas. Es una
    pestaña nueva del navegador, no un iframe embebido — el usuario busca con su propia sesión de
    YouTube (login, recomendaciones, historial) y después copia la URL del video encontrado de
    vuelta al campo `youtubeUrl` del formulario para que el pipeline automático la use.
  - Botón nuevo **"PEGAR URL DEL PORTAPAPELES"** (`navigator.clipboard.readText()`), agregado a
    pedido del usuario al probar el botón de búsqueda: escribir la URL letra por letra con el
    teclado virtual/físico resultó incómodo, sobre todo en `mirror-fix`, donde el teclado físico no
    siempre llega a este panel (la brújula `SyncConfigCompassMenu.jsx` es la capa que recibe el
    mousedown/keydown real en ese modo — ver sección 5). Al hacer click, agrega el contenido del
    portapapeles al final del valor actual de `youtubeUrl` y lo marca como campo activo. Requiere
    el permiso `clipboard-read` en el `allow` del `<iframe>` que monta este panel dentro de
    `mirror-fix` (`VRKaraokeOverlaySync.jsx`) — sin eso, el navegador bloquea la lectura del
    portapapeles dentro del iframe aunque el sitio sea HTTPS.

### No incluido

- Editar/corregir manualmente la letra o traducción generada antes de guardarla (revisión humana
  del resultado automático): el pipeline guarda tal cual lo que obtiene de yt-dlp/LRCLIB +
  LibreTranslate. Una UI de revisión/edición queda para un requerimiento aparte si la calidad de
  la traducción automática resulta insuficiente en la práctica.
- Alineación de tiempos a nivel de palabra individual (`palabras_vr` no tiene columna de tiempo en
  el esquema actual — coherente con que la evaluación por palabras ya funciona hoy sin tiempos por
  palabra, ver `WordsService`).
- Idiomas distintos de inglés→español (mismo alcance que el resto de la app).
- Exponer `POST /frases` / `POST /palabras` como endpoints públicos e independientes: en este
  requerimiento `PhrasesService.create()`/`WordsService.create()` se usan solo internamente desde
  `song-ingestion`.
- Manejo de cuota/rate-limit de LibreTranslate o de YouTube ante volumen alto: se asume uso
  esporádico (un usuario agregando canciones de a una), no una ingesta masiva.
- Elegir el modo (`download`/`stream`) automáticamente por tamaño/duración del video: lo elige el
  usuario explícitamente en el formulario, sin heurísticas.
- Migrar canciones ya guardadas en modo `stream` a `download` (o viceversa) después de creadas:
  queda fuera de alcance, se agregarían de nuevo si el usuario cambia de opinión.

## 5. Diseño técnico

**Dos modos, ambos incluidos (decisión tomada con el usuario).** Primero se había diseñado solo
"reproducir sin descargar" para evitar el riesgo de ToS de YouTube; el usuario pidió después tener
ambas opciones disponibles. Se acepta esa reconsideración: el modo `download` reintroduce el mismo
matiz legal ya señalado (descargar contenido de YouTube sin permiso viola sus Términos de Servicio,
aunque el riesgo práctico de aplicación para uso personal/educativo es bajo) — se mantiene el
aviso de derechos de autor que ya existe en el panel `VRNewSongAf` también para este flujo
automático.

**Modo `stream`: overlay nuevo y separado, no rama dentro de `VRKaraokeAf` (decisión tomada con el
usuario).** Un iframe cross-origin no se puede leer como textura WebGL, así que no hay forma de
mantener el camino de `<a-video>` para YouTube en streaming. En vez de agregar una rama
condicional dentro de `VRKaraokeAf.loadVideo()` (que mezclaría dos mecanismos de reproducción muy
distintos en un mismo componente), se crea `VRYoutubeKaraokeAf` como overlay independiente de
AR-SYNC, siguiendo la regla central del skill `overlay-ar-sync-aframe` de sumar una clave nueva al
registro de overlays en vez de una vista/botón nuevo. Se acepta el cambio de experiencia (2D
superpuesto en vez de plano 3D, propio de este overlay) y el riesgo de desincronización leve entre
los dos paneles estéreo, ya identificados como trade-offs aceptados explícitamente — el overlay
`karaoke` existente no cambia en absoluto.

**Modo `download`: cero cambios en la reproducción.** Al guardar el `.mp4` localmente con el mismo
criterio que una canción cargada a mano (Requerimiento 014), el overlay `karaoke` existente la
reproduce sin distinguirla de las demás — el pipeline de ingestión solo decide DÓNDE llega el
archivo, no CÓMO se reproduce después.

**Letra: subtítulos del propio video primero, LRCLIB como fallback (decisión tomada con el
usuario).** Los subtítulos automáticos de YouTube tienen la ventaja de estar sincronizados con ESE
video exacto (mismo corte/edición); LRCLIB depende de que alguien haya subido esa canción con esa
duración exacta, así que se usa solo cuando YouTube no tiene subtítulos.

**Traducción: LibreTranslate self-hosted vía Docker (decisión tomada con el usuario).** Sin costo
por carácter, sin API key externa, mismo patrón de infraestructura que ya usa el backend
(`docker-compose.yml` con servicios adicionales). Alternativa descartada: DeepL (ya no ofrece un
tier gratuito permanente) y Google Translate API (cobra por carácter).

**Columna nueva `youtube_video_url` en `canciones_vr` (decisión tomada con el usuario, reemplaza el
diseño anterior de heurística por extensión).** Se agrega `youtube_video_url VARCHAR(255) NULL` vía una
migración propia del backend (`db/009-songs-youtube-video-url.sql`), siguiendo el mismo patrón ya
establecido para extender el esquema (`db/001` a `008`, montadas en `docker-compose.yml` junto al
dump legado) — **no** es una excepción al criterio de "no tocar el esquema legado": ese criterio
aplica a renombrar/quitar columnas existentes de `canciones_vr`, no a agregar una columna nueva y
nullable, que es exactamente lo que ya hacen las migraciones 001-008 sobre otras tablas propias.
Guarda la URL completa de YouTube y es el dato explícito y autoritativo de "esta canción vino de
YouTube" — reemplaza la heurística descartada de adivinarlo por la extensión de `fileName`. Se
completa en **ambos modos** (no solo `stream`): en modo `download` sirve como referencia de
procedencia (para no volver a descargarla si el usuario repite la misma URL, y para mostrar un
link al original si hace falta).

`Song.fileName` (columna `archivo_cancion`) sigue siendo **cómo se reproduce**, no de dónde vino:
en modo `download` es el nombre del `.mp4` local (igual que hoy); en modo `stream`, como
`archivo_cancion` es `NOT NULL` en el esquema legado y no hay archivo real que guardar ahí, se
sigue completando con el video ID de YouTube (valor único y estable, sirve de todos modos como
`fileName` "no vacío"), pero la decisión de qué overlay usar ya no depende de interpretar ese
valor: `SongsService.findAll()`/el frontend filtran por `youtube_video_url IS NOT NULL AND archivo_cancion
LIKE` (o más simple, `youtube_video_url` presente + `archivo_cancion` sin extensión de video conocida)
— en la práctica, alcanza con que el overlay `youtube-karaoke` pida las canciones con
`youtube_video_url` no nulo, y `VRKaraokeAf` siga mostrando todas (las de modo `stream` no tendrán un
archivo real en `public/videos/karaoke/`, así que fallarían al reproducir ahí si se colaran —
motivo de más para que el filtro por `youtube_video_url` sea explícito, no opcional).

**Botón "Buscar en YouTube": pestaña nueva (`window.open`), no un navegador embebido (decisión
tomada con el usuario a partir de la pregunta "¿es posible agregar un navegador web que abra
YouTube con la sesión del usuario?").** No es viable embeber `youtube.com` completo en un
`<iframe>` dentro del panel: Google bloquea eso con `X-Frame-Options`/CSP `frame-ancestors` en todo
el sitio (solo permite iframear el reproductor de un video puntual vía `youtube.com/embed/ID`, que
es justamente el modo `stream` de este mismo requerimiento — sirve para reproducir un video ya
elegido, no para buscar). La alternativa que sí funciona y no requiere infraestructura nueva es
abrir una pestaña de navegador real con `window.open(...)`, que hereda la sesión de YouTube del
usuario (login, historial, recomendaciones) porque las cookies de `youtube.com` viajan con esa
pestaña igual que con cualquier otra — es el mismo mecanismo que ya usa el botón "PREVIEW ON
YOUTUBE" existente en `VRNewSongAf` para la URL ya pegada. El costo aceptado es que el usuario sale
momentáneamente de la vista AR-SYNC/`mirror-fix` mientras busca, y tiene que volver a copiar la URL
a mano — no hay forma de evitar esa salida sin violar la restricción de `X-Frame-Options` de
YouTube.

**Puente de sincronización de los campos de `VRNewSongAf` entre los paneles de `mirror-fix`
(hallazgo real, agregado tras verificar el botón de pegar en vivo).** El usuario probó "PEGAR URL
DEL PORTAPAPELES" y encontró que la URL solo aparecía en el panel donde se hizo click, no en el
otro — inconsistente con el resto de AR-SYNC, donde la canción seleccionada, el play/pause/seek y
la rotación de cámara sí se replican entre ambos paneles. Se agrega un puente nuevo en
`aframe-overlay-modules.js` (mismo archivo y mismo patrón que el puente de video del overlay
`karaoke`: hijo → `window.parent.postMessage` → `SyncStereoTestView.jsx` relay genérico → hijo
hermano) que poll-ea los 4 campos de `this._values` de `vr-new-song-af` cada 300ms y reenvía
`{ action: 'new-song-field-update', field, value }` cuando alguno cambia; el panel que lo recibe
escribe el valor directo en su propio `_values` y refresca el texto del campo. No requirió tocar
`SyncStereoTestView.jsx`: su relay ya reenvía genéricamente cualquier acción no reservada del
overlay `karaoke` (mismo iframe que hospeda `vr-new-song-af`) al panel opuesto.

**Overlay nuevo `youtubeVideo` ("Youtube Video") en el menú ⚙️ de AR-SYNC (pedido del usuario,
promueve el panel de previsualización a un overlay real).** Después de validar el panel flotante de
"PREVIEW ON YOUTUBE", el usuario pidió poder activarlo/desactivarlo como cualquier otro overlay
desde la pestaña "Overlays" del menú ⚙️, en vez de tener que apretar el botón cada vez desde el
panel New Song. Se agrega siguiendo el skill `overlay-ar-sync-aframe`: `VRYoutubeVideoOverlaySync.
jsx` (patrón `srcDoc` autocontenido, como `VRConeOverlaySync.jsx` — sin las dependencias de Vite
que sí tiene `karaoke`), registrado en `SYNCABLE_OVERLAYS`/`OVERLAY_OPTIONS`/locales. Se entera de
qué video mostrar leyendo `localStorage['apprendevr_youtube_preview_url']` (que el puente de campos
de `aframe-overlay-modules.js` ya escribe cada vez que cambia `youtubeUrl` en el panel New Song) y
reaccionando al evento `storage` — no hace falta un puente de postMessage propio para este dato
porque todos los iframes de `mirror-fix` comparten el mismo origen y por lo tanto el mismo
`localStorage`. Reusa el mismo truco de "billboard" (proyectar un punto 3D fijo a pantalla en cada
frame) que el panel de previsualización, para que también reaccione al giroscopio/mouse-drag.
**Hallazgo de paso:** el skill documentaba `OVERLAY_OPTIONS` en `SyncConfigMenu.jsx`, pero ese
componente ya no existe — la lista real vive duplicada en `SyncConfigCompassMenu.jsx` (confirmado
leyendo el código); y agregar una 5ta clave de overlay destapó un bug de layout latente ahí (el
botón "Guardar" del grupo Overlays tenía una posición Y fija pensada para 4 filas) que se corrigió
haciéndola dependiente de `OVERLAY_OPTIONS.length`.

**Overlay `youtubeVideo`: siempre visible + input/pegar propio + edición de ubicación persistida en
base de datos (ampliación pedida por el usuario tras probar la primera versión).** La primera
versión del overlay no mostraba nada hasta que el panel New Song ya tenía una URL cargada. Se
reescribe `youtube-video-modules.js` para mostrar SIEMPRE un panel con: input de URL + botón
"PEGAR URL" (mismo patrón `window.focus()` + `navigator.clipboard.readText()` que `VRNewSongAf.js`)
+ el recuadro (16:9) donde se ve el video, ya sea el placeholder punteado o el iframe embebido real
— lee/escribe la misma clave de `localStorage` que el panel New Song, así que ambos quedan
consistentes sin importar desde dónde se puso la URL.

Para el "componente de edición de ubicación" pedido (marcador 📍 + d-pad + GUARDAR, igual que
karaoke/New Song), el overlay pasa de `srcDoc` autocontenido a página Vite real (`youtube-video.
html`/`youtube-video-modules.js`, registrada en `vite.config.js`) — necesario para poder `import`ar
`vrPositionControl.js` real (un `srcDoc` en blanco no resuelve imports de proyecto), mismo criterio
que ya usa el overlay `karaoke`. Se agrega una entrada nueva a `ELEMENTS` en `vrPositionControl.js`
(clave `youtubeVideo`, ancla `#youtube-video-anchor`).

**Hallazgo real en el camino: el backend rechazaba el guardado de posición con 400.** Agregar la
clave `youtubeVideo` a `vrPositionControl.js` no alcanzaba — el backend
(`user-settings.util.ts`) no la reconocía como válida (mismo tipo de bug ya documentado en el
Requerimiento 010 para karaoke/songList/newSong). Al agregarla ahí apareció un segundo problema:
`youtube-video.html` no tiene `#karaoke-vr-component`/`#new-song-component`, así que su propio
guardado de posición solo manda `{youtubeVideo: ...}` — exigir las 4 claves juntas en el mismo
payload rompía el guardado de ESTA página en particular. Se corrigió en dos partes: (1)
`isValidAframeViewConfig` deja de exigir claves específicas, acepta cualquier subconjunto no vacío
de las 4 conocidas, validando la forma de cada una presente; (2) `UserSettingsService.saveConfig`
pasa de reemplazo completo del `config` a **merge superficial**, para que el guardado parcial de
una página no borre lo que otra página ya había guardado (las demás vistas de `user-settings`,
siempre un objeto completo con un solo productor, no cambian de comportamiento con el merge). Mismo
criterio para `isValidArsSyncOverlaysConfig` (agregar `youtubeVideo` a las claves de overlay
válidas, para que "Guardar selección" tampoco falle).

**"PREVIEW ON YOUTUBE": panel 2D flotante (DOM) en vez de pestaña nueva (pedido del usuario).** El
botón existente abría `window.open(url)`; se cambia a mostrar el video embebido
(`youtube.com/embed/<id>`) en un panel superpuesto al canvas de A-Frame, sin salir de la vista.
Mismo límite técnico ya documentado para el modo `stream` de este requerimiento: un iframe de
YouTube no se puede leer como textura WebGL (`<a-video>`), así que no es un plano 3D real — es un
`<div>`/`<iframe>` de DOM normal (`position: fixed`, centrado, con botón "X CERRAR"), el mismo
criterio ya elegido para el overlay `youtube-karaoke` (dos iframes 2D superpuestos con CSS). El
video ID se extrae de la URL con una regex que cubre `watch?v=`, `youtu.be/`, `embed/` y `shorts/`;
si no matchea ninguno, se muestra un error en el `status` en vez de abrir un panel vacío. Un
segundo click en el mismo botón cierra el panel (toggle) en vez de abrir uno nuevo encima.

**Botón "Pegar URL del portapapeles" en vez de arreglar el teclado físico dentro de
`mirror-fix` (hallazgo real, investigado en esta sesión).** El usuario pidió que activar un campo
con el puntero disparara la captura de teclado físico "como ya funciona en
`src/views/A-frame/index.html`". Esa captura (`_handlePhysicalKeyDown`, `_typingMode`) YA existe en
`VRNewSongAf.js` — es el mismo archivo en ambos contextos — pero en `mirror-fix` no llega a
activarse de forma confiable porque la brújula 3D (`SyncConfigCompassMenu.jsx`, capa más externa de
cada panel, ver `SyncStereoTestView.jsx` → `renderPanel`) es la que recibe el `mousedown`/
`mousemove`/`keydown` REAL del navegador (comentario explícito en el propio código: "la brújula es
la única capa que recibe el mousedown/mousemove real"); el overlay de contenido (karaoke/New Song)
vive en un `<iframe>` distinto por debajo, que solo recibe clicks reenviados puntualmente (p. ej.
`gaze-hover` para el reticle) pero no un reenvío genérico de foco de teclado. Arreglar eso de raíz
implicaría rediseñar el puente de eventos entre la brújula y cada overlay de contenido (agregar un
mecanismo de "estos son los `.clickable` del panel de abajo, reenviame también sus eventos de
teclado"), un cambio de arquitectura más grande que excede el alcance de este requerimiento. Se
opta por un atajo pragmático que no depende de resolver ese cruce de iframes: un botón "PEGAR URL
DEL PORTAPAPELES" que lee el portapapeles al hacer click (un click real SÍ llega hoy al overlay de
contenido — se verificó con el botón "BUSCAR EN YOUTUBE" — a diferencia del teclado físico) y
escribe el valor directamente en el campo `youtubeUrl`, sin necesitar que ningún `keydown` cruce
del iframe de la brújula al de contenido.

**`yt-dlp` como dependencia de sistema, no de `npm`.** Se invoca como proceso hijo
(`child_process.execFile`) desde `song-ingestion` — tanto para bajar subtítulos (ambos modos) como
para descargar el video completo (solo modo `download`) — igual que cualquier binario externo; no
hay un paquete npm oficial equivalente confiable. Requiere que `yt-dlp` esté instalado en el
entorno donde corre el backend (documentar en `.env.example`/README del backend, o agregarlo al
`Dockerfile` opcional mencionado en el Requerimiento 004 si se decide correr el backend en Docker
también).

## 6. Archivos a modificar

| Archivo | Cambio |
|---|---|
| `ApprendeVr/backend/src/song-ingestion/song-ingestion.module.ts` | Nuevo: registra el dominio orquestador. |
| `ApprendeVr/backend/src/song-ingestion/song-ingestion.controller.ts` | Nuevo: `POST /song-ingestion/from-youtube` (`JwtAuthGuard`). |
| `ApprendeVr/backend/src/song-ingestion/song-ingestion.service.ts` | Nuevo: orquesta captions → traducción → `SongsService.create`/`PhrasesService.create`/`WordsService.create`. |
| `ApprendeVr/backend/src/song-ingestion/youtube-captions.util.ts` | Nuevo: invoca `yt-dlp --write-auto-sub --skip-download`, parsea VTT/SRT a frases con tiempo. |
| `ApprendeVr/backend/src/song-ingestion/youtube-video.util.ts` | Nuevo: invoca `yt-dlp` para descargar el video completo a `public/videos/karaoke/` (solo `sourceMode: 'download'`). |
| `ApprendeVr/backend/src/song-ingestion/lrclib.util.ts` | Nuevo: cliente `GET https://lrclib.net/api/get`, parsea LRC. |
| `ApprendeVr/backend/src/song-ingestion/translation.util.ts` | Nuevo: cliente HTTP a LibreTranslate. |
| `ApprendeVr/backend/src/song-ingestion/dto/create-from-youtube.dto.ts` | Nuevo: `youtubeUrl`, `title`, `author`, `sourceMode: 'download'\|'stream'`, `artistNameForLyrics?`. |
| `ApprendeVr/backend/db/009-songs-youtube-video-url.sql` | Nuevo: `ALTER TABLE canciones_vr ADD COLUMN youtube_video_url VARCHAR(255) NULL`, mismo patrón que `db/001` a `008`. |
| `ApprendeVr/backend/src/songs/entities/song.entity.ts` | Agregar columna `youtubeVideoUrl` (`youtube_video_url`, nullable). |
| `ApprendeVr/backend/src/songs/dto/create-song.dto.ts` | Agregar `youtubeVideoUrl?` opcional (el Requerimiento 014 ya lo creó; se amplía acá). |
| `ApprendeVr/backend/src/phrases/entities/phrase.entity.ts` | Agregar columna `time` (`tiempo_frase`). |
| `ApprendeVr/backend/src/phrases/phrases.service.ts` | Agregar `create()`. |
| `ApprendeVr/backend/src/words/entities/word.entity.ts` | Agregar columna `phraseId` (`id_frase_palabra`). |
| `ApprendeVr/backend/src/words/words.service.ts` | Agregar `create()`. |
| `ApprendeVr/backend/src/config/configuration.ts` | Agregar `libreTranslateUrl`. |
| `ApprendeVr/backend/.env.example` | Agregar `LIBRETRANSLATE_URL`. |
| `ApprendeVr/backend/docker-compose.yml` | Agregar servicio `translate` (imagen `libretranslate/libretranslate`) y montar `009-songs-youtube-video-url.sql` en `/docker-entrypoint-initdb.d/10-...sql`. |
| `ApprendeVr/frontend/src/views/A-frame/components/VRYoutubeKaraokeAf/VRYoutubeKaraokeAf.js` | Nuevo componente A-Frame: reproduce canciones en modo `stream` vía YouTube IFrame Player. Sin cambios en `VRKaraokeAf.js` (modo `download` reusa su camino existente tal cual). |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/youtube-karaoke.html` | Nuevo: página Vite real (mismo patrón que `aframe-overlay-modules.html`), carga `/libs/aframe.min.js` + su script de entrada. |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/youtube-karaoke-modules.js` | Nuevo: importa `VRYoutubeKaraokeAf.js` real + puente de sincronización de cámara y de `playVideo()`/`pauseVideo()`/`seekTo()` entre los dos `YT.Player`. |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/VRYoutubeKaraokeOverlaySync.jsx` | Nuevo: `forwardRef` que monta `youtube-karaoke.html` en un `<iframe src>` real (mismo rol que `VRKaraokeOverlaySync.jsx`). |
| `ApprendeVr/frontend/vite.config.js` | Registrar `youtube-karaoke.html` en `build.rollupOptions.input`. |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/SyncStereoTestView.jsx` | Agregar `youtube-karaoke` a `SYNCABLE_OVERLAYS`. |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/SyncConfigMenu.jsx` | Agregar `youtube-karaoke` a `OVERLAY_OPTIONS`. |
| `ApprendeVr/frontend/src/locales/{es,en,br}.json` | Clave `syncConfig.overlay.youtubeKaraoke` (regla del skill `texto-multidioma`). |
| `ApprendeVr/frontend/src/views/A-frame/components/VRKaraokeAf/components/VRNewSongAf/VRNewSongAf.js` (o panel nuevo) | Campo de URL de YouTube + selector `download`/`stream` + botón que llama a `POST /song-ingestion/from-youtube` + botón "BUSCAR EN YOUTUBE" (`window.open` a `youtube.com/results?search_query=...` o `youtube.com`) + botón "PEGAR URL DEL PORTAPAPELES" (`navigator.clipboard.readText()`, agrega al final de `youtubeUrl`). Alto del panel ampliado (`5.15` → `5.5`) para que entren los botones nuevos. |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/VRKaraokeOverlaySync.jsx` | Agregar `clipboard-read` al `allow` del `<iframe>` (si no, el navegador bloquea `navigator.clipboard.readText()` dentro de él aunque el sitio sea HTTPS). |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/aframe-overlay-modules.html` | Actualizar `height: 5.15` → `height: 5.5` en el atributo `vr-new-song-af` (mismo motivo que arriba). |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/aframe-overlay-modules.js` | Nuevo puente: poll-ea `vr-new-song-af._values` (4 campos) cada 300ms y sincroniza cambios entre paneles vía `postMessage`/`SyncStereoTestView.jsx` (mismo patrón que el puente de video de `karaoke`); además escribe `youtubeUrl` a `localStorage['apprendevr_youtube_preview_url']` para el overlay `youtubeVideo`. |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/VRYoutubeVideoOverlaySync.jsx` | Overlay `youtubeVideo`: `<iframe src="./youtube-video.html">` real (no `srcDoc`) + `allow="...; clipboard-read"`. |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/youtube-video.html` | Nuevo: página Vite real (mismo patrón que `aframe-overlay-modules.html`) — `<a-scene>` + `#youtube-video-anchor` + `<a-camera>`. |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/youtube-video-modules.js` | Nuevo: `initPositionControl({external:true})`, puente de cámara por postMessage, y el panel (input URL + botón "PEGAR URL" + recuadro de video) que sigue a `#youtube-video-anchor` en pantalla. |
| `ApprendeVr/frontend/vite.config.js` | Registrar `youtube-video.html` en `build.rollupOptions.input`. |
| `ApprendeVr/frontend/src/views/A-frame/vrPositionControl.js` | Agregar `{ key: 'youtubeVideo', selector: '#youtube-video-anchor', offset: [-0.3, 0.3, 0.05] }` a `ELEMENTS`. |
| `ApprendeVr/backend/src/user-settings/user-settings.util.ts` | `isValidAframeViewConfig`: acepta cualquier subconjunto no vacío de `['karaoke','songList','newSong','youtubeVideo']` (antes exigía las 3 originales completas). `isValidArsSyncOverlaysConfig`: agregar `youtubeVideo` a `ARS_SYNC_OVERLAY_KEYS`. |
| `ApprendeVr/backend/src/user-settings/user-settings.service.ts` | `saveConfig`: merge superficial del `config` (antes reemplazo completo), para que un guardado parcial de una página no borre lo que otra ya guardó. |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/SyncStereoTestView.jsx` | Agregar `youtubeVideo` a `SYNCABLE_OVERLAYS`. |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/SyncConfigCompassMenu.jsx` | Agregar `youtubeVideo` a `OVERLAY_OPTIONS` (lista real, no `SyncConfigMenu.jsx`); botón/subtexto del grupo Overlays reubicados dinámicamente según `OVERLAY_OPTIONS.length`. |
| `ApprendeVr/frontend/src/locales/{es,en,br}.json` | Claves `syncConfig.overlay.youtubeVideo`/`youtubeVideoShort`. |
| `ApprendeVr/frontend/src/views/A-frame/vrSongsApi.util.js` | Agregar `createSongFromYoutube(...)` (mismo patrón del Requerimiento 014). |

## 7. Criterios de aceptación

- [ ] Requerimiento 014 completado y validado (dependencia dura).
- [ ] `POST /song-ingestion/from-youtube` con `sourceMode: 'stream'` y una URL con subtítulos en
      inglés crea la canción (`fileName` = video ID), sus frases (con `time`) y sus palabras (con
      traducción), sin descargar ningún archivo de video.
- [ ] `POST /song-ingestion/from-youtube` con `sourceMode: 'download'` descarga el video a
      `public/videos/karaoke/`, crea la canción con ese `fileName` local, y sus frases/palabras
      igual que en modo `stream`.
- [ ] En ambos modos, la canción creada guarda la URL original en `youtube_video_url` (columna
      nueva de la migración `009`), no solo en `archivo_cancion`/`fileName`.
- [ ] El overlay `youtube-karaoke` filtra su lista de canciones por `youtubeVideoUrl` no nulo (no
      por una heurística sobre `fileName`); las 3 canciones del dump y las cargadas a mano
      (Requerimiento 014, sin `youtubeVideoUrl`) nunca aparecen ahí.
- [ ] En ambos modos, si no hay subtítulos en YouTube ni resultado en LRCLIB, devuelve un error
      explícito (no guarda una canción sin frases en silencio).
- [ ] En modo `stream`, `yt-dlp` nunca descarga el archivo de video (verificar que no queda ningún
      `.mp4`/`.webm` en disco tras la ingesta, solo el `.vtt`/`.srt` temporal).
- [ ] Una canción creada en modo `download` se ve y reproduce en el overlay `karaoke` existente sin
      ninguna diferencia respecto a una cargada a mano — `VRKaraokeAf.js` no requirió cambios.
- [ ] Una canción creada en modo `stream` **no** aparece en el overlay `karaoke`, y sí aparece y se
      reproduce en el overlay nuevo `youtube-karaoke`, activable de forma independiente desde el
      menú ⚙️ de AR-SYNC (pestaña "Overlays").
- [ ] Desde `mirror-fix`, con el overlay `youtube-karaoke` activo, una canción en modo `stream` se
      reproduce en ambos paneles estéreo (como iframe), con play/pause/seek disparado desde un
      panel replicándose en el otro.
- [ ] Las 3 canciones locales del dump (`StandByMe_BenEKing.mp4`, etc.) siguen reproduciéndose
      exactamente como hoy (textura 3D `<a-video>`, overlay `karaoke`), sin regresión.
- [ ] `npm run build` (frontend) genera `youtube-karaoke.html` (confirma que quedó registrado en
      `vite.config.js`).
- [ ] `npm run build` y `npm test` (backend) pasan sin necesidad de levantar MySQL ni
      LibreTranslate (mockear el cliente HTTP en los tests).
- [ ] `npm run check:i18n` (frontend) pasa con la clave `syncConfig.overlay.youtubeKaraoke` en los
      3 idiomas.
- [ ] El botón "BUSCAR EN YOUTUBE" del panel de ingesta abre una pestaña nueva del navegador (no un
      iframe) apuntando a `youtube.com/results?search_query=...` cuando hay `titulo`/`autor`
      escritos, o a `youtube.com` si están vacíos; la pestaña usa la sesión de YouTube ya logueada
      del usuario en ese navegador (visible por sus recomendaciones/historial personalizados).
- [ ] El botón "PEGAR URL DEL PORTAPAPELES" funciona tanto en `src/views/A-frame/index.html` como
      dentro del overlay `karaoke` de `mirror-fix` (con el permiso `clipboard-read` agregado al
      `<iframe>` de `VRKaraokeOverlaySync.jsx`): copiar una URL en el navegador, click en el botón,
      y verla aparecer al final del campo `youtubeUrl`.
- [ ] En `mirror-fix` con "Doble panel" activo, pegar (o escribir) en cualquier campo de
      `VRNewSongAf` en un panel hace que el mismo valor aparezca en el campo equivalente del panel
      opuesto en menos de ~300ms (mismo patrón de sincronización que la canción seleccionada del
      overlay `karaoke`).
- [ ] Click en "PREVIEW ON YOUTUBE" con una URL válida abre un panel flotante con el video
      embebido (sin salir de la vista ni abrir pestaña nueva); un segundo click lo cierra. Con una
      URL de formato no reconocido, muestra un error en el `status` en vez de abrir un panel
      vacío.
- [ ] El overlay "Youtube Video" aparece como checkbox en el menú ⚙️ → "Overlays" de AR-SYNC; al
      activarlo, muestra el video embebido de la URL actual de `youtubeUrl` en ambos paneles, y su
      posición en pantalla responde al giroscopio/mouse-drag igual que los demás overlays de
      contenido.
- [ ] Al activar el overlay "Youtube Video" sin ninguna URL puesta todavía, muestra igual un panel
      con input de URL + botón "PEGAR URL" + el recuadro (placeholder punteado) donde se verá el
      video — nunca aparece vacío/en blanco.
- [ ] El overlay "Youtube Video" tiene su propio marcador 📍/d-pad de edición de ubicación (menú
      "Position"), y guardar la posición devuelve 200 (`PUT /api/user-settings/aframe-view`), no
      400. Recargar la página reaplica la posición guardada.
- [ ] Guardar la posición del overlay "Youtube Video" no borra las posiciones de
      karaoke/songList/newSong ya guardadas desde `index.html`/`aframe-overlay-modules.html` (ni
      viceversa) — confirma que el guardado es un merge, no un reemplazo completo.

## 8. Referencias

- Requerimiento 014 (`1-Pending/014-agregar-nuevas-canciones`): dependencia dura (`SongsService.
  create`, `POST /songs`, `JwtAuthGuard`).
- [yt-dlp](https://github.com/yt-dlp/yt-dlp): descarga de subtítulos con `--write-auto-sub
  --skip-download`.
- [LRCLIB](https://www.lrclib.net/) (`https://lrclib.net/api/get`): letra sincronizada gratuita,
  sin API key.
- [LibreTranslate](https://github.com/LibreTranslate/LibreTranslate): motor de traducción
  self-hosted, sin costo por carácter.
- `A-frame/Proyecto/BaseDatos/english_vr.sql`: esquema real de `frases_vr`/`palabras_vr`.
- Skill `overlay-ar-sync-aframe`: patrón de registro de un overlay nuevo en AR-SYNC (3 lugares
  obligatorios), y ejemplo real del overlay `karaoke` con `src` real (no `srcDoc`).
- Decisiones tomadas por el usuario en la conversación de origen: soportar ambos modos (descargar y
  streaming, no solo uno); yt-dlp para subtítulos en ambos modos y también para el video completo
  en modo `download`; LibreTranslate self-hosted vía Docker; el modo `stream` va en un overlay
  nuevo y separado (`youtube-karaoke`), no como rama dentro de `VRKaraokeAf`; aceptar la posible
  desincronización leve entre los dos paneles estéreo en modo `stream`; agregar la columna
  `youtube_video_url` a `canciones_vr` (vía migración) para registrar la URL de origen de forma
  explícita, en vez de inferirla por la forma de `fileName`.
