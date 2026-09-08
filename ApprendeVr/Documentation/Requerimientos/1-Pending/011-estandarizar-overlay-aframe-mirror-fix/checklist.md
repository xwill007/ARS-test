# Requerimiento 011 — Checklist de ejecución

## Fase 1 — Preparación

- [ ] Confirmar en el código actual (no asumir) que `VRKaraokeAf.js` sigue importando
      `VRNewSongAf.js` y que `VREvaluacionAf.js` sigue creándose dinámicamente desde
      `VRKaraokeAf.js` (no como entidad estática) — puede haber cambiado desde que se escribió
      este requerimiento, ya que el Requerimiento 009 sigue `2-Developing`.
- [ ] Confirmar la ruta relativa exacta desde
      `src/views/ARs/ARScomponents/ARStest/mirror-fix/` hacia
      `src/views/A-frame/components/VRKaraokeAf/VRKaraokeAf.js` y
      `.../VREvaluacionAf/VREvaluacionAf.js`.
- [ ] Revisar `src/views/A-frame/index.html` para copiar los atributos mínimos necesarios de
      `vr-karaoke-af` (schema) y `vr-new-song-af` que el overlay de prueba necesita declarar.

## Fase 2 — Nuevo entry point Vite en `mirror-fix`

- [ ] Crear `aframe-overlay-modules.html` en `mirror-fix/`: carga `/libs/aframe.min.js`, declara
      `<a-scene>` con las entidades `vr-karaoke-af` y `vr-new-song-af` necesarias, y carga
      `aframe-overlay-modules.js` como `<script type="module">`.
- [ ] Crear `aframe-overlay-modules.js`: `import` real (sin copiar código) de
      `VRKaraokeAf.js` y `VREvaluacionAf.js` desde `src/views/A-frame/components/...`.
- [ ] Registrar `aframe-overlay-modules.html` en `ApprendeVr/frontend/vite.config.js` →
      `build.rollupOptions.input`.
- [ ] Levantar el dev server (`npm run dev` en `ApprendeVr/frontend`) y abrir el nuevo `.html`
      directamente en el navegador para confirmar que la escena carga sin errores de consola antes
      de integrarlo al iframe.

## Fase 3 — Integración en `mirror-fix` como overlay de prueba

- [ ] Crear el componente React que monta `aframe-overlay-modules.html` en un
      `<iframe src="...">` real (no `srcDoc`), siguiendo el rol de `VRLocalVideoOverlaySync.jsx`
      pero sin copiar su contenido (ese archivo es código de otro overlay, no una base a reusar
      aquí).
- [ ] Agregar el tercer botón de prueba en `ARTestMirrorButton.jsx` (nuevo estado, p. ej.
      `open === 'aframe-modules'`) que abre `ARStereoView` con este overlay
      (`overlayType="html"`, igual que los otros dos).
- [ ] Agregar las claves de texto nuevas (nombre del botón, etiquetas) en
      `src/locales/{es,en,br}/translation.json` y consumirlas con `t()`/`useVRLanguage()`.

## Fase 4 — Validación en navegador

- [ ] Confirmar que el overlay muestra la lista de canciones real con el mismo contenido/estilo
      que `src/views/A-frame/index.html`.
- [ ] Agregar una canción nueva desde el overlay; confirmar que aparece en
      `localStorage['apprendevr_canciones']` y que también aparece al abrir por separado la vista
      A-Frame original.
- [ ] Abrir el panel de evaluación desde el overlay (flujo "EVALUATE SONG") y confirmar que no
      lanza errores de consola nuevos relacionados a dependencias faltantes.
- [ ] Confirmar que AR-TEST y AR-SYNC siguen funcionando sin regresión.
- [ ] Correr `npm run build` en `ApprendeVr/frontend` y confirmar que termina sin errores.
- [ ] Correr `npm run check:i18n` (o `check:i18n:hardcoded`) y confirmar que no hay alertas nuevas.

## Fase 5 — Documentación del patrón

- [ ] Dejar un comentario en `aframe-overlay-modules.html`/`.js` explicando el patrón (un `.html`
      + `.js` de entrada por conjunto de componentes, importados tal cual, registrado en
      `vite.config.js`) para que sirva de referencia al agregar overlays de futuros componentes
      A-Frame.
