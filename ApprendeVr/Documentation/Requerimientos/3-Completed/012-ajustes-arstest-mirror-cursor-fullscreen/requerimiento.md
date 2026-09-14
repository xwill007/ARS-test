# Requerimiento 012 — Ajustes en ARStest mirror-fix: cursor con auto-click, pantalla completa y sync de video

## 1. Objetivo

Corregir problemas de usabilidad en `src/views/ARs/ARScomponents/ARStest/mirror-fix/`
(`artest-mirror.html`, overlays de prueba "AR-TEST" y "AR-SYNC"), encontrados en varias rondas de
validación (primero en navegador de escritorio, después en un celular real dentro de lentes de
cartón VR — el caso de uso real de esta vista):

1. Reticle **estático** en el centro de cada panel (gaze-based, no sigue mouse/touch) que, al
   apuntarlo sostenido sobre un elemento clickeable (p. ej. el botón play/pause), cambia a rojo y
   se achica hasta un punto, disparando el click automáticamente al completar ese "fuse"/dwell —
   sin necesitar ver más de un puntero por panel, ni en "video" ni en "karaoke".
2. La vista no pide pantalla completa, así que la barra de direcciones del navegador queda
   visible y resta espacio útil.
3. La sincronización por `postMessage` entre los paneles izquierdo/derecho de AR-SYNC no
   propagaba correctamente el **play** del video de "video", y el video interno de "karaoke"
   (Requerimiento 011) directamente no tenía ningún tipo de sincronización ni criterio anti-eco.

Este es un requerimiento vivo: el diseño técnico se corrigió varias veces sobre la marcha a medida
que la validación en dispositivo real y las pruebas en profundidad revelaban que los enfoques
iniciales no eran correctos — ver sección 5 y `problems_solutions.md` para el historial completo
de esas correcciones (incluye un hallazgo tardío sobre un criterio marcado `[x]` sin estar
realmente verificado).

## 2. Antecedentes y estado actual

### 2.1 Cursor/raycaster — estado real por overlay (verificado en código y en navegador)

- **`VRLocalVideoOverlaySync.jsx`** (overlay "video"): declaraba un `<a-cursor id="main-cursor">`
  con el componente `cursor="fuse: true; ..."` nativo de A-Frame. Su `raycaster` sí detecta
  correctamente la intersección (confirmado por consola en toda la sesión de depuración), pero su
  pipeline interno de eventos (`mouseenter`/`fusing`/`click`) **nunca llegó a dispararse** en este
  contexto (A-Frame 1.4.2) — no se identificó la causa exacta pese a una investigación extensa
  (ver `problems_solutions.md`).
- **`VRConeOverlaySync.jsx`** (overlay "cono"): no tenía ningún `<a-cursor>` ni elementos
  `.clickable`/`.raycastable` — overlay puramente visual, se le agregó el reticle solo por
  consistencia (nunca tiene nada que intersectar).
- **`aframe-overlay-modules.html`** (overlay "karaoke", Requerimiento 011): tampoco tenía
  `<a-cursor>`. `VRKaraokeAf.js`/`VRNewSongAf.js` (componentes reales de
  `src/views/A-frame/components`) implementan su **propio** raycasting manual por mouse/touch
  (`vrPointerRaycast.util.js` → `getPointerNDC`), y sus botones no tienen las clases
  `.clickable`/`.raycastable` que un `<a-cursor>` nativo necesitaría para intersectarlos.

**Hallazgo de layout (corregido, ver sección 5):** en `VRLocalVideoOverlaySync.jsx`, la cámara está
en `position="0 1.8 0"` mirando plano hacia -Z, mientras el plano de video está en `[0, 5, -8]` —
en reposo (sin que el usuario rote la cámara), el reticle no caía sobre el video en absoluto.

### 2.2 Pantalla completa — no se pide en ningún lugar de `mirror-fix`

