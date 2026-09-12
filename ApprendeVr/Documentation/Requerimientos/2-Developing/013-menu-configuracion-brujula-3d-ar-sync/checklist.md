# Checklist de ejecución — Requerimiento 013

## Fase 1 — Geometría y layout de la brújula (sin interacción todavía)

- [x] Crear `SyncConfigCompassMenu.jsx` con `<iframe srcDoc>` y `<a-scene embedded
      vr-mode-ui="enabled: false">` (mismo patrón que `VRConeOverlaySync.jsx`), cámara con
      `<a-cursor>` reticle (sin componente `cursor="fuse:..."` nativo, mismo criterio que el
      resto de `mirror-fix`).
- [x] Círculo en el suelo (`y≈0`, mirando hacia arriba) con el triángulo de norte fijo (no rota),
      alineado con -Z.
- [x] Grupo de porciones (`<a-entity>` rotable en Y) con las 2 secciones actuales
      (Configuración/Overlays) como cuñas de la torta, con `<a-text>` de título reusando
      `arsConfig.tab.config`/`arsConfig.tab.overlays` vía `useVRLanguage()`.
- [x] Dos flechas visibles en el borde del círculo (aún sin funcionalidad de click).
- [x] Verificar visualmente en navegador (Claude en Chrome) que la brújula se ve correctamente en
      el suelo de cada panel estéreo, sin errores de consola. Confirmado: círculo con las dos
      cuñas rotuladas ("Configuration"/"Overlays", i18n en inglés por locale por defecto del
      navegador de prueba), triángulo de norte amarillo, reticle blanco, en ambos paneles.

## Fase 2 — Interacción: flechas y selección de porción

- [x] Marcar flechas y porciones como `.clickable`, agregar al `<a-cursor raycaster>`.
- [x] Script propio de hover/dwell/click (mismo patrón que `VRConeOverlaySync.jsx`:
      `FUSE_MS`/`COOLDOWN_MS`, agrupado por elemento lógico, no por mesh — evitar el bug corregido
      por el commit `dea919b`).
- [x] Apuntado sostenido (dwell) en una porción la activa y dispara `compass-select`. Confirmado
      en navegador: tras el tiempo de dwell, se abrió automáticamente el panel de "Configuration"
      centrado en pantalla.
- [ ] Click directo (sin dwell) en flecha/porción, y rotación de flechas en tiempo real —
      **implementado, mecanismo verificado por lógica pero NO confirmado con interacción real en
      el navegador automatizado**: el entorno de automatización usado para probar reporta
      `document.hidden = true` en los iframes de la brújula, lo que congela el loop de
      render/tick de A-Frame (mismo tipo de limitación que la Fullscreen API en el Requerimiento
      012). Forzando manualmente `scene.tick()` se confirmó que la rotación de 180°/porción
      calcula y aplica correctamente (las cuñas intercambiaron de lado, visualmente confirmado),
      pero no se pudo ver la animación ni el click nativo funcionando en tiempo real dentro de
      este entorno. Ver `problems_solutions.md`. **Pendiente de confirmación manual del usuario en
      un navegador normal (o dispositivo real).**

## Fase 3 — Panel de sección al frente del usuario

- [x] Migrar el contenido de las dos pestañas de `SyncConfigMenu.jsx` (sliders de
      separación/ancho/alto, checkboxes de overlays, botones guardar, indicador de sesión) —
      resuelto haciendo `tab`/`centered` props controladas en vez de extraer subcomponentes
      nuevos (ver Diseño técnico actualizado / decisión tomada durante la implementación).
- [x] Mostrar el panel HTML de la sección activa centrado en pantalla ("al frente"), no en la
      esquina superior izquierda. Confirmado visualmente.
- [x] Ocultar el panel con su botón ✕ (confirmado: cerrar con `element.click()` vía JS funcionó y
      el panel no se reabrió solo). El cierre "automático al dejar de apuntar" (mensaje
      `compass-deselect`) está implementado en el mismo tick() de dwell, pero no se pudo ejercitar
      en vivo por la misma limitación de tick congelado de la Fase 2.
- [ ] Confirmar que separación/ancho/alto siguen actualizando los paneles estéreo en vivo — no
      probado en esta pasada (los sliders respondieron visualmente al arrastre, pero no se
      verificó el efecto en el tamaño real de los paneles). Pendiente.
