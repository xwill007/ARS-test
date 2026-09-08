# Requerimiento 012 — Ajustes en ARStest mirror-fix: cursor estático, pantalla completa y sync de video

## 1. Objetivo

Corregir problemas de usabilidad en `src/views/ARs/ARScomponents/ARStest/mirror-fix/`
(`artest-mirror.html`, overlays de prueba "AR-TEST" y "AR-SYNC"), encontrados en dos rondas de
validación (primero en navegador de escritorio, después en un celular real dentro de lentes de
cartón VR — el caso de uso real de esta vista):

1. No hay un puntero/reticle visible y **estático en el centro de cada panel** que indique hacia
   dónde se está apuntando con la cabeza/dispositivo, con click automático ("fuse"/dwell) al
   apuntar a un elemento clickeable — el patrón estándar de interacción gaze-based en VR de
   cartón, donde no hay mouse ni mano libre para mover un puntero.
2. La vista no pide pantalla completa, así que la barra de direcciones del navegador queda
   visible y resta espacio útil.
3. La sincronización por `postMessage` entre los paneles izquierdo/derecho de AR-SYNC (ya usada
   para cámara/voz en "video" y "cono") no propagaba correctamente el **play** del video —
   reproducir en un panel no iniciaba el otro — y el video interno de karaoke (Requerimiento 011)
   directamente no tenía ningún tipo de sincronización.

Este es un requerimiento vivo: se fue corrigiendo el diseño técnico sobre la marcha a medida que
la validación en dispositivo real reveló que el enfoque inicial (puntero 2D siguiendo el
mouse/touch) no era el correcto para el caso de uso real — ver sección 5 y `problems_solutions.md`
para el historial de esa corrección.

## 2. Antecedentes y estado actual

### 2.1 Cursor/raycaster — estado real por overlay (verificado en código y en navegador)

- **`VRLocalVideoOverlaySync.jsx`** (overlay "video"): declaraba un `<a-cursor id="main-cursor">`
  dentro de `<a-camera>` (gaze por defecto, `fuse: true`, `fuseTimeout: 1500`) — el mecanismo base
  ya estaba bien planteado desde antes de este requerimiento.
- **`VRConeOverlaySync.jsx`** (overlay "cono"): no tenía ningún `<a-cursor>` ni elementos
  `.clickable`/`.raycastable` — overlay puramente visual.
- **`aframe-overlay-modules.html`** (overlay "karaoke", Requerimiento 011): tampoco tenía
  `<a-cursor>`. `VRKaraokeAf.js`/`VRNewSongAf.js` (componentes reales de
  `src/views/A-frame/components`) implementan su **propio** raycasting manual leyendo la posición
  real del mouse/touch sobre `sceneEl.canvas` (`vrPointerRaycast.util.js` → `getPointerNDC`),
  independiente de cualquier `<a-cursor>` de A-Frame, y sus botones **no** tienen las clases
  `.clickable`/`.raycastable` que el raycaster de un `<a-cursor>` necesita para intersectarlos.

**Hallazgo de layout (no resuelto en esta pasada, ver sección 5):** en `VRLocalVideoOverlaySync.jsx`,
la cámara está en `position="0 1.8 0"` mirando plano hacia -Z, mientras el plano de video está en
`[0, 5, -8]` — el reticle (centro de pantalla, por definición) **no cae sobre el video** en la
orientación de reposo; hace falta mirar ~22° hacia arriba (confirmado geométricamente por
raycasting manual) para que el "fuse" tenga algo que intersectar. El mecanismo de cursor en sí
(raycaster, `fuse`, `.clickable`) está correctamente configurado y funciona una vez apuntado —
confirmado haciendo drag de cámara hasta alinear el reticle con el plano.

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
la promesa de `play()` se rechazaba en silencio y ese panel nunca arrancaba. Confirmado
reproduciendo el escenario exacto vía consola (play remoto con y sin el fix) — ver
`problems_solutions.md`.

El video interno de `vr-karaoke-af` (overlay "karaoke") no tenía **ningún** puente de sync — sólo
se sincronizaba la rotación de cámara (Requerimiento 011). A diferencia de
`VRLocalVideoOverlaySync.jsx`, el `<video>` real de karaoke (`this._htmlVideo` en `VRKaraokeAf.js`)
se **recrea** cada vez que cambia la canción seleccionada (`loadVideo()`), así que un puente para
este caso necesita re-engancharse a la referencia nueva en cada cambio de canción, no una sola vez.