Ninguno de los archivos de `mirror-fix/` llamaba a `requestFullscreen()`. El flujo de producción sí
lo hace: `ApprendeVr/frontend/src/App.jsx` tiene un `enterFullscreen()` (con los prefijos
`webkitRequestFullscreen`/`mozRequestFullScreen`/`msRequestFullscreen`) disparado en un `useEffect`
cuando `showStereoAR` se activa. `mirror-fix` no reusa esa lógica (deliberadamente aislado del
resto de la app), así que necesita su propia llamada equivalente.

### 2.3 Sincronización de video — bug real encontrado en dispositivo

`VRLocalVideoOverlaySync.jsx` ya tenía un puente `postMessage` para play/pause/seek (Requerimiento
002), pero el mensaje `{action:'play'}` recibido en el panel remoto simplemente llamaba
`video.play()` sin manejar el resultado. El panel que **recibe** ese mensaje nunca tuvo un gesto
real del usuario dentro de **su propio** iframe (el tap ocurrió en el panel hermano) — los
navegadores bloquean `video.play()` programático sin gesto salvo que el video esté `muted`, así que
la promesa de `play()` se rechazaba en silencio y ese panel nunca arrancaba.

El video interno de `vr-karaoke-af` (overlay "karaoke") no tenía **ningún** puente de sync — sólo
se sincronizaba la rotación de cámara (Requerimiento 011). A diferencia de
`VRLocalVideoOverlaySync.jsx`, el `<video>` real de karaoke (`this._htmlVideo` en `VRKaraokeAf.js`)
se **recrea** cada vez que cambia la canción seleccionada (`loadVideo()`), así que el puente
necesita re-engancharse a la referencia nueva en cada cambio de canción, no una sola vez.

### 2.4 `mirror-fix` sigue siendo terreno de pruebas aislado

Igual que en el Requerimiento 011: los ajustes de este requerimiento van en los archivos de
`mirror-fix` (y, para karaoke, en la página `aframe-overlay-modules.html`/`.js` que monta el
componente real) — nunca en `VRKaraokeAf.js`/`VRNewSongAf.js` mismos, que son código de producción
reusado tal cual (ver skill `overlay-ar-sync-aframe`). Los campos `this._htmlVideo`,
`this._karaokeButtons` (`VRKaraokeAf.js`) y `this._clickableEls` (`VRNewSongAf.js`) se leen desde
`aframe-overlay-modules.js` sin modificar esos componentes; son campos por convención "privados"
(prefijo `_`), no API pública — si algún día se renombran, los puentes que los leen se degradan a
"sin sync"/"sin auto-click", no rompen nada.

## 3. Historias de usuario

- Como persona usando AR-SYNC con el celular en lentes de cartón VR, quiero ver un reticle fijo en
  el centro de cada panel que cambie a rojo y se achique al apuntar con la cabeza a un botón
  interactivo, y que dispare el click automáticamente al completar ese gesto — sin usar las manos
  y sin ver más de un puntero por panel, tanto en "video" como en "karaoke".
- Como persona usando la vista de prueba AR, quiero que la página entre en pantalla completa
  automáticamente al abrir "AR-TEST" o "AR-SYNC", para no perder espacio de pantalla con la barra
  de direcciones del navegador, y que vuelva al modo normal al cerrarla.
- Como persona probando el overlay "video" o "karaoke" de AR-SYNC, quiero que reproducir o pausar
  el video en un panel también reproduzca/pause el video del panel hermano sin que se escuchen las
  dos pistas de audio superpuestas, para que ambos ojos vean y escuchen lo mismo.

## 4. Alcance

### Incluido

- Reticle estático con auto-click por "fuse" (dwell) funcionando de punta a punta en "video" y
  "karaoke" (color rojo al detectar un elemento clickeable, achicado progresivo, click al
  completar), y presente por consistencia visual (sin nada que clickear todavía) en "cono".