- [ ] Confirmar que guardar cada sección funciona con sesión real — no probado (el navegador de
      prueba no tenía sesión iniciada; el indicador "No session in this browser" se mostró
      correctamente, que es el comportamiento esperado sin sesión).
- [x] Verificar en navegador: las pestañas "Configuration"/"Overlays" y sus checkboxes/sliders
      responden igual que el menú 2D anterior (confirmado clickeando la pestaña "Overlays" y
      viendo sus 4 checkboxes con las mismas etiquetas y estado que antes).

## Fase 4 — Retirar el menú/botón viejos e integrar en `SyncStereoTestView.jsx`

- [x] Quitar `menuButtonStyle`, botón ☰ y estado `showMenu` de `SyncStereoTestView.jsx`.
- [x] Montar `SyncConfigCompassMenu` como capa siempre activa (`layerStyle`) en ambos paneles
      (izquierdo/derecho), pasando las mismas props que hoy recibía `SyncConfigMenu`.
- [x] Decisión tomada: `SyncConfigMenu.jsx` se mantiene como el componente del panel de contenido
      (no se retira), ahora controlado por `tab`/`onTabChange`/`centered` en vez de estado propio.
- [x] Verificar en navegador: la brújula aparece y funciona igual en ambos paneles, sin rastro del
      botón ☰ ni del panel fijo anterior. Confirmado.

## Fase 5 — Textos e i18n

- [x] No hicieron falta claves nuevas — las etiquetas de sección ya existían
      (`arsConfig.tab.config`/`arsConfig.tab.overlays`).
- [x] `npm run check:i18n` (en `ApprendeVr/frontend`) pasa sin errores.

## Fase 6 — Validación final

- [x] `npm run build` (en `ApprendeVr/frontend`) termina sin errores. Nota: se agregó
      `artestMirror` a `vite.config.js` (ver Archivos a modificar) porque sin esa entrada
      `npm run build` nunca llegaba a transformar estos archivos — así se detectó y corrigió un
      bug real (comilla invertida suelta cortando un template literal) que un build "exitoso"
      anterior no había detectado. Ver `problems_solutions.md`.
- [ ] Prueba manual completa en navegador NORMAL (no automatizado) o dispositivo real: rotar la
      brújula con ambas flechas (click y dwell), confirmar que la animación se ve, abrir cada
      sección apuntando y con click directo, ajustar y guardar Configuración (con sesión real),
      ajustar y guardar Overlays. **Pendiente — el entorno de automatización usado no permite
      confirmar la parte de la Fase 2/3 marcada arriba como pendiente.**
- [x] Confirmado que `TestOverlayAR2.jsx` ("AR-TEST") no fue tocado.

## Fase 7 — Ampliación: 4 secciones, widget de posición, reubicación cámara/menú

- [x] Brújula ampliada de 2 a 4 porciones (90° cada una): "Configuración"/"Overlays" (tipo panel,
      sin cambios de comportamiento) + "Volver"/"Cerrar sesión" (tipo acción, disparan de
      inmediato vía `compass-do-action`). Confirmado en navegador, las 4 etiquetas visibles y
      correctamente ubicadas (fórmula de bisectriz angular generalizada a N secciones).
- [x] "Volver" reemplaza al botón "Volver" que tenía `SyncStereoTestView.jsx` (quitado); "Cerrar
      sesión" reemplaza a "← Volver a inicio" de `ARTestMirrorButton.jsx` (oculto mientras AR-SYNC
      está abierto) y además borra `apprendevr_auth` de `localStorage`. Ambos confirmados
      end-to-end (incluida la limpieza real del `localStorage`).
- [x] Hallazgo corregido: "Cerrar sesión" no se activa por dwell (solo click directo) — era
      alcanzable por apuntado sostenido sin querer, ver `problems_solutions.md`.
- [x] Widget de posición (marcador 📍 + d-pad) agregado a la brújula, con persistencia real vía
      `getUserSetting`/`saveUserSetting` (`ars-sync-compass-position`) en `SyncStereoTestView.jsx`.
      Confirmado: mover, ver coords actualizarse, guardar.
- [x] Hallazgo corregido: reenviar la rotación de cámara de la brújula a los overlays de contenido
      (para que el video "siguiera" el giro) desalineaba el video entre paneles — revertido, ver
      `problems_solutions.md`.
