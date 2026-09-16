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