- `fuseTimeout` configurable (`cursorFuseTimeout`, default 2500ms) en "video"/"cono".
- Pedir pantalla completa (Fullscreen API, mismos prefijos vendor que `App.jsx`) al abrir
  "AR-TEST"/"AR-SYNC" desde `ARTestMirrorButton.jsx`, y salir al cerrar — vía helper propio
  (`fullscreenHelper.js`).
- Corregir la sincronización de play/pause en `VRLocalVideoOverlaySync.jsx` (silenciar antes del
  `play()` remoto) y agregar el mismo mecanismo al video interno de "karaoke" (re-enganchado en
  cada cambio de canción).
- Criterio anti-eco (volumen 0.01 primario/izquierdo, 1.0 derecho) aplicado también al video de
  "karaoke", igual que ya tenía "video".

### No incluido

- Tocar `VRKaraokeAf.js`, `VRNewSongAf.js`, `VREvaluacionAf.js` ni ningún componente real de
  `src/views/A-frame`.
- Tocar el flujo real de producción (`App.jsx`, `ARSExperience.jsx`, `AROverlayController.jsx`,
  `appArs.jsx`, `ARStereoView.jsx` de producción).
- **Corrección de drift entre paneles** (re-seek periódico si `currentTime` se desincroniza más
  de X ms) — la diferencia de milisegundos que persiste en `currentTime` entre paneles es
  inherente a esta arquitectura (cada video reproduce de forma independiente tras su propio
  `play()`, sin corrección periódica) y no se resuelve en esta pasada; el fix de volumen anti-eco
  elimina el síntoma audible, no la causa de fondo.
- Diagnosticar la causa raíz de por qué el componente `cursor` nativo de A-Frame no disparaba sus
  propios eventos (se lo rodeó con un mecanismo propio en vez de arreglarlo — ver sección 5).
- Definir la estrategia de testing automatizado del frontend (Requerimiento 008, aparte).

## 5. Diseño técnico

### Cursor — corregido varias veces sobre la marcha (ver `problems_solutions.md` para el historial completo)

1. **`cursor="rayOrigin: mouse"` en un `<a-cursor>`.** Descartado: solo corrige el cálculo del
   raycasting, no reposiciona la entidad visual del cursor siguiendo el mouse.
2. **Puntero 2D en espacio de pantalla, siguiendo `mousemove`/`touchmove`.** Descartado tras
   probar en un celular real: en lentes de cartón no hay mouse ni mano libre para mover un
   puntero — el patrón correcto es un reticle estático apuntado con la cabeza.
3. **`<a-cursor>` nativo con gaze + `fuse: true`.** Alineación de cámara corregida (pitch inicial
   calculado hacia el video, ver más abajo), pero **el click nunca se disparaba** — ni con un
   click real ni esperando el fuse completo, a pesar de que `cursor.intersectedEl` identificaba
   correctamente el objetivo. Investigado en profundidad (ver `problems_solutions.md`) sin
   encontrar la causa exacta dentro del componente `cursor` de A-Frame 1.4.2 en este contexto.
4. **Mecanismo propio de hover/dwell/click (elegido, funcionando).** En vez de depender del
   pipeline de eventos del componente `cursor` (que no se pudo hacer disparar), un script propio
   en cada overlay:
   - **"video"/"cono":** lee `cursorEl.components['raycaster'].intersectedEls[0]` cada 50ms (el
     `raycaster` del `<a-cursor>` sí funciona correctamente) para saber qué está intersectando.
   - **"karaoke":** no hay `<a-cursor>`/`raycaster` porque los botones no son
     `.clickable`/`.raycastable` — se hace raycasting THREE.js directo desde el centro de cámara
     contra los meshes de `_karaokeButtons` (`VRKaraokeAf.js`) y `_clickableEls`
     (`VRNewSongAf.js`), reusando las mismas listas que esos componentes ya arman para su propio
     raycasting manual.
   - En ambos casos: si el objetivo cambia, arranca (o cancela) un temporizador de dwell; mientras
     cuenta, el reticle se pone rojo (`#ff3333`) y se achica progresivamente (`scale`/tamaño en
     px); al completar `FUSE_MS`, dispara un evento `click` real sobre el elemento (en "video",
     `dispatchEvent(new Event('click', ...))` sobre el mesh — es exactamente lo que ya escucha
     `vr-local-video`; en "karaoke", llama `btnEl._activateSelection(...)` o dispatch de
     `CustomEvent('click', ...)` — el mismo fallback que ya usa `VRKaraokeAf.js` internamente) y
     queda "trabado" en ese objetivo hasta que el usuario deja de mirarlo, para no re-disparar en
     loop mientras se sigue apuntando. Confirmado en navegador: en "video" el play arrancó solo al
     completar el dwell; en "karaoke", el botón "EVALUATE SONG" disparó
     `evaluateSong()` (log real de `VRKaraokeAf.js` en consola) de la misma forma.
