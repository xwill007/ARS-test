# Checklist de ejecución (paso a paso)

### Fase 1 — Backend: persistencia de la vista `ars-sync-cursor`

- [x] 1.1 Migración `ApprendeVr/backend/db/010-ars-sync-cursor-view.sql`: `INSERT INTO
      settings_views (view_key, label) VALUES ('ars-sync-cursor', 'Cursor de AR-SYNC')` (mismo
      patrón que `004-normalize-user-settings-row-per-view.sql`). Montada en `docker-compose.yml`.
- [x] 1.2 `user-settings.util.ts`: agregado `'ars-sync-cursor'` a `KNOWN_VIEWS`.
- [x] 1.3 `user-settings.util.ts`: `isValidArsSyncCursorConfig(config)` — valida
      `{ position: [number,number,number], scale: number>0, fuseTimeout: number>0, color: string,
      geometry: 'point'|'square'|'triangle'|'cross', visible: boolean }`. Registrado en `VALIDATORS`.
- [x] 1.4 `user-settings.util.spec.ts`: casos válidos/inválidos del nuevo validador (tipos
      incorrectos, geometría fuera de la lista, `fuseTimeout` <= 0, etc.). 71 tests verdes.
- [x] 1.5 `saveConfig` (`UserSettingsService`) ya hace merge genérico por vista — no requirió
      cambios para esta vista nueva.

### Fase 2 — Frontend: UI del sub-panel "Cursor" en la brújula

- [ ] 2.1 `SyncConfigCompassMenu.jsx`: nueva fila toggle "Cursor" en `buildInterfaceGroupHTML()`,
      debajo de "Position", que abre/cierra un sub-panel (mismo patrón que `position-dpad-group`).
      Ajustar `PANEL_HEIGHT`/`y` cascade si no entra el contenido (mismo cuidado documentado para
      la fila "Scale" existente).
- [ ] 2.2 3 steppers x/y/z (reposición relativa a la cámara de `#main-cursor`), reusando
      `buildAxisStepperRow()`.
- [ ] 2.3 1 stepper de escala base.
- [ ] 2.4 1 stepper de tiempo de activación (rango 500–5000 ms, paso 250 ms).
- [ ] 2.5 1 selector cíclico (+/-) de color sobre paleta fija (wraparound de índice).
- [ ] 2.6 1 selector cíclico (+/-) de geometría (`point`/`square`/`triangle`/`cross`).
- [ ] 2.7 1 fila toggle de mostrar/ocultar.
- [ ] 2.8 `refreshDisplay()`: reflejar el estado actual de cada control (labels, valores, check de
      visibilidad) igual que ya hace para "Position"/overlays.

### Fase 3 — Frontend: aplicar los cambios en tiempo real sobre el cursor visible

- [ ] 3.1 Aplicar posición/escala/color/geometría/visibilidad a `#main-cursor` en
      `SyncConfigCompassMenu.jsx` al cambiar cada control (sin esperar a guardar).
- [ ] 3.2 Componer la escala base configurada con la animación de fuse existente
      (`setVisual(color, scale)`) — la animación multiplica sobre la base, no la reemplaza.
- [ ] 3.3 Implementar la geometría "cross" (sin primitive nativo) — dos `<a-plane>` cruzados o
      alternativa sin z-fighting (ver skill `aframe-elementos-3d`); documentar la solución elegida
      en `problems_solutions.md`.

### Fase 4 — Frontend: propagar el tiempo de activación a las demás copias de dwell

- [ ] 4.1 `SyncStereoTestView.jsx`: `CURSOR_SETTINGS_VIEW` — cargar (`getUserSetting`) al montar y
      guardar (`saveUserSetting`) al recibir el mensaje de guardado desde la brújula, igual que
      `COMPASS_POSITION_VIEW`.
- [ ] 4.2 Compartir el `fuseTimeout` configurado a los iframes vía `localStorage` (mismo mecanismo
      que `apprendevr_youtube_preview_url`, Requerimiento 015) y/o `postMessage` explícito para los
      `srcDoc` que no pueden leer `localStorage` de otro origen si aplica.
- [ ] 4.3 `VRLocalVideoOverlaySync.jsx`: leer el valor configurado en vez del default hardcodeado
      `cursorFuseTimeout = 2500`.
- [ ] 4.4 `aframe-overlay-modules.js`: reemplazar `FUSE_MS`/`COOLDOWN_MS` hardcodeados por el valor
      configurado.
- [ ] 4.5 `youtube-video-modules.js`: ídem.

### Fase 5 — i18n

- [ ] 5.1 Agregar las claves nuevas (fila "Cursor" + labels de cada control) a
      `src/locales/{es,en,br}.json`.
- [ ] 5.2 `npm run check:i18n` pasa.

### Fase 6 — Verificación y documentación

- [ ] 6.1 `npm run build` y `npm test` (backend) pasan sin levantar MySQL.
- [ ] 6.2 `npm run build` (frontend) pasa sin errores.
- [ ] 6.3 Probar manualmente en `mirror-fix` cada control del sub-panel "Cursor" (ver `tests.md`,
      casos manuales).
- [ ] 6.4 Confirmar que guardar "Cursor" no pisa la configuración ya guardada de
      `ars-sync-compass-position` (ni viceversa).
- [ ] 6.5 Marcar los criterios de aceptación de `requerimiento.md` como cumplidos.
