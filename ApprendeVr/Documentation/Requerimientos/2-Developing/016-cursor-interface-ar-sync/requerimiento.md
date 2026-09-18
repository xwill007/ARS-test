# Requerimiento 016 — Opción "Cursor" en el menú Interface de AR-SYNC

## 1. Objetivo

Agregar una opción "Cursor" en la pestaña "Interface" del menú brújula de AR-SYNC
(`SyncConfigCompassMenu.jsx`), debajo de "Position", que permita al usuario configurar el
puntero/reticle visible de la escena: reposición (x/y/z), escala, tiempo de activación
(fuse/dwell), color, mostrar/ocultar, y geometría (punto, cuadro, triángulo, cruz). La
configuración se persiste por usuario (mismo patrón que `ars-sync-compass-position`) y se aplica
de forma consistente en los distintos lugares del código donde hoy existe un cursor/dwell
independiente con valores hardcodeados.

## 2. Antecedentes y estado actual

- **Hay dos sistemas de cursor en el proyecto, casi sin relación entre sí:**
  - `ApprendeVr/frontend/src/views/A-frame/components/VRUserAf/VRCursor.js`: componente A-Frame
    `vr-cursor` con un schema ya bastante completo (`color`, `hoverColor`, `activeColor`,
    `primitive` —default `'ring'`—, `radiusInner`/`radiusOuter`, `mode`
    `mouse|fuse|key|voice|gaze|auto`, `fuseTimeout` default `3000`). No se encontró evidencia de
    que esté montado hoy en `src/views/A-frame/index.html`/`index.js` (no hay `<a-cursor>` ni
    `vr-cursor` ahí) — parece un componente legacy/no conectado a la vista de producción actual.
  - **AR-SYNC / `mirror-fix`** (el contexto real de este requerimiento): cada panel estéreo es un
    `<iframe>` independiente, y A-Frame no puede raycastear a través de límites de iframe, así que
    el mismo bloque `<a-cursor>` está **duplicado** en varios archivos, cada uno con su propia
    lógica de hover/dwell local:
    - `SyncConfigCompassMenu.jsx:686-693` — `<a-cursor id="main-cursor" position="0 0 -1"
      geometry="primitive: ring; radiusInner: 0.02; radiusOuter: 0.03" material="color: white;
      shader: flat; opacity: 0.85" cursor="enabled: false" raycaster="objects: .clickable; far:
      30; interval: 100">`, hijo de `<a-camera>` (posición **relativa a la cámara**, no anclada al
      mundo). **Es el único círculo que se dibuja visiblemente en toda la UI de AR-SYNC.**
    - `VRLocalVideoOverlaySync.jsx:1594-1600` — mismo bloque `<a-cursor id="main-cursor">`
      duplicado, con su propio script de dwell (~línea 1606) y un prop `cursorFuseTimeout`
      (default `2500`, línea 62) que **nunca se pasa** desde ningún padre (grep sin resultados de
      quien lo invoque con un valor real).
    - `aframe-overlay-modules.js`/`.html` (overlay karaoke/new-song): no usa `<a-cursor>` — tiene
      un círculo CSS `#mirror-fix-pointer` con `opacity: 0` (invisible a propósito) más un
      raycaster/dwell hecho a mano en THREE.js (`aframe-overlay-modules.js`, `FUSE_MS = 2500`
      hardcodeado, `COOLDOWN_MS = 600`, `REACTIVATION_GRACE_MS = 2000`), porque los botones de
      karaoke/new-song no son `.clickable` nativos y hacen su propio raycasting manual.
    - `youtube-video-modules.js:551-597` — mismo patrón, `FUSE_MS = 2500`/`COOLDOWN_MS = 600`
      hardcodeados de nuevo, tercera copia independiente.
    - `VRConeOverlaySync.jsx`: **no tiene reticle propio** (se sacó a propósito — comentario
      explícito: "con la brújula siempre activa encima de todo, se veían dos círculos
      superpuestos... el reticle visible ahora es el de la brújula").
  - **Cómo se sincroniza el hover/dwell entre iframes:** cada iframe secundario calcula su propio
    progreso de dwell contra SU contenido y lo manda por `postMessage({action: 'gaze-hover',
    hovering, progress})`; `SyncStereoTestView.jsx` lo relaya a la brújula, que pinta SU propio
    círculo (rojo/encogiéndose) con ese progreso remoto cuando su propio raycaster local no tiene
    nada hovereado (`SyncConfigCompassMenu.jsx`, manejo de `remoteGazeHovering`/
    `remoteGazeProgress`, ~líneas 780-800).
- **Geometría actual:** en los 3 lugares que sí usan `<a-cursor>`, es el primitive nativo `ring` de
  A-Frame con radios custom (no una malla/material propios) y `cursor="enabled: false"` (o
  simplemente sin `fuse`) porque el pipeline nativo de eventos del componente `cursor`
  (`mouseenter`/`fusing`/`click`) nunca disparó de forma confiable en este contexto — toda la
  lógica real de hover/dwell/click está escrita a mano en bloques `<script>` inline que leen
  `raycaster.intersectedEls` directamente y disparan un evento `click` sintético.
- **No existe ningún selector de color, `<select>` ni slider en la UI 3D de AR-SYNC.** Los dos
  únicos patrones de control usados hoy en `SyncConfigCompassMenu.jsx` son:
  1. **Fila de stepper +/-** (`CONFIG_FIELDS`, líneas 118-122, y `buildAxisStepperRow()`, líneas
     216-223, usado para los ejes x/y/z de posición/rotación y para "Scale" dentro de
     `buildInterfaceGroupHTML()`, línea 227+): label + dos `<a-plane class="clickable"
     data-step="..." data-dir="-1|1">`, click → `postMessage({action: 'compass-update-...',
     delta})`.
  2. **Fila toggle/checkbox** (la propia fila "Position", `#settings-position-toggle`): un
     `<a-plane class="clickable">` con un `<a-text>` de check (`✓`/vacío), color condicional según
     un booleano de estado, click → `postMessage({action: 'compass-toggle-position-mode'})`.
- **Persistencia por usuario (patrón `ars-sync-compass-position`):** tabla `settings_views` (fila
  por vista, `view_key` único) + `user_settings` (una fila por `user_id`+`view_id`[+`device_type`],
  columna `config JSON`) — ver `ApprendeVr/backend/db/004-normalize-user-settings-row-per-view.sql`
  y `006-user-settings-device-type.sql`. En `user-settings.util.ts`: `KNOWN_VIEWS` (lista de vistas
  válidas), un validador `isValidXConfig()` por vista, registrado en el mapa `VALIDATORS`. El
  cliente HTTP genérico `vrUserSettingsApi.util.js` (`getUserSetting(view, deviceType)`/
  `saveUserSetting(view, config, deviceType)`) no necesita cambios para una vista nueva — pero
  `SyncConfigCompassMenu.jsx` está en un `srcDoc` autocontenido y no puede hacer `fetch`/`import`
  directo (mismo motivo documentado en el Requerimiento 013/015 para otros overlays `srcDoc`), así
  que debe pedirle a `SyncStereoTestView.jsx` (que sí puede llamar a `vrUserSettingsApi.util.js`)
  que cargue/guarde por `postMessage`, igual que ya hace con `ars-sync-compass-position`
  (`COMPASS_POSITION_VIEW`, `SyncStereoTestView.jsx` línea 23 + `getUserSetting(...)` línea 274 +
  `saveUserSetting(...)` línea 787, disparado por el mensaje `'compass-save-position'` línea 784).
- **`vrPositionControl.js` (sistema genérico de reposición de overlays) no encaja tal cual para el
  cursor:** su array `ELEMENTS` (líneas 37-49) espera un `<a-entity>` anclado al mundo con una
  posición estable (karaoke, newSong, youtubeVideo); `#main-cursor` en cambio es hijo de
  `<a-camera>` con posición local fija `"0 0 -1"` — reposicionarlo es ajustar un offset relativo a
  la cámara (cuán lejos/desplazado del ojo), no moverlo a otro punto del mundo. Mecánicamente
  `resolveTarget()` (líneas 374-433) podría leer/escribir esa posición local igual, pero la
  semántica es distinta y hay que documentarla para no confundir al usuario con el sistema
  "Position" existente (que sí es world-anchored). Además solo existe UN cursor visible real (el
  de la brújula), a diferencia de los overlays de contenido que sí varían por iframe — esto
  simplifica la persistencia (una sola instancia a configurar, no una por overlay).
- **La escala ya se usa en runtime para animar el dwell:** el script de fuse de
  `SyncConfigCompassMenu.jsx` (`setVisual(color, scale)`, ~línea 789) anima `cursorEl`
  `scale`/color mientras el usuario mantiene la mirada — una escala "base" configurable por el
  usuario tiene que **componerse** con esa animación (multiplicar sobre la base), no reemplazarla,
  o la animación de fuse pisaría la preferencia guardada.

## 3. Historias de usuario

- Como usuario de AR-SYNC, quiero mover el cursor a la posición de pantalla que me resulte más
  cómoda, para apuntar y seleccionar más fácil según mi dispositivo o postura.
- Como usuario de AR-SYNC, quiero agrandar o achicar el cursor, para verlo mejor según la
  distancia o el tamaño de mi pantalla.
- Como usuario de AR-SYNC, quiero ajustar cuánto tiempo debo mantener la mirada o el puntero sobre
  un botón antes de que se active, para evitar activaciones accidentales o, si prefiero rapidez,
  activar más rápido.
- Como usuario de AR-SYNC, quiero cambiar el color del cursor, para que se distinga mejor del
  fondo de la escena en la que estoy.
- Como usuario de AR-SYNC, quiero poder ocultar el cursor cuando no lo necesito, para tener una
  vista más limpia de la escena.
- Como usuario de AR-SYNC, quiero elegir la forma del cursor (punto, cuadro, triángulo o cruz),
  para personalizar la experiencia a mi gusto.
- Como usuario que ya configuró su cursor, quiero que esa configuración se mantenga la próxima vez
  que entro a AR-SYNC, para no tener que repetirla cada vez.

## 4. Alcance

### Incluido

- Nueva fila "Cursor" en `buildInterfaceGroupHTML()` (`SyncConfigCompassMenu.jsx`), debajo de
  "Position", con el mismo patrón de fila-toggle que abre/cierra un sub-panel (igual que
  `position-dpad-group`).
- Sub-panel de controles del cursor:
  - 3 steppers x/y/z (reposición de `#main-cursor`, relativa a la cámara — ver "Diseño técnico").
  - 1 stepper de escala base (compuesta con la animación de fuse existente, no la reemplaza).
  - 1 stepper de tiempo de activación (fuse/dwell), rango acotado razonable (p. ej. 500–5000 ms,
    paso 250 ms).
  - 1 selector cíclico (+/-) de color, sobre una paleta fija (no un picker libre — ver "Diseño
    técnico").
  - 1 selector cíclico (+/-) de geometría: punto, cuadro, triángulo, cruz.
  - 1 fila toggle de mostrar/ocultar el cursor.
- Aplicación en tiempo real de cada cambio sobre `#main-cursor` en `SyncConfigCompassMenu.jsx`
  (color/geometría/escala/posición/visibilidad).
- Propagación del tiempo de activación configurado a los otros 3 lugares con fuse/dwell hardcodeado
  (`VRLocalVideoOverlaySync.jsx`, `aframe-overlay-modules.js`, `youtube-video-modules.js`),
  reemplazando sus defaults fijos (2500/600 ms) por el valor guardado por el usuario.
- Persistencia por usuario: nueva vista `ars-sync-cursor` en `user-settings` (backend:
  `KNOWN_VIEWS`, `isValidArsSyncCursorConfig`, migración para la fila en `settings_views`;
  frontend: `SyncStereoTestView.jsx` carga/guarda igual que `COMPASS_POSITION_VIEW`).
- Traducciones ES/EN/BR de todo texto nuevo del menú (regla del skill `texto-multidioma`).

### No incluido

- Tocar `VRCursor.js` ni la vista de producción `src/views/A-frame` — no tiene este menú de
  configuración y no se confirmó que el componente esté montado ahí hoy; este requerimiento es
  exclusivamente para AR-SYNC/`mirror-fix`.
- Un color picker libre (RGB/hex, `<input type="color">` proyectado en 3D): se usa una paleta fija
  cíclica, consistente con el resto de controles del menú (steppers +/-). La técnica de proyección
  de un `<input>` HTML sobre la escena 3D ya existe en `vrPositionControl.js` (`createWidget()`) y
  queda documentada como alternativa posible para un requerimiento futuro si la paleta fija resulta
  insuficiente, pero no se implementa acá.
- Refactorizar la arquitectura de cursores duplicados (un `<a-cursor>`/dwell distinto por iframe)
  en un único componente compartido: sigue habiendo una copia por archivo, cada una actualizada
  para leer el nuevo valor de tiempo de activación — no se resuelve la duplicación de raíz (cambio
  arquitectónico mayor, fuera de alcance).
- Rehabilitar el pipeline nativo de eventos del componente `cursor` de A-Frame (`fuse`/`fusing`):
  se mantiene la lógica de dwell hecha a mano que ya usa cada archivo, solo se le inyectan
  color/geometría/escala/posición/visibilidad/tiempo configurables.

## 5. Diseño técnico

**Reposición del cursor es relativa a la cámara, no al mundo (a diferencia de "Position").**
`#main-cursor` es hijo de `<a-camera>` con posición local `"0 0 -1"`. Los steppers x/y/z de esta
nueva opción ajustan esa posición local (offset respecto al ojo), no coordenadas de escena — se
documenta explícitamente en la UI (o en el texto de ayuda) para no confundirlo con el sistema
"Position" existente, que sí reposiciona overlays anclados al mundo.

**Escala configurada = escala base, compuesta con la animación de fuse existente.** El script de
dwell de cada archivo anima `scale` mientras el usuario mantiene la mirada
(`setVisual(color, scale)` en `SyncConfigCompassMenu.jsx`). La escala guardada por el usuario pasa
a ser el factor base sobre el que esa animación multiplica, en vez de un valor que la animación
pisa directamente — implica ajustar la fórmula de la animación en cada uno de los archivos con
dwell propio, no solo aplicar la escala una vez al montar.

**Geometría: primitives nativos de A-Frame donde alcance, con una solución explícita para
"cruz".** `point` → `circle` (radio chico), `square` → `box`/`plane` chico, `triangle` →
`triangle` primitive — los tres existen nativos en A-Frame. `cross` no tiene primitive nativo: se
resuelve con dos `<a-plane>` delgados cruzados en 90°, o con un plano con una textura/canvas de
cruz si el enfoque de dos planos da problemas de z-fighting (ver skill `aframe-elementos-3d`) — la
opción realmente implementada se documenta en `problems_solutions.md` si difiere de este plan.

**Color: paleta fija cíclica, no picker libre (decisión de diseño, ver "No incluido").** Mismo
patrón de stepper con wraparound (`(index + dir + N) % N`) que ya se usaría para el selector de
geometría — cero interacción nueva para el usuario, consistente con el resto del menú. Paleta
sugerida: blanco (default), rojo, verde, azul, amarillo, cian — a definir/ajustar en
implementación.

**Tiempo de activación: un único valor persistido, propagado a las 4 copias de dwell.** Como
`aframe-overlay-modules.js`/`youtube-video-modules.js` son módulos ES reales (pueden `import`/
`fetch`), mientras que `SyncConfigCompassMenu.jsx`/`VRLocalVideoOverlaySync.jsx` son `srcDoc`
autocontenidos (no pueden), se usa el mismo mecanismo ya probado en este proyecto para compartir un
valor entre iframes de distinto tipo (ver `apprendevr_youtube_preview_url` en el Requerimiento
015): `localStorage` (mismo origen, todos los iframes de `mirror-fix` lo comparten) +
`postMessage` explícito para quien lo necesite además. `SyncStereoTestView.jsx` es quien persiste
el valor real vía `user-settings` (`ars-sync-cursor`) y lo redistribuye.

**Persistencia: nueva vista `ars-sync-cursor`, mismo patrón que `ars-sync-compass-position`.**
Config sugerida: `{ position: [x,y,z], scale: number, fuseTimeout: number, color: string,
geometry: 'point'|'square'|'triangle'|'cross', visible: boolean }`. Validador
`isValidArsSyncCursorConfig` en `user-settings.util.ts`, registrado en `VALIDATORS` y en
`KNOWN_VIEWS`; migración nueva en `ApprendeVr/backend/db/` con el `INSERT` a `settings_views`
(mismo patrón que la cabecera de `004-normalize-user-settings-row-per-view.sql`).

## 6. Archivos a modificar

| Archivo | Cambio |
|---|---|
| `ApprendeVr/frontend/.../mirror-fix/SyncConfigCompassMenu.jsx` | Nueva fila "Cursor" + sub-panel en `buildInterfaceGroupHTML()`; aplicar color/geometría/escala/posición/visibilidad a `#main-cursor`; componer escala base con la animación de fuse existente; enviar/recibir los `postMessage` de guardado/carga. |
| `ApprendeVr/frontend/.../mirror-fix/SyncStereoTestView.jsx` | Nueva constante `CURSOR_SETTINGS_VIEW = 'ars-sync-cursor'`; carga (`getUserSetting`) y guardado (`saveUserSetting`) igual que `COMPASS_POSITION_VIEW`; relay de los nuevos mensajes hacia los demás iframes. |
| `ApprendeVr/frontend/.../mirror-fix/VRLocalVideoOverlaySync.jsx` | Leer el tiempo de activación configurado en vez del default hardcodeado (`cursorFuseTimeout`); aplicar color/geometría/visibilidad a su propio `<a-cursor id="main-cursor">` si corresponde mostrarlo ahí. |
| `ApprendeVr/frontend/.../mirror-fix/aframe-overlay-modules.js`/`.html` | Reemplazar `FUSE_MS`/`COOLDOWN_MS` hardcodeados por el valor configurado (leído de `localStorage`/mensaje). |
| `ApprendeVr/frontend/.../mirror-fix/youtube-video-modules.js` | Ídem `aframe-overlay-modules.js`. |
| `ApprendeVr/backend/src/user-settings/user-settings.util.ts` | Agregar `'ars-sync-cursor'` a `KNOWN_VIEWS`; nuevo `isValidArsSyncCursorConfig`; registrar en `VALIDATORS`. |
| `ApprendeVr/backend/src/user-settings/user-settings.util.spec.ts` | Tests del nuevo validador. |
| `ApprendeVr/backend/db/0NN-ars-sync-cursor-view.sql` | Nueva migración: `INSERT INTO settings_views (view_key, label) VALUES ('ars-sync-cursor', ...)`. |
| `ApprendeVr/backend/docker-compose.yml` | Montar la migración nueva. |
| `ApprendeVr/frontend/src/locales/{es,en,br}.json` | Claves nuevas: label de la fila "Cursor" y de cada control del sub-panel. |
| `ApprendeVr/Documentation/backend-nestjs.md` | Documentar la vista `ars-sync-cursor` si el doc lista las vistas conocidas de `user-settings`. |

## 7. Criterios de aceptación

- [ ] La pestaña "Interface" del menú brújula muestra una fila "Cursor" debajo de "Position", que
      abre/cierra un sub-panel al hacer click (mismo patrón que "Position").
- [ ] Mover los steppers x/y/z cambia visiblemente la posición de `#main-cursor` en tiempo real.
- [ ] El stepper de escala cambia el tamaño base del cursor, y la animación de fuse (mirar fijo un
      botón) sigue funcionando sin verse rota por la escala base configurada.
- [ ] El stepper de tiempo de activación cambia cuánto tarda en activarse un botón por dwell, y ese
      mismo tiempo se aplica también dentro del overlay de karaoke/new-song y del overlay de video
      (no solo en la brújula).
- [ ] El selector de color cicla entre la paleta fija y el cursor cambia de color en tiempo real.
- [ ] El selector de geometría cicla entre punto/cuadro/triángulo/cruz y el cursor cambia de forma
      en tiempo real, sin errores de render (z-fighting, geometría invisible) en ninguna opción.
- [ ] El toggle de mostrar/ocultar hace desaparecer/reaparecer el cursor sin romper el
      raycasting/dwell (los clicks/mirada fija siguen funcionando aunque el cursor esté oculto).
- [ ] Al salir y volver a entrar a AR-SYNC con el mismo usuario logueado, la configuración de
      cursor guardada se reaplica automáticamente (posición, escala, tiempo, color, geometría,
      visibilidad).
- [ ] Guardar la configuración de cursor no borra ni pisa la configuración ya guardada de
      `ars-sync-compass-position` ni de otras vistas de `user-settings` (merge, no reemplazo
      completo — mismo criterio ya establecido en el Requerimiento 015 para `saveConfig`).
- [ ] `npm run build` y `npm test` (backend) pasan sin levantar MySQL.
- [ ] `npm run build` (frontend) pasa sin errores.
- [ ] `npm run check:i18n` (frontend) pasa con las claves nuevas en los 3 idiomas.

## 8. Referencias

- Requerimiento 013 (`2-Developing/013-menu-configuracion-brujula-3d-ar-sync`): diseño original del
  menú brújula, la pestaña "Interface" y el sistema "Position" (patrón de fila-toggle + d-pad de
  steppers que este requerimiento reutiliza).
- Requerimiento 015 (`1-Pending/015-ingesta-canciones-youtube`): patrón de valor compartido entre
  iframes vía `localStorage` (`apprendevr_youtube_preview_url`) y patrón de merge superficial en
  `UserSettingsService.saveConfig` para no pisar configuración de otras vistas.
- Skill `overlay-ar-sync-aframe`: registro de overlays nuevos en AR-SYNC (no aplica directo a este
  requerimiento, que no agrega un overlay nuevo, pero sí documenta el patrón `srcDoc` vs. página
  Vite real que condiciona cómo `SyncConfigCompassMenu.jsx` puede o no llamar a `user-settings`).
- Skill `aframe-elementos-3d`: reglas de profundidad/z-fighting a tener en cuenta para la geometría
  "cruz" si se implementa con planos superpuestos.
- Investigación de esta sesión: `ApprendeVr/frontend/src/views/A-frame/components/VRUserAf/VRCursor.js`
  (componente `vr-cursor` con schema de referencia, no usado hoy en `mirror-fix`),
  `SyncConfigCompassMenu.jsx` (`#main-cursor`, `buildInterfaceGroupHTML`, `CONFIG_FIELDS`,
  `buildAxisStepperRow`), `SyncStereoTestView.jsx` (`COMPASS_POSITION_VIEW` como plantilla),
  `ApprendeVr/backend/db/004-normalize-user-settings-row-per-view.sql` (patrón de migración de
  vistas), `ApprendeVr/frontend/src/views/A-frame/vrPositionControl.js` (`ELEMENTS`/
  `resolveTarget()`, y `createWidget()` como referencia de un color picker proyectado en 3D si se
  retoma esa alternativa a futuro).