- [x] Corrección pedida tras revisión: el panel de la sección activa pasó a renderizarse UNA VEZ
      POR PANEL estéreo (izquierdo y derecho), no una sola vez centrada en toda la ventana — en
      AR-SYNC el usuario mira a través de lentes de cartón VR (un ojo por panel). Confirmado
      visualmente.
- [x] Reubicación pedida por el usuario: el menú (`#compass-root`) pasó a vivir en el origen de la
      escena (`0,0,0`) y la cámara aparte, arriba (`0,3,0`) — antes el menú estaba a 4m de una
      cámara a la altura de los ojos (`0,1.8,0`). La vista inicial mira al frente (pitch/yaw en 0°,
      no hacia el menú) — el usuario tiene que bajar la mirada para verlo, como mirar al piso.
      Confirmado con lectura directa de `look-controls` (pitch/yaw en 0°, posición de cámara y
      menú exactas) sin interacción de por medio.
- [x] **Implementado** (era el pendiente de la entrada anterior): el panel de la sección activa
      (Configuración/Overlays) pasó a ser geometría A-Frame real dentro de `#compass-root`
      (`#settings-panel`, hijo de la brújula, tirado plano contra el suelo con `rotation="-90 0 0"`
      — NO hijo de `<a-camera>`, ver justificación en `problems_solutions.md`), interactuable con
      el mismo `.clickable` + raycaster/dwell que el resto de la brújula. `SyncConfigMenu.jsx`
      (HTML 2D) se retiró — ya no lo usa nadie.
      - Steppers +/- para Separación/Ancho/Alto (`CONFIG_FIELDS`, mismos rangos que los sliders
        `<input type="range">` originales), filas clickeables con check para cada overlay
        (`OVERLAY_OPTIONS`, etiquetas cortas nuevas `syncConfig.overlay.*Short`), botones Guardar
        para cada pestaña, botón ✕ para cerrar.
      - Puente bidireccional con `SyncStereoTestView.jsx` (que sigue siendo dueño del estado real y
        de `getUserSetting`/`saveUserSetting`): `compass-config-state` (padre → brújula, en
        respuesta a `compass-ready` y cada vez que el estado cambia) y
        `compass-update-separation/width/height`, `compass-toggle-overlay`,
        `compass-save-config`/`compass-save-overlays` (brújula → padre).
      - Confirmado end-to-end en navegador: abrir cada pestaña muestra los valores reales
        (separación/ancho/alto/checks de overlay) en AMBOS paneles estéreo; un stepper (+20 en
        Width) actualizó el valor mostrado en ambos paneles; togglear "Cono" activó de verdad el
        overlay (visible en el video de fondo de ambos paneles); cerrar con ✕ oculta el panel.
      - Hallazgo corregido durante la implementación: los nombres de campo no coincidían
        (`panelWidth`/`panelHeight` del lado de `SyncStereoTestView.jsx` vs `width`/`height` que
        espera `CONFIG_FIELDS` del lado de la brújula) — el ancho/alto se mostraban como
        "undefinedpx". Se corrigió aliasando en el mensaje (`width: panelWidth, height:
        panelHeight`), sin tocar los nombres de estado/DB internos.
- [ ] No confirmado con sesión real: guardar Configuración/Overlays desde el panel 3D con
      `apprendevr_auth` presente (el navegador de prueba no tenía sesión — se confirmó sí el
      comportamiento correcto de "sin sesión": el botón se queda verde, no pasa a gris, porque
      `saveUserSetting` no llega a intentar la llamada).
- [ ] Ubicación del marcador/d-pad de posición: sigue usando el esquema de layout de la cámara
      ANTERIOR (elevado en Y, pensado para una cámara casi horizontal) — con la cámara ahora
      arriba mirando al frente por defecto (y el usuario bajando la mirada para ver el menú),
      convendría revisarlo para que quede igual de accesible que el nuevo panel de
      configuración/overlays (ver ubicación de `#settings-panel` en `SyncConfigCompassMenu.jsx`).

## Fase 8 — Ajustes de profundidad (z-fighting) y confirmación para acciones destructivas/de salida

