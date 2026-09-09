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
- [ ] **Pendiente, no implementado todavía**: el usuario pidió que el panel de la sección activa
      (Configuración/Overlays) sea un elemento 3D real dentro de la escena — interactuable con el
      mismo raycaster/cursor de la brújula — en vez de HTML 2D superpuesto (que es como sigue hoy,
      duplicado por panel pero todavía HTML). Solo se hizo preparación (claves i18n cortas para
      los nombres de overlay — `syncConfig.overlay.*Short` — pensadas para filas de un panel 3D
      compacto); la conversión de sliders/checkboxes a controles 3D clickeables (steppers +/-,
      toggles) y el puente de mensajes bidireccional con `SyncStereoTestView.jsx` quedan para una
      próxima sesión. Ver `problems_solutions.md`.
- [ ] Ubicación del marcador/d-pad de posición y del futuro panel 3D: siguen usando el esquema de
      layout de la cámara ANTERIOR (elevados en Y, pensado para una cámara casi horizontal); con
      la cámara ahora arriba mirando al frente por defecto (y el usuario bajando la mirada para
      ver el menú), conviene revisar su posición/orientación una vez el panel 3D esté en marcha —
      no se tocó en esta pasada para no adelantarse a la iteración del usuario.
