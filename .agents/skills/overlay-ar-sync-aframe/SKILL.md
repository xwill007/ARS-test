---
name: overlay-ar-sync-aframe
description: Define cómo sumar un componente A-Frame real de src/views/A-frame como un overlay más de la vista de prueba "AR-SYNC" (src/views/ARs/ARScomponents/ARStest/mirror-fix/SyncStereoTestView.jsx), con sincronización de giroscopio/acelerómetro entre los paneles estéreo, componente POSITION, y activación por puntero raycast (gaze/dwell) en overlays con panel de DOM. Usar cuando el usuario pida exponer, agregar o "hacer disponible como overlay" un componente de la vista A-Frame dentro de AR-SYNC/mirror-fix.
---

# Agregar un componente A-Frame como overlay de AR-SYNC

`src/views/ARs/ARScomponents/ARStest/mirror-fix/` es el terreno de pruebas de overlays AR de
`ARS-test` (nació del Requerimiento 002, descartado, y sigue vivo como espacio de experimentación
— ver `ApprendeVr/Documentation/Requerimientos/4-Rejected/Discarded/002-boton-ar-y-fix-espejo-overlay-estereo/`).
Dentro de esa carpeta, **"AR-SYNC"** (`SyncStereoTestView.jsx`) es la vista que muestra dos
paneles estéreo con overlays reales y sincronizados por `postMessage`, a diferencia de "AR-TEST"
(que hace espejo por captura de píxeles — otro mecanismo, no tocar acá).

## Regla central: no crear una vista o botón nuevo

Cuando se pide "usar X como overlay" en este contexto, la integración correcta es sumar una clave
nueva al registro de overlays que **AR-SYNC ya tiene** — nunca crear un botón nuevo en
`ARTestMirrorButton.jsx` ni una vista/ruta separada. `ARTestMirrorButton.jsx` solo abre "AR-TEST"
o "AR-SYNC"; qué overlays se ven **dentro** de AR-SYNC se elige en su propio menú ⚙️
(`SyncConfigMenu.jsx`, pestaña "Overlays", checkboxes de selección múltiple).

## El contrato de un overlay sincronizable

Cada overlay sincronizable de AR-SYNC (hoy: `video` → `VRLocalVideoOverlaySync.jsx`, `cone` →
`VRConeOverlaySync.jsx`) es un componente React con `React.forwardRef` que renderiza un
`<iframe>` con una escena A-Frame adentro. El `ref` expone el `<iframe>` para que
`SyncStereoTestView.jsx` pueda leer su `contentWindow` y relayar mensajes `postMessage` entre el
panel izquierdo y el derecho (nunca al que lo emitió).

