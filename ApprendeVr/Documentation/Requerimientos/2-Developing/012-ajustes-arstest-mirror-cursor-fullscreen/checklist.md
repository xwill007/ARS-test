# Requerimiento 012 — Checklist de ejecución

## Fase 1 — Cursor visible

- [ ] Agregar `cursor="rayOrigin: mouse"` al `<a-cursor id="main-cursor">` de
      `VRLocalVideoOverlaySync.jsx`.
- [ ] Agregar un `<a-cursor>` (mismo estilo: geometría ring, `raycaster="objects: .clickable,
      .raycastable"`, `cursor="rayOrigin: mouse"`) dentro de `<a-camera>` en
      `VRConeOverlaySync.jsx`.
- [ ] Agregar el mismo `<a-cursor>` dentro de `<a-camera>` en `aframe-overlay-modules.html`
      (karaoke) — sin tocar `VRKaraokeAf.js`/`VRNewSongAf.js`.
- [ ] Confirmar en navegador: el reticle sigue el mouse en tiempo real en los tres overlays, y
      seleccionar una canción en karaoke sigue funcionando igual que antes.

## Fase 2 — Pantalla completa

- [ ] Crear `fullscreenHelper.js` en `mirror-fix/` con `enterFullscreen()`/`exitFullscreen()`
      (mismos prefijos vendor que `App.jsx`).
- [ ] Llamar `enterFullscreen()` en `ARTestMirrorButton.jsx` al abrir "AR-TEST" (`setOpen('mirror')`)
      y "AR-SYNC" (`setOpen('sync')`).
- [ ] Llamar `exitFullscreen()` al cerrar (`onClose` de ambas vistas) y al pulsar "← Back to home".
- [ ] Confirmar en navegador: al abrir cualquiera de las dos vistas la barra de direcciones
      desaparece (pantalla completa); al cerrar, vuelve el modo normal.

## Fase 3 — Validación final

- [ ] Correr `npm run build` en `ApprendeVr/frontend` y confirmar que termina sin errores.
- [ ] Confirmar que no se modificó ningún archivo de producción ni los componentes reales de
      `src/views/A-frame`.
- [ ] Revisar con el usuario si los dos puntos quedaron resueltos antes de sumar los cambios
      adicionales que mencionó.