### 2.4 `mirror-fix` sigue siendo terreno de pruebas aislado

Igual que en el Requerimiento 011: los ajustes de este requerimiento van en los archivos de
`mirror-fix` (y, para karaoke, en la página `aframe-overlay-modules.html`/`.js` que monta el
componente real) — nunca en `VRKaraokeAf.js`/`VRNewSongAf.js` mismos, que son código de producción
reusado tal cual (ver skill `overlay-ar-sync-aframe`). El campo `this._htmlVideo` de
`VRKaraokeAf.js` se lee desde `aframe-overlay-modules.js` (no se modifica el componente); es un
campo por convención "privado" (prefijo `_`), no una API pública — si `VRKaraokeAf.js` lo renombra
en el futuro, este puente deja de encontrar el video y se degrada a "sin sync", no rompe nada.

## 3. Historias de usuario

- Como persona usando AR-SYNC con el celular en lentes de cartón VR, quiero ver un reticle fijo en
  el centro de cada panel que se active automáticamente (sin tocar la pantalla) al apuntar con la
  cabeza a un elemento interactivo por un momento, para poder interactuar sin usar las manos.
- Como persona usando la vista de prueba AR, quiero que la página entre en pantalla completa
  automáticamente al abrir "AR-TEST" o "AR-SYNC", para no perder espacio de pantalla con la barra
  de direcciones del navegador, y que vuelva al modo normal al cerrarla.
- Como persona probando el overlay "video" o "karaoke" de AR-SYNC, quiero que reproducir o pausar
  el video en un panel también reproduzca/pause el video del panel hermano, para que ambos ojos
  vean lo mismo en todo momento.

## 4. Alcance

### Incluido

- Reticle **estático** en el centro de cada panel (gaze-based, no sigue mouse/touch) en las tres
  escenas A-Frame de `mirror-fix`: `<a-cursor>` nativo de A-Frame (`fuse: true`, `fuseTimeout:
  1500`, sin `rayOrigin: mouse`) en "video" y "cono" — donde ya existe o se agrega de forma
  consistente —, y un div CSS estático centrado en "karaoke" (sin `<a-cursor>` real, ver 2.1: sus
  botones no son `.clickable`/`.raycastable`, así que el fuse-click automático no está disponible
  ahí en esta iteración — ver "No incluido").
- Pedir pantalla completa (Fullscreen API, mismos prefijos vendor que `App.jsx`) al abrir
  "AR-TEST"/"AR-SYNC" desde `ARTestMirrorButton.jsx`, y salir al cerrar — vía helper propio
  (`fullscreenHelper.js`) para no duplicar los prefijos vendor.
- Corregir la sincronización de play/pause en `VRLocalVideoOverlaySync.jsx`: silenciar el video
  antes de un `play()` disparado por un mensaje remoto (sin gesto real en ese iframe) y restaurar
  el volumen apenas resuelve, para que el navegador no bloquee la reproducción.
- Agregar el mismo mecanismo de sincronización de play/pause/seek al video interno del overlay
  "karaoke" (`this._htmlVideo` de `VRKaraokeAf.js`, re-enganchado en cada cambio de canción),
  reusando el mismo canal `postMessage` (`source: 'ars-sync-test'`) que ya usa la sincronización de
  rotación de cámara de ese overlay.
- Aplicar al video de "karaoke" el mismo criterio anti-eco que ya usa `VRLocalVideoOverlaySync.jsx`
  para el suyo: volumen muy bajo (0.01) en el panel primario/izquierdo, volumen completo (1.0) en
  el derecho — ambos paneles de AR-SYNC suenan por el mismo dispositivo físico, así que sin esto se
  escuchan las dos pistas superpuestas (reportado por el usuario tras la corrección del play-sync:
  antes, al no sincronizar, casi nunca sonaban las dos pistas a la vez; al sincronizar, sí).

### No incluido

- Tocar `VRKaraokeAf.js`, `VRNewSongAf.js`, `VREvaluacionAf.js` ni ningún componente real de
  `src/views/A-frame`.
- Tocar el flujo real de producción (`App.jsx`, `ARSExperience.jsx`, `AROverlayController.jsx`,
  `appArs.jsx`, `ARStereoView.jsx` de producción).