- [x] Hallazgo del usuario: los botones de `#settings-panel` (steppers, filas de overlay, ambos
      "Guardar") estaban a la misma profundidad que el fondo del panel — z-fighting real y riesgo
      de que el raycaster intersecte el fondo en vez del botón. Corregido con un offset de `0.01`
      (`0.02` para el botón ✕, que puede solaparse con el título) en el eje perpendicular
      correspondiente. Confirmado que los botones siguen respondiendo al click tras el ajuste.
- [x] Creado el skill `aframe-elementos-3d` (`.agents/skills/aframe-elementos-3d/SKILL.md`)
      documentando la convención de offset de profundidad para cualquier elemento 3D nuevo del
      proyecto — no reinventarla la próxima vez que se agregue un panel/botón en A-Frame.
- [x] Panel de confirmación (`#confirm-panel`) para las porciones "Volver"/"Cerrar sesión": ya no
      disparan la acción directo, primero piden confirmar (nuevas claves i18n
      `home.confirmBack`/`home.confirmLogout`/`home.confirmYes`/`home.confirmCancel`). Confirmado
      end-to-end para ambas acciones, con Cancelar (sin efecto) y con Confirmar (Volver cierra
      AR-SYNC; Cerrar sesión borra `apprendevr_auth` y navega a `/`).
- [x] `npm run build` y `npm run check:i18n` (en `ApprendeVr/frontend`) siguen pasando sin errores
      después de estos ajustes.

## Fase 9 — Exclusión mutua de paneles + ajustes visuales de la brújula

- [x] Hallazgo del usuario: `#settings-panel` y `#confirm-panel` podían quedar los dos visibles a
      la vez (comparten posición/orientación). Corregido: cada uno cierra al otro antes de
      mostrarse (`window.__closeConfirmPanel`/`window.__closeSettingsPanel`). Confirmado en ambos
      sentidos (Configuración → Volver, Overlays → Volver).
- [x] Las 4 porciones pasaron de un color distinto cada una (`<a-cylinder>`) a un gris
      semitransparente uniforme (`<a-ring>`, `WEDGE_COLOR`/`WEDGE_OPACITY`) con hueco central
      (`RING_INNER_RADIUS`) — la brújula quedó con forma de dona, no de círculo completo.
      Confirmado visualmente.
- [x] El área de click de cada porción se acotó al texto (un `<a-plane>` invisible del tamaño de
      la etiqueta, `opacity: 0.01`), no a toda la porción — el anillo decorativo ya no lleva
      `.clickable`. Confirmado que el click sigue activando cada sección.
- [x] El texto de cada porción se reubicó y reorientó radialmente (del centro hacia afuera), con
      3 rotaciones anidadas simples en vez de un Euler compuesto. Confirmado visualmente (las 4
      etiquetas se leen "hacia afuera"; las del lado opuesto del círculo quedan boca abajo para un
      espectador fijo — resultado esperado de una orientación radial pura, no de una "siempre
      legible").
- [x] `npm run build` y `npm run check:i18n` siguen pasando sin errores después de estos ajustes.

## Fase 10 — Persistencia real de overlays/config/posición para el usuario de prueba (login-test)

- [x] **Corregido tras hallazgo** (ver `problems_solutions.md` 2026-09-12): `saveSelectedOverlays`
      y `saveConfig` en `SyncStereoTestView.jsx` leían del closure del PRIMER render (porque
      `handleMessage` se registra con `deps: []`), guardando siempre el default
      (`['camera','video']`, separación 24, etc.) en vez de la selección real. Ahora leen de
      `configStateRef.current`. Confirmado en DB (la fila de `prueba@gmail.com` quedaba con el
      default) y build de Vite limpio.
- [x] **Corregido tras hallazgo** (ver `problems_solutions.md` 2026-09-12): la vista
      `ars-sync-compass-position` (posición de la brújula 3D) no estaba registrada en el backend —
      `GET`/`PUT` devolvían `400 UNKNOWN_VIEW` y la posición nunca persistía. Agregada a
      `KNOWN_VIEWS` + validador `isValidArsSyncCompassPositionConfig` en `user-settings.util.ts`,
      migración `db/008-ars-sync-compass-position-view.sql` (INSERT en `settings_views`) montada en
      `docker-compose.yml`, seed aplicado al contenedor en ejecución. Suite `user-settings` 55/55
      verde, `nest build` limpio.
