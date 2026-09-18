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

- [x] 2.1 `SyncConfigCompassMenu.jsx`: nueva fila toggle "Cursor" en `buildInterfaceGroupHTML()`,
      debajo de "Position" (con un margen extra, `TOGGLE_ROW_MARGIN`, pedido del usuario para que
      no quedaran pegadas), que abre/cierra un sub-panel (mismo patrón que `position-dpad-group`,
      mutuamente excluyente con él — ver `problems_solutions.md`). `PANEL_HEIGHT` ajustado 5.2→5.8.
- [x] 2.2 3 steppers x/y/z (reposición relativa a la cámara de `#main-cursor`), reusando
      `buildAxisStepperRow()`.
- [x] 2.3 1 stepper de escala base.
- [x] 2.4 1 stepper de tiempo de activación (rango 500–5000 ms, paso 250 ms).
- [x] 2.5 1 selector cíclico (+/-) de color sobre paleta fija (wraparound de índice).
- [x] 2.6 1 selector cíclico (+/-) de geometría (`point`/`square`/`triangle`/`cross`).
- [x] 2.7 1 fila toggle de mostrar/ocultar.
- [x] 2.8 `refreshDisplay()`/`refreshCursorDpad()`: reflejan el estado actual de cada control
      (labels, valores, check de visibilidad) igual que ya hace para "Position"/overlays.

### Fase 3 — Frontend: aplicar los cambios en tiempo real sobre el cursor visible

- [x] 3.1 Aplicado posición/escala/color/geometría/visibilidad a `#main-cursor` en
      `SyncConfigCompassMenu.jsx` al cambiar cada control (`applyCursorConfigLive()` →
      `window.__applyCursorConfig`), sin esperar a guardar. Verificado en vivo en el navegador.
- [x] 3.2 La escala base configurada se compone con la animación de fuse existente
      (`setVisual(color, fuseScale)` ahora multiplica `cursorBaseScale * fuseScale`, no reemplaza).
- [x] 3.3 Geometría "cross" implementada con dos `<a-plane>` hijos de `#main-cursor`
      (`#cursor-cross-h`/`#cursor-cross-v`), ocultos por defecto — sin z-fighting reportado.

### Fase 4 — Frontend: propagar el tiempo de activación a las demás copias de dwell

- [x] 4.1 `SyncStereoTestView.jsx`: `CURSOR_SETTINGS_VIEW` — carga (`getUserSetting`) al montar y
      guarda (`saveUserSetting`) al recibir `compass-save-cursor`, igual que `COMPASS_POSITION_VIEW`.
- [x] 4.2 `fuseTimeout` compartido a `aframe-overlay-modules.js`/`youtube-video-modules.js` vía
      `localStorage['apprendevr_cursor_fuse_timeout']` (mismo mecanismo que
      `apprendevr_youtube_preview_url`, Requerimiento 015); a la brújula y a
      `VRLocalVideoOverlaySync.jsx` vía el prop `cursorFuseTimeout` (ya existía, nunca se le pasaba
      un valor real).
- [x] 4.3 `VRLocalVideoOverlaySync.jsx`: recibe `cursorFuseTimeout={cursorConfig?.fuseTimeout}` desde
      `SyncStereoTestView.jsx` en vez del default hardcodeado.
- [x] 4.4 `aframe-overlay-modules.js`: `FUSE_MS` ahora lee `localStorage`, con fallback a 2500 si no
      hay nada guardado.
- [x] 4.5 `youtube-video-modules.js`: ídem.

### Fase 5 — i18n

- [x] 5.1 Claves nuevas agregadas a `src/locales/{es,en,br}.json` (`config.cursor*`).
- [x] 5.2 `npm run check:i18n` pasa (212 claves usadas, simétricas en los 3 idiomas).

### Fase 6 — Verificación y documentación

- [x] 6.1 `npm run build` y `npm test` (backend) pasan sin levantar MySQL (71 tests verdes en
      `user-settings`, suite completa no re-corrida en esta fase pero sin cambios fuera de ese
      módulo).
- [x] 6.2 `npm run build` (frontend) pasa sin errores.
- [x] 6.3 Probado manualmente en `mirror-fix` (navegador real, vía `javascript_tool` +
      screenshots): abrir/cerrar el sub-panel, mover X/Y/Z, escala, tiempo de activación, ciclar
      color y geometría, mostrar/ocultar, Guardar (botón pasa a verde con cambios, gris sin
      cambios) — sin errores de consola en ningún punto. Migración aplicada a la BD real
      (`docker exec` + `INSERT INTO settings_views`) y probado round-trip completo con `curl`
      (`PUT`/`GET /api/user-settings/ars-sync-cursor`, incluido el caso de geometría inválida → 400).
- [x] 6.4 `ars-sync-cursor` y `ars-sync-compass-position` son filas independientes (`view_id`
      distinto) — no hay reemplazo cruzado posible por diseño de la tabla, no solo por el merge.
- [x] 6.5 Criterios de aceptación de `requerimiento.md` marcados.
