# Requerimiento 012 — Checklist de ejecución

## Fase 1 — Cursor estático (varias correcciones, ver `problems_solutions.md`)

- [x] ~~Cursor `rayOrigin: mouse`~~ — descartado: no reposiciona la entidad visual.
- [x] ~~Puntero 2D siguiendo `mousemove`/`touchmove`~~ — descartado tras prueba en dispositivo
      real: debe ser estático, no seguir el touch.
- [x] Restaurar `<a-cursor>` gaze en `VRLocalVideoOverlaySync.jsx` y `VRConeOverlaySync.jsx`.
- [x] Reemplazar el puntero de `aframe-overlay-modules.html` (karaoke) por un div CSS estático
      centrado.
- [x] Confirmar en navegador: reticle estático e idéntico en ambos paneles de AR-SYNC.
- [x] Diagnosticar por qué el fuse-click no disparaba en "video": confirmado geométricamente que
      el reticle no intersecta el plano en reposo (~22° de desalineo).

## Fase 2 — Pantalla completa

- [x] Crear `fullscreenHelper.js` con `enterFullscreen()`/`exitFullscreen()`.
- [x] `ARTestMirrorButton.jsx`: `useEffect` sobre `open` + `goHome()`.
- [ ] Confirmar en navegador real (no automatizado) que la barra de direcciones desaparece/vuelve.
      **No verificable en el entorno de automatización usado** — pendiente de confirmación manual
      del usuario.

## Fase 3 — Sincronización de video

- [x] Diagnosticar y corregir por qué "video" no sincronizaba play (política de autoplay del
      navegador bloqueando `play()` sin gesto real en el panel receptor) — silenciar antes de
      `play()` remoto.
- [x] Agregar el mismo mecanismo a `aframe-overlay-modules.js` (karaoke), re-enganchando a
      `this._htmlVideo` en cada cambio de canción.
- [x] Confirmar por consola: `paused`/`currentTime` se replican entre paneles en ambas
      direcciones, tanto en "video" como en "karaoke".
- [x] Corregir el eco reportado tras sincronizar "karaoke": volumen 0.01 primario/izquierdo, 1.0
      derecho, vía `isPrimaryPanel`/`isRightPanel` como query string.
- [x] Documentar que la diferencia de milisegundos en `currentTime` es esperable con esta
      arquitectura (sin corrección de drift) y no se corrige en esta pasada.

## Fase 4 — Alineación del reticle + fuseTimeout configurable

- [x] Agregar prop `cursorFuseTimeout` (default `2500`) a `VRLocalVideoOverlaySync.jsx` y
      `VRConeOverlaySync.jsx`.
- [x] Calcular un pitch inicial hacia el video (`Math.atan2`) y asignarlo a
      `lookControls.pitchObject.rotation.x` al encontrar `look-controls`. Confirmado por consola
      (con una espera real al siguiente frame de render) que el reticle intersecta el video en
      reposo en ambos paneles.

## Fase 5 — Hallazgo tardío y mecanismo propio de click (reemplaza el componente `cursor` nativo)

- [x] **Hallazgo tardío** — un `[x]` anterior de la Fase 1 afirmaba que el fuse-click "funciona
      una vez el reticle intersecta el plano"; nunca se había probado un click real completo. Al
      probarlo de verdad (con el reticle ya alineado), ni un click real ni el fuse timeout
      disparaban el evento `click` sobre el elemento — el componente `cursor` de A-Frame 1.4.2 no
      emite sus propios eventos en este contexto, causa no identificada tras investigación
      extensa. Corregido el `[x]` falso.
- [x] Implementar un mecanismo propio de hover/dwell/click en `VRLocalVideoOverlaySync.jsx` y
      `VRConeOverlaySync.jsx`, leyendo `raycaster.intersectedEls` (que sí funciona) y disparando
      un evento `click` real sobre el elemento — reemplaza el componente `cursor` nativo.
- [x] Confirmar en navegador: en "video", el dwell sostenido sobre el video dispara play/pause
      automáticamente (`paused: false` confirmado por consola, sin click manual).
- [x] Implementar el mismo mecanismo para "karaoke" en `aframe-overlay-modules.js`, con
      raycasting THREE.js directo (no hay `<a-cursor>`/`.clickable` ahí) contra
      `_karaokeButtons`/`_clickableEls`.
- [x] Confirmar en navegador: el dwell sostenido sobre "EVALUATE SONG" disparó
      `evaluateSong()` (log real de `VRKaraokeAf.js` en consola), un único puntero, sin click
      manual.
- [x] Confirmar que el click manual directo sigue funcionando en ambos overlays (no se rompió al
      agregar el mecanismo de dwell).
- [x] Confirmar sin errores de consola en ninguno de los casos.

## Fase 5.5 — Bug de doble activación / antirebote (reportado tras uso real)

- [x] Diagnosticar el reporte del usuario ("el botón de play se desactiva solo, como doble
      click"): en karaoke, el objetivo del dwell se identificaba por `mesh.uuid` de un sub-mesh
      individual, no por el botón lógico completo — un mismo botón con varios sub-meshes (fondo +
      texto) podía leerse como "cambió de objetivo" entre ticks y re-disparar.
- [x] Corregir agrupando por el elemento (`btnEl`/`entry.el`) en vez de por `mesh.uuid`, en
      `aframe-overlay-modules.js`.
- [x] Agregar un cooldown explícito (`COOLDOWN_MS = 600`) tras cualquier activación, en los tres
      overlays (pedido explícito del usuario: "agrega un delay de antirebote").
- [x] Confirmar por consola: pausar por click real sincroniza correctamente entre paneles sin
      rebote de vuelta a "playing".
- [x] Usuario confirmó mejora ("ya funciona mejor") tras el fix.
- [ ] Seguimiento abierto: un click de "play" puntual no registró intersección en una prueba
      posterior (sin errores) — no se confirmó si es el mismo bug u otra causa (posible
      acumulación de meshes que loguea `VRKaraokeAf.js` internamente, `buildMeshMap: mapped N
      meshes...` creciendo con el tiempo — no investigado a fondo, es código de producción fuera
      de este requerimiento).

## Fase 6 — Validación final

- [x] Correr `npm run build` en `ApprendeVr/frontend` y confirmar que termina sin errores
      (repetido tras cada tanda de cambios).
- [x] Correr `npm run check:i18n` sin alertas nuevas.
- [x] Confirmar que no se modificó ningún archivo de producción ni los componentes reales de
      `src/views/A-frame`.
- [ ] Pendiente: confirmación manual del usuario de pantalla completa en un navegador real.
