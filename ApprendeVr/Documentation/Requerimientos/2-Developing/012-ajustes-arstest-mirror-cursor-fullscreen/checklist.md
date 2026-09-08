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

## Fase 7 — Widgets de posición clickeables + persistencia de overlays seleccionados (ajuste pedido tras revisión)

- [x] Llamar `initPositionControl()` (Requerimiento 010, `vrPositionControl.js`) en
      `aframe-overlay-modules.js` al cargar la escena — sin esto el listener compartido que
      procesa los clicks de los marcadores de posición (karaoke, agregar-canción, evaluación)
      nunca se armaba, así que ningún marcador respondía a click aunque existiera en el DOM.
- [x] Extender `collectTargets()` del mecanismo de gaze con un bloque genérico `.clickable` para
      alcanzar esos marcadores por dwell, deduplicado (`coveredEls`) contra los botones ya
      cubiertos por los bloques específicos de karaoke/newSong/evaluación (ver
      `problems_solutions.md` — `.clickable` no es exclusivo de los widgets de posición).
- [x] Agregar el botón "Guardar selección" en `SyncConfigMenu.jsx` (persistencia explícita de
      `selectedOverlays`, no autosave) y su carga en `SyncStereoTestView.jsx` vía
      `getUserSetting`/`saveUserSetting`, mismo patrón que `vrPositionControl.js`.
- [x] Registrar la vista `ars-sync-overlays` en el backend (`user-settings.util.ts`,
      `user-settings.entity.ts`, migración `db/003-ars-sync-overlays-config.sql`) — la vista no
      existía y el `PUT` devolvía `400 UNKNOWN_VIEW`.
- [x] Corregir la lectura de `getUserSetting()` en `SyncStereoTestView.jsx` (leía
      `setting.config.selectedOverlays`, la respuesta no tiene ese envoltorio) — la selección
      guardada no sobrevivía a un recargo de página hasta este fix.
- [x] Botón "Guardar selección" da feedback visual: gris mientras la selección actual coincide
      con lo último guardado con éxito, vuelve a verde en cuanto se toca un checkbox.
- [x] Confirmar en navegador: togglear "Karaoke", guardar (`PUT` → 200), recargar la página,
      reabrir el menú → el checkbox de "Karaoke" aparece marcado y el botón "Guardar selección"
      aparece gris, sin volver a tocar nada.
- [x] Correr los tests del backend (`npx jest`, 22 suites / 82 tests) sin errores.
- [x] Corrección de diseño pedida por el usuario: normalizar `user_settings` de "una fila por
      usuario, una columna JSON por vista" a "una fila por `(usuario, vista)`" relacionada por FK
      contra un catálogo nuevo `settings_views` — alineado con el catálogo `modules` que definirá
      el Requerimiento 005, sin adelantar ese diseño. Ver `problems_solutions.md` para el detalle
      de la migración (`db/004-normalize-user-settings-row-per-view.sql`) y los archivos tocados.
      Confirmado: 82/82 tests de backend, las 4 vistas existentes migran sus datos intactos y
      responden `200`, y "Guardar selección" sigue funcionando en navegador sobre el nuevo schema.

## Fase 7.1 — Guardar también la pestaña "Configuración" (ajuste pedido tras revisión)

- [x] Agregar botón "Guardar configuración" a la pestaña "Configuración" de `SyncConfigMenu.jsx`
      (separación/ancho/alto de los paneles), mismo patrón de feedback visual (gris cuando
      coincide con lo último guardado, verde al tocar cualquier slider) que "Guardar selección".
- [x] Ampliar el rango del slider de ancho de panel de `max={700}` a `max={900}` (pedido explícito
      del usuario).
- [x] Registrar la vista `ars-sync-config` — gracias a la normalización de la Fase 7 (fila por
      vista + catálogo `settings_views`), esto ya NO requiere ningún `ALTER TABLE`: solo un
      `INSERT` nuevo (`db/005-ars-sync-config-view.sql`) y su validador
      (`isValidArsSyncConfigConfig`) en `user-settings.util.ts`.
- [x] Correr los tests del backend (88/88) y confirmar en navegador: el botón carga en gris al
      abrir la vista (coincide con lo guardado), y guardar/recargar conserva separación/ancho/alto.

## Fase 7.2 — UTF-8/zona horaria de la BD + diferenciación web/móvil (ajustes pedidos tras revisión)

- [x] Revisar y corregir la corrupción de doble-codificación UTF-8 detectada en
      `settings_views.label` (tildes/eñes guardadas como `Ã³`/`Ã±` en vez de `ó`/`ñ`) — causa: el
      cliente `mysql` usado para aplicar las migraciones a mano (`docker exec ... mysql < archivo`)
      negociaba `latin1` por defecto en este entorno. Corregidos los 5 labels ya guardados
      (`UPDATE ... SET NAMES utf8mb4`) y agregado `SET NAMES utf8mb4;` al inicio de las migraciones
      004/005 para que una instalación nueva no repita el bug.
