# Requerimiento 012 — Checklist de ejecución

## Fase 1 — Cursor (corregida dos veces, ver `problems_solutions.md`)

- [x] ~~Cursor `rayOrigin: mouse`~~ — descartado: no reposiciona la entidad visual.
- [x] ~~Puntero 2D siguiendo `mousemove`/`touchmove`~~ — descartado tras prueba en dispositivo
      real: debe ser estático, no seguir el touch.
- [x] Restaurar `<a-cursor>` gaze + `fuse: true, fuseTimeout: 1500` (sin `rayOrigin`) en
      `VRLocalVideoOverlaySync.jsx`, visible (`opacity: 0.8`).
- [x] Agregar el mismo `<a-cursor>` gaze + fuse a `VRConeOverlaySync.jsx`.
- [x] Reemplazar el puntero de `aframe-overlay-modules.html` (karaoke) por un div CSS estático
      centrado (sin seguimiento de eventos) — sin `<a-cursor>` real (sus botones no son
      `.clickable`/`.raycastable`, ver requerimiento.md sección 4 "No incluido").
- [x] Confirmar en navegador: reticle estático y visualmente idéntico en ambos paneles de
      AR-SYNC (video, cono, karaoke), sin necesitar sincronizarlo por separado.
- [x] Diagnosticar por qué el fuse-click no disparaba en "video": confirmado geométricamente
      (raycasting manual por consola) que el reticle no intersecta el plano de video en la
      orientación de reposo de la cámara (~22° de desalineo) — mecanismo de cursor correcto,
      problema de layout preexistente, no de este requerimiento. Documentado como pendiente de
      decisión, no corregido.

## Fase 2 — Pantalla completa

- [x] Crear `fullscreenHelper.js` en `mirror-fix/` con `enterFullscreen()`/`exitFullscreen()`.
- [x] `ARTestMirrorButton.jsx`: `useEffect` sobre `open` + `goHome()`.
- [ ] Confirmar en navegador real (no automatizado) que la barra de direcciones desaparece/vuelve.
      **No verificable en el entorno de automatización usado** (bloquea la Fullscreen API por
      completo) — pendiente de confirmación manual del usuario.

## Fase 3 — Sincronización de video (agregada tras reporte del usuario)

- [x] Diagnosticar por qué "video" no sincronizaba play: confirmado que `video.play()` disparado
      por un mensaje remoto (sin gesto real en ese iframe) es bloqueado en silencio por la
      política de autoplay del navegador.
- [x] Corregir `VRLocalVideoOverlaySync.jsx`: silenciar antes de `play()` remoto, restaurar
      volumen al resolver/rechazar la promesa.
- [x] Confirmar por consola: `paused`/`currentTime` se replican entre paneles en ambas
      direcciones (izquierda→derecha y derecha→izquierda).
- [x] Agregar el mismo mecanismo a `aframe-overlay-modules.js` (karaoke), re-enganchando a
      `this._htmlVideo` (campo de `VRKaraokeAf.js`) en cada cambio de canción.
- [x] Confirmar por consola: mismo comportamiento que "video" — `currentTime` con diferencia
      menor a 0.01s entre paneles tras play/pause en cualquiera de los dos.
- [x] Confirmar sin errores de consola en ninguno de los dos casos.
- [x] Corregir el eco reportado tras sincronizar "karaoke": pasar `isPrimaryPanel`/`isRightPanel`
      como query string en el `src` del iframe (`VRKaraokeOverlaySync.jsx`) y fijar
      `video.volume` en `aframe-overlay-modules.js` con el mismo criterio que
      `VRLocalVideoOverlaySync.jsx` (0.01 primario/izquierdo, 1.0 derecho).
- [x] Confirmar por consola: `video.volume` correcto en cada panel tras activar "karaoke".
- [x] Documentar que la diferencia de milisegundos en `currentTime` es esperable con esta
      arquitectura (sin corrección de drift) y no se corrige en esta pasada — el fix de volumen
      resuelve el síntoma audible (eco), no la causa de fondo.

## Fase 3.5 — fuseTimeout configurable (pedido del usuario)

- [x] Agregar prop `cursorFuseTimeout` (default `2500`) a `VRLocalVideoOverlaySync.jsx` y
      `VRConeOverlaySync.jsx`, usada en `cursor="fuse: true; fuseTimeout: ..."` y en la duración de
      la animación `animation__fusing`.
- [x] Confirmar `npm run build` sin errores.
- [ ] **No resuelto:** el usuario reportó que el fuse-click sigue sin dispararse en "video". Se
      reconfirmó el diagnóstico ya documentado (cámara no mira al video en reposo, ver
      `problems_solutions.md`) — hacer el timeout configurable no cambia esto, porque el fuse
      nunca arranca a contar si el raycaster no intersecta nada. Se intentó fijar un pitch
      inicial por código sin éxito visible; queda pendiente de una sesión dedicada o de decisión
      del usuario sobre cómo alinear cámara/contenido.

## Fase 4 — Validación final

- [x] Correr `npm run build` en `ApprendeVr/frontend` y confirmar que termina sin errores
      (repetido tras cada tanda de cambios).
- [x] Correr `npm run check:i18n` sin alertas nuevas.
- [x] Confirmar que no se modificó ningún archivo de producción ni los componentes reales de
      `src/views/A-frame`.
- [ ] Revisar con el usuario: confirmación manual de pantalla completa, y decidir si se abordan
      los dos puntos documentados como "No incluido" (fuse-click de karaoke, alineación de cámara
      de "video") en este mismo requerimiento o en uno nuevo.