- **Click automático por gaze en el overlay "karaoke"**: requeriría o bien marcar los botones de
  `VRKaraokeAf.js` con `.clickable`/`.raycastable` (tocar el componente real, descartado), o bien
  un puente de raycasting manual propio en `aframe-overlay-modules.js` que reutilice
  `_karaokeButtons` (otro campo "privado" de `VRKaraokeAf.js`) para sintetizar el click — quedó
  identificado pero no implementado en esta pasada; requiere decisión aparte por el acoplamiento
  extra a internals del componente.
- **Alinear la cámara de "video" para que el reticle caiga sobre el plano en reposo** (el hallazgo
  de layout de 2.1: hace falta mirar ~22° arriba). Es un cambio de encuadre/diseño visual, no un
  bug de cursor — queda pendiente de decisión del usuario (ver `problems_solutions.md`).
- **Corrección de drift entre paneles** (re-seek periódico si `currentTime` se desincroniza más
  de X ms) — la diferencia de milisegundos reportada por el usuario es inherente a esta
  arquitectura (sin corrección periódica) y no se resuelve en esta pasada; el fix de volumen
  (arriba) elimina el síntoma audible (eco) sin corregir la causa de fondo.
- Definir la estrategia de testing automatizado del frontend (Requerimiento 008, aparte).

## 5. Diseño técnico

### Cursor — corregido dos veces sobre la marcha (ver `problems_solutions.md` para el detalle completo)

1. **Primer intento: `cursor="rayOrigin: mouse"` en un `<a-cursor>`.** Descartado al probarlo: ese
   atributo solo corrige el cálculo del raycasting, no reposiciona la entidad visual del cursor
   siguiendo el mouse por la pantalla.
2. **Segundo intento: puntero 2D en espacio de pantalla, siguiendo `mousemove`/`touchmove`.**
   Descartado tras probar en un celular real: en lentes de cartón no hay mouse ni mano libre para
   mover un puntero — el patrón de interacción correcto es un reticle **estático** en el centro,
   apuntado con la cabeza (la rotación de cámara ya está sincronizada entre paneles), con
   click automático por "fuse" (dwell).
3. **Diseño final (elegido):** volver al `<a-cursor>` nativo de A-Frame con gaze por defecto
   (sin `rayOrigin`) y `fuse: true` en "video" (ya lo tenía, solo se restauró) y "cono" (se agregó
   por consistencia, aunque no tiene nada clickeable todavía). Al ser hijo de la cámara en
   `position="0 0 -1"`, el reticle queda automáticamente estático y en el centro de **cada** panel
   sin necesitar sincronizarlo por separado — la sincronización de rotación de cámara que ya existe
   (Requerimiento 002/011) es suficiente para que ambos paneles apunten al mismo lugar. En
   "karaoke" se dejó un div CSS estático centrado (sin `<a-cursor>`, ver "No incluido" — sus
   botones no son intersectables por el raycaster de A-Frame).

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
recibir un mensaje remoto, restaurar el volumen (`video.muted = wasMuted`) cuando la promesa de
`play()` resuelve o rechaza. Verificado directamente por consola (no por UI, para evitar la
incertidumbre de si un click de automatización cuenta como gesto real): reproducir/pausar en un
panel replica el estado y el `currentTime` en el panel hermano, en ambas direcciones, tanto para
"video" como para "karaoke".

Para "karaoke", el puente vive en `aframe-overlay-modules.js` (no en `VRKaraokeAf.js`): re-engancha
sus listeners cada vez que `this._htmlVideo` cambia de referencia (polling cada 300ms comparando
por identidad), porque `loadVideo()` recrea el elemento `<video>` en cada cambio de canción. En
cada (re)enganche también fija el volumen según el panel (`isPrimaryPanel`/`isRightPanel`, leídos
de `location.search` — ver más abajo).

**Anti-eco (mismo criterio que `VRLocalVideoOverlaySync.jsx`):** `VRKaraokeOverlaySync.jsx` recibe
`isPrimaryPanel`/`isRightPanel` como props de `SyncStereoTestView.jsx` (igual que los otros dos
overlays) y las pasa como **query string** en el `src` del iframe
(`aframe-overlay-modules.html?isPrimaryPanel=...&isRightPanel=...`) — es una página real, no puede
recibir props de React directamente. `aframe-overlay-modules.js` las lee con
`URLSearchParams(location.search)` y fija `video.volume` (0.01 primario/izquierdo, 1.0 derecho,
0.05 por defecto) cada vez que engancha un video nuevo.