- [x] Revisar la zona horaria de la BD: `time_zone` estaba en `SYSTEM` (resolvía a UTC porque la
      imagen del contenedor usa UTC, pero de forma implícita/frágil). Fijado explícitamente a UTC
      en ambos lados: `command: --default-time-zone=+00:00` + `TZ: UTC` en `docker-compose.yml`
      (contenedor MySQL) y `timezone: 'Z'` en `database.module.ts` (driver `mysql2`/TypeORM), para
      que no dependan del reloj del host ni del proceso Node.
- [x] Agregar diferenciación web/móvil al almacenamiento de `user_settings`: columna `device_type`
      (`'web'` | `'mobile'`) como parte de la clave de la fila —
      `(user_id, view_id, device_type)` — vía migración `db/006-user-settings-device-type.sql`
      (filas existentes migran con `DEFAULT 'web'`). `UserSettings` entity, `user-settings.service.ts`
      (`getConfig`/`saveConfig` reciben `deviceType`), `user-settings.controller.ts`
      (`?device=web|mobile` en la query string de `GET`/`PUT`, default `'web'` si se omite) y
      `user-settings.util.ts` (`KNOWN_DEVICE_TYPES`/`isKnownDeviceType`) actualizados.
- [x] Frontend: `detectDeviceType()` en `vrUserSettingsApi.util.js` (mismo patrón de regex sobre
      `navigator.userAgent` que `ARSConfigManager.detectDeviceType()`, colapsado a 2 categorías) —
      `getUserSetting`/`saveUserSetting` lo usan como default, así cualquier llamador existente
      (`App.jsx`, `vrPositionControl.js`, `VREvaluacionAf.js`) queda diferenciado por dispositivo
      sin tener que tocar esos archivos.
- [x] Los botones "Guardar selección"/"Guardar configuración" de `SyncConfigMenu.jsx` ahora
      muestran el dispositivo detectado — `"Guardar selección (Web)"` / `"Guardar configuración
      (Móvil)"` — vía nuevas claves i18n `syncConfig.deviceWeb`/`syncConfig.deviceMobile`.
- [x] Confirmado en navegador: `GET`/`PUT` con `?device=web` y `?device=mobile` devuelven/guardan
      configs completamente independientes para el mismo usuario y vista (probado con
      `ars-sync-config`: web quedó en `{893,0,735}`, mobile en `{320,8,420}`, sin pisarse).
- [x] Tests de backend actualizados (`user-settings.util.spec.ts`, `.service.spec.ts`,
      `.controller.spec.ts`) — 96/96 en total.
- [ ] Reportado por el usuario: en su celular real, el botón "Guardar configuración" muestra
      correctamente `(Mobile)` (la detección de dispositivo funciona), pero el guardado no
      persiste — el botón queda en verde tras el click. Se agregó logging de diagnóstico
      (`console.warn`) en `getUserSetting`/`saveUserSetting` para distinguir "sin sesión en ese
      navegador" de "falla de red" (candidato principal: certificado HTTPS autofirmado —
      `ssl/cert.pem`, ver `vite.config.js` — sin confiar en ese dispositivo) de "el servidor
      rechazó la config". **Pendiente**: confirmar con el usuario qué mensaje aparece en la consola
      de su navegador móvil para identificar la causa real y corregirla.

## Fase 8 — Validación final

- [x] Correr `npm run build` en `ApprendeVr/frontend` y confirmar que termina sin errores
      (repetido tras cada tanda de cambios).
- [x] Correr `npm run check:i18n` sin alertas nuevas.
- [x] Confirmar que no se modificó ningún archivo de producción ni los componentes reales de
      `src/views/A-frame`.
- [ ] Pendiente: confirmación manual del usuario de pantalla completa en un navegador real.
- [ ] Pendiente: verificar en un navegador real (con la pestaña en foco, no en el entorno de
      automatización usado — ver `problems_solutions.md`) que el dwell/gaze sobre el marcador rojo
      de posición efectivamente dispara el click end-to-end (abre el d-pad, guarda una posición
      nueva) — el entorno de automatización usado para esta pasada mantiene la pestaña en segundo
      plano, lo que detiene el bucle de render de A-Frame (`requestAnimationFrame`) y no permite
      verificar el dwell real, aunque el mecanismo (listener armado, raycast, deduplicación de
      objetivos) quedó confirmado por código y por consulta directa en consola.