5. **Pitch inicial hacia el video (alineación de cámara).** La cámara de "video" mira plano hacia
   -Z desde `position="0 1.8 0"` mientras el video está más arriba (`position` por defecto
   `[0, 5, -8]`) — en reposo el reticle no lo intersectaba. Se calcula un pitch inicial desde la
   posición real del video (`Math.atan2(position[1] - cameraY, -position[2])`, no un ángulo
   hardcodeado) y se asigna a `lookControls.pitchObject.rotation.x` al encontrar `look-controls`.
   La primera vez que se probó pareció "no tener efecto": se medía el resultado en el mismo tick
   de JS que la asignación, y `look-controls` recién copia esos valores a la cámara real en su
   siguiente `tick()` de render (no de forma síncrona) — repetido con una espera real, confirmado
   que el reticle intersecta el video en reposo, en ambos paneles.

### Pantalla completa

Sin cambios respecto al diseño original: helper propio (`fullscreenHelper.js`, mismo patrón que
`enterFullscreen()`/`exitFullscreen()` de `App.jsx`), invocado en un `useEffect` sobre el estado
`open` de `ARTestMirrorButton.jsx`.

**Limitación de verificación:** en el navegador controlado por la extensión Claude en Chrome
(usado para validar el resto de este requerimiento), `document.documentElement.requestFullscreen()`
falla con `TypeError: Permissions check failed` — confirmado llamando la API nativa directamente
desde la consola, así que es una restricción del entorno de automatización, no un bug del código
(que sigue el mismo patrón que `App.jsx`, ya en producción). **Pendiente de confirmación manual del
usuario en un navegador normal.**

### Sincronización de video

Mismo patrón en ambos casos: silenciar (`video.muted = true`) antes de llamar `video.play()` al
recibir un mensaje remoto, restaurar el volumen cuando la promesa de `play()` resuelve o rechaza.
Verificado directamente por consola: reproducir/pausar en un panel replica el estado y el
`currentTime` en el panel hermano, en ambas direcciones, tanto para "video" como para "karaoke".

Para "karaoke", el puente vive en `aframe-overlay-modules.js` (no en `VRKaraokeAf.js`): re-engancha
sus listeners cada vez que `this._htmlVideo` cambia de referencia (polling cada 300ms comparando
por identidad). En cada (re)enganche también fija el volumen según el panel
(`isPrimaryPanel`/`isRightPanel`, pasados como query string en el `src` del iframe desde
`VRKaraokeOverlaySync.jsx` — es una página real, no puede recibir props de React directamente).

**Nota sobre precisión de sincronía:** persiste una diferencia de milisegundos en `currentTime`
entre paneles — inherente a esta arquitectura sin corrección de drift (ver "No incluido").