**Nota sobre precisión de sincronía:** el usuario reportó una diferencia de milisegundos en
`currentTime` entre paneles incluso después del fix. Es esperable con esta arquitectura (cada
video reproduce de forma independiente tras su propio `play()`, sin corrección periódica de
drift) — el mismo comportamiento que ya tenía "video" antes de este requerimiento, solo que ahora
se nota porque ambas pistas de karaoke son audibles a la vez sin el fix de volumen. No se
implementó corrección de drift (re-seek periódico) en esta pasada — ver "No incluido".

## 6. Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/VRLocalVideoOverlaySync.jsx` | Restaurar `<a-cursor>` visible con gaze + `fuse` (revertir los intentos de puntero 2D/`rayOrigin: mouse`); prop `cursorFuseTimeout` (default 2500ms) configurable; en el handler de `postMessage`, silenciar antes de `play()` remoto y restaurar el volumen al resolver/rechazar. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/VRConeOverlaySync.jsx` | Agregar `<a-cursor>` con gaze + `fuse` (mismo estilo que "video"), prop `cursorFuseTimeout` configurable; revertir el puntero 2D. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/aframe-overlay-modules.html` | Puntero estático (CSS, centrado, sin seguimiento de mouse/touch) en vez del div que seguía `mousemove`/`touchmove`. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/aframe-overlay-modules.js` | Agregar puente de sincronización play/pause/seek para `this._htmlVideo` de `vr-karaoke-af` (re-enganchado por cambio de canción), mismo canal `postMessage` que la sincronización de cámara existente; leer `isPrimaryPanel`/`isRightPanel` de `location.search` y fijar el volumen del video (anti-eco). |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/VRKaraokeOverlaySync.jsx` | Recibir `isPrimaryPanel`/`isRightPanel` (ya se los pasa `SyncStereoTestView.jsx`) y agregarlos como query string al `src` del iframe. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/fullscreenHelper.js` (nuevo) | `enterFullscreen()`/`exitFullscreen()` con prefijos vendor, reusable desde `ARTestMirrorButton.jsx`. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/ARTestMirrorButton.jsx` | `useEffect` sobre `open`: `enterFullscreen()` al abrir "AR-TEST"/"AR-SYNC", `exitFullscreen()` en el cleanup; también en `goHome()`. |

## 7. Criterios de aceptación

- [ ] Al pulsar "AR-TEST" o "AR-SYNC", el navegador entra en pantalla completa automáticamente.
      **Implementado, no verificable en el entorno de automatización usado** (bloquea la
      Fullscreen API por completo, confirmado independiente de este código). Pendiente de
      confirmación manual del usuario.
- [ ] Al cerrar esa vista, el navegador sale de pantalla completa. Mismo estado que el ítem
      anterior.
- [x] En "video" y "cono" hay un reticle estático en el centro de cada panel, idéntico en ambos
      (sin necesitar sincronizarlo aparte — es hijo local de cada cámara). Confirmado en
      navegador.
- [x] En "video", apuntar el reticle al plano del video y esperar el "fuse" (o hacer click)
      activa play/pause — confirmado que el mecanismo funciona una vez el reticle intersecta el
      plano (ver hallazgo de layout en 2.1: en reposo no lo intersecta; no resuelto en esta
      pasada, ver "No incluido").
- [x] En "karaoke" hay un puntero estático centrado (sin fuse-click automático — ver "No
      incluido"); seleccionar una canción con click directo sigue funcionando igual que antes
      (raycasting manual de `VRKaraokeAf.js`, sin cambios). Confirmado en navegador.
- [x] Reproducir/pausar el video en un panel de "video" replica el estado en el panel hermano.
      Confirmado por consola: `paused` y `currentTime` iguales en ambos paneles tras play/pause
      en cualquiera de los dos.
- [x] Reproducir/pausar el video en un panel de "karaoke" replica el estado en el panel hermano.
      Confirmado por consola de la misma forma (`currentTime` con diferencia < 0.01s entre
      paneles).
- [x] El video de "karaoke" no se escucha duplicado (eco) entre paneles: panel primario/izquierdo
      a volumen 0.01, derecho a volumen 1.0 — mismo criterio que "video". Confirmado por consola
      (`video.volume` correcto en cada iframe tras leer `isPrimaryPanel`/`isRightPanel` de la URL).
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