Los dos overlays existentes cargan su escena vía `srcDoc` con el código del componente **copiado a
mano** como string. Ese patrón es aceptable para componentes chicos y autocontenidos, pero **no
sirve** si el componente real depende de features de Vite (`import.meta.glob`, imports encadenados
entre varios archivos) — en ese caso hay que evitar la copia (ver "Cuándo usar `src` real en vez
de `srcDoc`" abajo).

## Pasos

1. **Crear (o reusar) una página Vite real** en `mirror-fix/` que declare la escena A-Frame
   necesaria:
   - Carga `/libs/aframe.min.js` (la misma copia local que usa `src/views/A-frame/index.html`,
     **no** una versión distinta por CDN).
   - Declara las entidades `a-entity` con el/los componente(s) que se quieren exponer, con los
     mismos atributos de schema que usa `A-frame/index.html` (revisarlo antes de inventar
     valores).
   - Declara una `<a-camera>` **sin deshabilitar `look-controls`** — en A-Frame, `look-controls`
     usa `DeviceOrientationControls` (giroscopio/acelerómetro) automáticamente en móvil, y cae a
     arrastre de mouse en escritorio. Deshabilitarlo rompe el requisito de "reaccionar a
     giroscopio/acelerómetro igual que los overlays existentes".
   - **Declara (o reusa) un elemento ancla posicionable**: la raíz del componente que se expone
     (p. ej. `#karaoke-vr-component`) o, si el overlay renderiza un panel de DOM (no una entidad
     3D con geometría), una `<a-entity id="<clave>-anchor">` vacía que el panel DOM sigue en
     pantalla (patrón de `youtube-video.html` con `#youtube-video-anchor`). Este ancla es lo que
     mueve/rota/escale el componente POSITION (ver paso "Posicionamiento" más abajo) — **todo
     overlay la necesita, no es opcional**.
   - Registrar este `.html` en `ApprendeVr/frontend/vite.config.js` →
     `build.rollupOptions.input`, igual que `main`/`mobile`/`aframe` — si no se registra ahí,
     el `.html` funciona en `npm run dev` pero **no se genera en `vite build`** (rompe en
     producción sin avisar).

2. **Agregar el puente de sincronización de rotación de cámara** (mismo patrón en los tres
   overlays existentes/nuevos, cámbialo solo si el overlay necesita sincronizar algo más además de
   la cámara):
   ```js
   function send(msg) {
     window.parent.postMessage(Object.assign({ source: 'ars-sync-test' }, msg), '*');
   }
   // poll de lookControls.yawObject/pitchObject.rotation cada 16ms, comparado contra el último
   // valor RECIBIDO (no el último enviado) para no reenviar en loop lo que se acaba de aplicar de
   // forma remota — ver VRLocalVideoOverlaySync.jsx o VRConeOverlaySync.jsx para el código
   // completo (incluye position, opcional).
   // Al recibir { action: 'camera-rotation', yaw, pitch }: escribir DIRECTO en
   // lookControls.yawObject.rotation.y / lookControls.pitchObject.rotation.x — un
   // setAttribute('rotation', ...) no sirve, look-controls lo pisa en el siguiente tick.
   ```
   Si el nuevo overlay carga vía `srcDoc` (ver paso 3), este puente va como `<script>` embebido en
   el `srcDoc`. Si carga vía `src` real (página propia), va como código normal en el `.js` de esa
   página — no hace falta injectarlo como string.

3. **Cuándo usar `src` real en vez de `srcDoc`.** Si el componente real es autocontenido y chico,
   se puede copiar su código dentro de un `srcDoc` (patrón de `VRLocalVideoOverlaySync.jsx`). Si
   depende de `import.meta.glob`, de imports encadenados entre varios archivos del proyecto, o de
   cualquier feature que solo funciona servida por Vite, **no copiarlo**: crear la página Vite real
   del paso 1 e importar el componente real con ES modules
   (`import '../../../../A-frame/components/<Nombre>/<Nombre>.js'` — confirmar la ruta relativa
   real, no asumirla), y montarla en el componente `forwardRef` con un `<iframe src="./tu-pagina.html">`
   **real** (nunca `srcDoc`) — necesario para que rutas relativas (`fetch`, `import.meta.glob`,
   assets) resuelvan contra el origen real de la app.

4. **Crear el componente `forwardRef`** (`<Nombre>OverlaySync.jsx`) que monta esa escena, mismo
   rol que `VRLocalVideoOverlaySync.jsx`/`VRConeOverlaySync.jsx`.

5. **Posicionamiento (componente POSITION, obligatorio en TODO overlay).** Todo overlay nuevo
   debe ser reposicionable desde la vista (menú "Position" de la brújula, marcador 📍 + d-pad),
   igual que `karaoke`/`newSong`/`youtubeVideo`. Son **tres lugares obligatorios** (olvidar
   cualquiera deja el overlay sin control de ubicación o rompe el guardado con 400):
   - `ApprendeVr/frontend/src/views/A-frame/vrPositionControl.js` → array `ELEMENTS`: agregar
     `{ key: '<clave>', selector: '#<ancla>', offset: [...] }` — el `selector` es el ancla
     declarada en el paso 1 (la raíz del componente, o la entidad vacía `#<clave>-anchor` para
     overlays de panel DOM). `offset` es la esquina superior-izquierda del marcador relativa al
     ancla (misma convención que los demás).
   - El `.js` de la página del overlay (el script de entrada, p. ej. `youtube-video-modules.js`):
     `import { initPositionControl } from '<ruta>/vrPositionControl.js';` y llamar
     `initPositionControl({ external: true })` cuando la escena cargue (mismo patrón que
     `aframe-overlay-modules.js`/`youtube-video-modules.js`). Sin esta llamada el marcador no
     existe y los mensajes `position-*` de la brújula no le llegan.
   - `ApprendeVr/backend/src/user-settings/user-settings.util.ts` → `AFRAME_VIEW_ELEMENTS`:
     agregar la clave nueva. Sin esto, guardar la posición del overlay devuelve 400 (mismo tipo
     de bug ya documentado para `youtubeVideo`/`newSong`).

   **Gotcha — overlays con panel de DOM (no entidad 3D con geometría):** si el overlay renderiza
   un `<div>`/`<iframe>` que sigue al ancla proyectada a pantalla (patrón `youtube-video.html`),
   el marcador 📍 real de `vrPositionControl.js` es un `<a-circle>` WebGL que queda **oculto
   detrás del panel de DOM** (el canvas de A-Frame es el fondo de la página, cualquier `<div>`
   normal lo tapa visualmente). En ese caso hay que agregar un botón de DOM equivalente (anclado
   a la esquina del panel, que reenvía su click al `<a-circle>.clickable` real y refleja su
   color/visibilidad) — ver `positionMarker` en `youtube-video-modules.js` como ejemplo canónico.

6. **Activación por puntero raycast (gaze/dwell) — obligatorio en overlays con panel de DOM.**
   En `mirror-fix`, la brújula 3D (`SyncConfigCompassMenu.jsx`) es la capa **superior** de cada
   panel: es la única que recibe el `mousedown`/`mousemove`/`keydown` real del navegador, y su
   reticle (el círculo visible que pinta en rojo al apuntar) no puede intersectar nada del overlay
   de contenido porque **el raycasting de A-Frame no cruza iframes**. Dos casos, según qué renderiza
   el overlay:
   - **Entidades A-Frame reales** (`.clickable`, meshes): no hace falta nada extra — el propio
     overlay de contenido tiene su sistema de gaze/dwell (`aframe-overlay-modules.js`, patrón
     `collectTargets` + THREE.Raycaster + `gaze-hover`), y el reticle de la brújula se pinta vía
     el mensaje `gaze-hover` relevado por `SyncStereoTestView.jsx`.
   - **Panel de DOM** (`<div>`/`<button>` normales, no A-Frame): el gaze/dwell no puede usar
     THREE.Raycaster (no hay meshes) — debe usar `document.elementFromPoint()` en el **centro del
     canvas** (la misma posición que apunta el reticle) para detectar sobre qué `<button>` está la
     mirada, más el mismo `FUSE_MS`/`COOLDOWN_MS`/`REACTIVATION_GRACE_MS`. Ver `gazeTick`/
     `findGazeButton` en `youtube-video-modules.js` o `song-text-modules.js` como ejemplo canónico.

   **Dos reglas duras para que ese gaze/dwell funcione:**
   1. **NO poner `pointer-events: none` en el contenedor del panel de DOM.** `document.elementFromPoint`
      ignora los elementos con `pointer-events: none`, así que aunque los botones hijos tengan
      `pointer-events: auto`, el `elementFromPoint` del centro del canvas puede devolver `null` (o
      el elemento de abajo) y el reticle nunca activa el botón — síntoma reportado: "el puntero
      raycast no activa el menú". Dejar el contenedor con `pointer-events` por defecto (solo los
      hijos interactivos lo necesitan).
   2. **Enviar `gaze-hover` en cada tick** (`send({ action: 'gaze-hover', hovering, progress })`)
      para que el reticle de la brújula se pinte en rojo con el progreso del dwell — sin esto, el
      botón SÍ se activa al completar el dwell, pero el usuario no ve ningún feedback visual y
      parece que "no responde". `SyncStereoTestView.jsx` ya releva ese mensaje al círculo de la
      brújula del mismo panel (ver handler `gaze-hover`).