## 6. Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/VRLocalVideoOverlaySync.jsx` | `<a-cursor>` sin el componente `cursor="fuse:..."` nativo (no disparaba); script propio de hover/dwell/click leyendo `raycaster.intersectedEls`; prop `cursorFuseTimeout` configurable; pitch inicial hacia el video; en el handler de `postMessage`, silenciar antes de `play()` remoto. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/VRConeOverlaySync.jsx` | Mismo `<a-cursor>` + script propio (sin nada que clickear todavía), prop `cursorFuseTimeout`. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/aframe-overlay-modules.html` | Puntero estático (CSS, centrado). |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/aframe-overlay-modules.js` | Puente de sincronización play/pause/seek para `this._htmlVideo`; volumen anti-eco vía `isPrimaryPanel`/`isRightPanel` de `location.search`; script propio de hover/dwell/click con raycasting THREE.js directo contra `_karaokeButtons`/`_clickableEls`. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/VRKaraokeOverlaySync.jsx` | Recibir `isPrimaryPanel`/`isRightPanel` y agregarlos como query string al `src` del iframe. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/fullscreenHelper.js` (nuevo) | `enterFullscreen()`/`exitFullscreen()` con prefijos vendor. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/ARTestMirrorButton.jsx` | `useEffect` sobre `open`: `enterFullscreen()`/`exitFullscreen()`; también en `goHome()`. |

## 7. Criterios de aceptación

- [ ] Al pulsar "AR-TEST" o "AR-SYNC", el navegador entra en pantalla completa automáticamente, y
      sale al cerrar. **Implementado, no verificable en el entorno de automatización usado**
      (bloquea la Fullscreen API por completo, confirmado independiente de este código).
      Pendiente de confirmación manual del usuario.
- [x] En "video" y "cono" hay un reticle estático en el centro de cada panel, idéntico en ambos.
      Confirmado en navegador.
- [x] El reticle de "video" intersecta el plano de video en reposo (sin rotar la cámara).
      Confirmado por raycasting real vía consola y visualmente en ambos paneles.
- [x] En "video", apuntar sostenido al video cambia el reticle a rojo, lo achica progresivamente,
      y al completar el dwell dispara play/pause automáticamente — sin click manual. Confirmado
      en navegador: el video pasó a `paused: false` solo con el dwell.
- [x] En "karaoke", el mismo mecanismo (un único puntero, sin duplicar) dispara el botón
      "EVALUATE SONG" (y cualquier botón de `_karaokeButtons`/`_clickableEls`) al completar el
      dwell. Confirmado en navegador: log real `Evaluate song requested for: ...` de
      `VRKaraokeAf.js` disparado solo por el dwell.
- [x] El click directo (sin esperar el fuse) en "video"/"karaoke" también sigue funcionando —
      selección de canciones y controles no perdieron su interacción manual existente.
- [x] Reproducir/pausar el video en un panel (tanto "video" como "karaoke") replica el estado y el
      `currentTime` en el panel hermano, en ambas direcciones. Confirmado por consola.
- [x] El video de "karaoke" no se escucha duplicado (eco): volumen 0.01 primario/izquierdo, 1.0
      derecho. Confirmado por consola.
- [x] No se modificó `VRKaraokeAf.js`, `VRNewSongAf.js`, `VREvaluacionAf.js` ni ningún archivo del
      flujo real de producción.
- [x] `npm run build` y `npm run check:i18n` (en `ApprendeVr/frontend`) terminan sin errores.

## 8. Referencias

- Requerimiento 011: reuso de componentes A-Frame reales como overlay de AR-SYNC (karaoke) —
  `ApprendeVr/Documentation/Requerimientos/2-Developing/011-estandarizar-overlay-aframe-mirror-fix/`.
- Skill `overlay-ar-sync-aframe`: contrato de overlays sincronizables de AR-SYNC —
  `.agents/skills/overlay-ar-sync-aframe/SKILL.md`.
- Requerimiento 002 (descartado): origen de `mirror-fix` y del puente de sync de video —
  `ApprendeVr/Documentation/Requerimientos/4-Rejected/Discarded/002-boton-ar-y-fix-espejo-overlay-estereo/`.
- Patrón de referencia para pantalla completa: `enterFullscreen()` en `ApprendeVr/frontend/src/App.jsx`.
