# Requerimiento 011 — Checklist de ejecución

## Fase 1 — Preparación

- [x] Confirmar en el código actual que `VRKaraokeAf.js` importa `VRNewSongAf.js`, y que hace su
      propio raycasting manual sobre `sceneEl.canvas` (no depende de `<a-cursor>`, solo de que
      `sceneEl.camera` exista) — confirmado leyendo `VRKaraokeAf.js`.
- [x] Confirmar la ruta relativa exacta desde
      `src/views/ARs/ARScomponents/ARStest/mirror-fix/` hacia
      `src/views/A-frame/components/VRKaraokeAf/VRKaraokeAf.js` —
      `../../../../A-frame/components/VRKaraokeAf/VRKaraokeAf.js`.
- [x] Revisar `SyncStereoTestView.jsx`/`SyncConfigMenu.jsx`/`VRLocalVideoOverlaySync.jsx`/
      `VRConeOverlaySync.jsx` para entender el contrato de un overlay sincronizable de AR-SYNC:
      `SYNCABLE_OVERLAYS` (clave → componente `forwardRef` que expone un `<iframe>`),
      `OVERLAY_OPTIONS` (clave → label del checkbox), y el puente `postMessage` de rotación de
      cámara (`source: 'ars-sync-test'`, `action: 'camera-rotation'`, escribe directo en
      `yawObject`/`pitchObject` de `look-controls`).

## Fase 2 — Nuevo entry point Vite

- [x] Crear `aframe-overlay-modules.html`: carga `/libs/aframe.min.js`, declara `<a-scene>` con
      `vr-karaoke-af` y `vr-new-song-af`, y una `<a-camera>` con `look-controls` **habilitado**
      (sin deshabilitar, para que reaccione a giroscopio/acelerómetro en móvil).
- [x] Crear `aframe-overlay-modules.js`: `import` real de `VRKaraokeAf.js` + puente de
      sincronización de rotación de cámara por `postMessage` (mismo patrón que
      `VRLocalVideoOverlaySync.jsx`/`VRConeOverlaySync.jsx`, escrito como código normal ya que esta
      página es un archivo real, no un string en `srcDoc`).
- [x] Registrar `aframe-overlay-modules.html` en `vite.config.js` → `build.rollupOptions.input`.
- [x] Abrir el nuevo `.html` directamente en el navegador y confirmar que la escena carga sin
      errores de consola (lista de canciones, reproductor, panel "agregar canción" visibles).

## Fase 3 — Integrar como overlay de AR-SYNC

- [x] Crear `VRKaraokeOverlaySync.jsx`: monta `aframe-overlay-modules.html` en un
      `<iframe src="...">` real (no `srcDoc`) con `React.forwardRef`.
- [x] Agregar `karaoke: VRKaraokeOverlaySync` a `SYNCABLE_OVERLAYS` en `SyncStereoTestView.jsx`.
- [x] Agregar `{ key: 'karaoke', labelKey: 'syncConfig.overlay.karaoke' }` a `OVERLAY_OPTIONS` en
      `SyncConfigMenu.jsx`.
- [x] Agregar la clave `syncConfig.overlay.karaoke` en `src/locales/{es,en,br}.json`.
- [x] ~~Agregar botón nuevo en `ARTestMirrorButton.jsx`~~ — **descartado**: la integración correcta
      es dentro del menú de overlays de AR-SYNC, no un botón/vista nueva (corrección del usuario,
      ver `problems_solutions.md`). `ARTestMirrorButton.jsx` no se modifica.

## Fase 4 — Validación en navegador

- [x] Confirmar que "Karaoke" aparece como checkbox en la pestaña "Overlays" del menú de AR-SYNC,
      junto a "Video local" y "Cono de palabras".
- [x] Activar "Karaoke" (con "Video local"/"Camera" desactivados) y confirmar que ambos paneles de
      AR-SYNC muestran la lista de canciones real + panel "agregar canción", sin errores de
      consola.
- [x] Arrastrar con el mouse sobre un panel y confirmar que el overlay de karaoke rota en AMBOS
      paneles (equivalente de escritorio al giroscopio/acelerómetro que usará `look-controls` en
      móvil).
- [ ] Agregar una canción nueva desde el overlay; confirmar que aparece en
      `localStorage['apprendevr_canciones']` y que también aparece al abrir por separado la vista
      A-Frame original.
- [x] Confirmar que AR-TEST y los overlays "video"/"cone" de AR-SYNC siguen funcionando sin
      regresión (no se tocó su código).
- [x] Correr `npm run build` en `ApprendeVr/frontend` y confirmar que termina sin errores.
- [x] Correr `npm run check:i18n` y confirmar que no hay alertas nuevas.

## Fase 5 — Documentación del patrón

- [x] Dejar comentarios en `aframe-overlay-modules.html`/`.js` y `VRKaraokeOverlaySync.jsx`
      explicando el patrón (un `.html` + `.js` de entrada por componente real importado, un
      `<Nombre>OverlaySync.jsx` que lo monta con `forwardRef`, sumado a
      `SYNCABLE_OVERLAYS`/`OVERLAY_OPTIONS`) para que sirva de referencia al sumar overlays de
      futuros componentes A-Frame a AR-SYNC.

## Fase 6 — Siguiente iteración (fuera de esta pasada)

- [ ] Repetir el mecanismo para `VREvaluacionAf` (evaluación de pronunciación) como overlay
      adicional de AR-SYNC — depende de `vrUserSettingsApi.util.js` (`fetch` real a
      `/api/user-settings/...`), caso más complejo que se prueba aparte.