7. **Registrar la clave nueva en tres lugares** (los tres son obligatorios, olvidar cualquiera
   rompe algo distinto):
   - `SYNCABLE_OVERLAYS` en `SyncStereoTestView.jsx` (clave → componente).
   - `OVERLAY_OPTIONS` en `SyncConfigCompassMenu.jsx` (clave → `labelKey` de i18n) — **ojo: es
     `SyncConfigCompassMenu.jsx`, no `SyncConfigMenu.jsx`** (que ya no existe; el skill
     documentaba ese nombre viejo, corroborar contra el código real).
   - La clave de traducción nueva (`syncConfig.overlay.<clave>` y su `*Short`) en
     `src/locales/{es,en,br}.json` (regla del skill `texto-multidioma`).
   - `ApprendeVr/backend/src/user-settings/user-settings.util.ts` → `ARS_SYNC_OVERLAY_KEYS`:
     agregar la clave nueva, o "Guardar selección" (pestaña Overlays) devuelve 400.

   **Gotcha ya encontrado:** `leftRefs`/`rightRefs` en `SyncStereoTestView.jsx` deben derivarse de
   `Object.keys(SYNCABLE_OVERLAYS)` (`Object.fromEntries(...)`), no de un objeto literal
   hardcodeado aparte — si el objeto de refs no incluye la clave nueva, el primer mensaje
   `postMessage` de ese overlay tira `TypeError: Cannot read properties of undefined (reading
   'current')` en `handleMessage`. Si ves ese objeto hardcodeado en vez de derivado, es una señal
   de que hay que corregirlo también.

