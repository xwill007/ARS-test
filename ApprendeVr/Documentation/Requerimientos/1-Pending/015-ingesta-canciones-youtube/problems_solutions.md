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