8. **Validar en navegador**: abrir `artest-mirror.html` → "AR-SYNC" → menú ⚙️/☰ → pestaña
   "Overlays", activar la clave nueva (desactivar las demás para verla aislada), confirmar que
   renderiza sin errores de consola en ambos paneles, y que arrastrar con el mouse en un panel
   (equivalente de escritorio al giroscopio) rota el overlay igual en el panel hermano. Verificar
   también el marcador 📍/d-pad de "Position" (mover + Guardar devuelve 200, no 400) y, si el
   overlay tiene botones de DOM, que el reticle se pinta en rojo y los activa tras el dwell (ver
   paso 6). Correr `npm run build` (confirma que el entry nuevo compila) y `npm run check:i18n`
   (confirma la clave de traducción).

## Referencias

- Ejemplo real de este patrón aplicado con `src` real (no `srcDoc`): overlay `karaoke` —
  `aframe-overlay-modules.html`/`.js`, `VRKaraokeOverlaySync.jsx` — ver Requerimiento 011
  (`ApprendeVr/Documentation/Requerimientos/2-Developing/011-estandarizar-overlay-aframe-mirror-fix/`).
- Ejemplo real del **panel de DOM + componente POSITION** (ancla vacía + `initPositionControl` +
  botón de marcador de DOM): overlay `youtubeVideo` — `youtube-video.html`/`youtube-video-modules.js`.
- Ejemplo real del **panel de DOM + activación por gaze/dwell** (botones DOM clickeables con
  `document.elementFromPoint` + `gaze-hover`): overlays `youtubeVideo` y `songText` —
  `youtube-video-modules.js`/`song-text-modules.js`.
- Ejemplos existentes con `srcDoc` (código copiado): `VRLocalVideoOverlaySync.jsx`,
  `VRConeOverlaySync.jsx`.
- Componente POSITION (`vrPositionControl.js`, Requerimiento 010): `ELEMENTS`, `initPositionControl`,
  `createWidget` — y su contraparte de validación en backend (`user-settings.util.ts`).
- No confundir con "AR-TEST" (`TestOverlayAR2.jsx`, espejo por captura de píxeles del canvas
  WebGL) — mecanismo distinto, no relacionado a este skill.
