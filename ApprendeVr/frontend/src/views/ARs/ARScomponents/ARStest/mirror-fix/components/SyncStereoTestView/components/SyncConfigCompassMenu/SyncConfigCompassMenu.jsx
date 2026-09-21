import React from 'react';
import { useVRLanguage } from '../../../../../../../../../components/VRConfig/VRLanguageContext';

// Requerimiento 013: brújula 3D que reemplaza al botón ☰ + panel fijo (SyncConfigMenu.jsx en su
// esquina superior izquierda) por un menú integrado en la propia escena de AR-SYNC. Mismo patrón
// `srcDoc` que VRConeOverlaySync.jsx (contenido autocontenido, sin depender de rutas servidas por
// Vite, ver skill overlay-ar-sync-aframe) y mismo mecanismo propio de gaze/dwell/click que
// VRConeOverlaySync.jsx/VRLocalVideoOverlaySync.jsx (Requerimiento 012: el pipeline nativo
// `cursor`/`fusing` de A-Frame no dispara en este contexto, así que se reimplementa a mano,
// agrupando por elemento — no por mesh — como corrigió el commit dea919b).
//
// Geometría:
//  - Círculo en el suelo con 4 porciones tipo "torta" (cuartos de cilindro, theta-length: 90°),
//    agrupadas en `#compass-wheel` (rotable en Y). Las 4 son de un único tipo "panel"
//    (Configuración, Overlays, Interfaz, EXIT): cada una muestra/oculta el grupo correspondiente
//    de `#settings-panel` (geometría 3D de esta misma escena, ver más abajo), anclado y tangente a
//    su propia bisectriz. Dentro del grupo "EXIT" (ver buildExitGroupHTML), las filas "Volver"/
//    "Cerrar sesión" abren `#confirm-panel` con el mensaje correspondiente en vez de disparar la
//    acción directo (pedido del usuario, evita un click accidental) — recién al confirmar se manda
//    `compass-do-action`. "Volver" reemplaza al botón "Volver" que tenía SyncStereoTestView.jsx;
//    "Cerrar sesión" reemplaza al botón "← Volver a inicio" de ARTestMirrorButton.jsx mientras
//    AR-SYNC está abierto (ver ese archivo).
//  - Triángulo de norte: entidad FIJA (no rota con el grupo), marca el punto de referencia/frente
//    de la brújula — no es orientación geomagnética real (ver "No incluido" en el requerimiento).
//  - Dos flechas `.clickable` que rotan `#compass-wheel` 360°/N grados por activación (N =
//    secciones = 4 hoy, o sea 90° por paso), con click directo y con apuntado sostenido (dwell).
//
// Panel de sección (Configuración/Overlays): pedido explícito del usuario tras la primera pasada
// — "el panel que se despliega debe ser un elemento 3D no 2D, debe poder interactuar con el
// cursor del raycaster" — así que, a diferencia de la primera versión (HTML 2D de
// SyncConfigMenu.jsx, mostrado por SyncStereoTestView.jsx), el panel es geometría A-Frame más
// dentro de esta misma escena (`#settings-panel`, ver más abajo), con sus propios botones
// `.clickable` (steppers +/- para separación/ancho/alto, filas clickeables para cada overlay)
// usando el mismo mecanismo de gaze/dwell/click de arriba. Como el ESTADO real (separación,
// ancho, alto, overlays seleccionados, guardado) vive en `SyncStereoTestView.jsx` (que sí puede
// hacer `getUserSetting`/`saveUserSetting`, ver comentario del widget de posición más abajo), el
// panel solo cachea localmente lo último que le llegó por `compass-config-state` y manda deltas
// (`compass-update-separation/width/height`, `compass-toggle-overlay`,
// `compass-save-config`/`compass-save-overlays`) — mismo patrón que el widget de posición.
//
// El panel NO es hijo de `<a-camera>`: si lo fuera, todos sus botones quedarían siempre en el
// mismo punto de la pantalla (el centro, junto con el reticle) al moverse en bloque con la
// cámara, y nunca se podría apuntar a un botón distinto de otro girando la cabeza. Vive en
// coordenadas de la escena, como la brújula (hijo de `#compass-root`), tirado plano contra el
// suelo (`rotation="-90 0 0"` en el grupo entero, igual criterio que el círculo/las flechas) para
// que cada botón ocupe una posición angular/distancia distinta que el usuario pueda mirar.
//
// Widget de posición (marcador 📍 + d-pad, mismo patrón visual que `createWidget` de
// vrPositionControl.js — Requerimiento 010 — pero reimplementado acá porque ese archivo asume la
// escena de producción `src/views/A-frame` vía imports de módulo, que no resuelven dentro de un
// `srcDoc` autocontenido): mueve `#compass-root` con botones (click directo, sin dwell — mismo
// criterio que vrPositionControl.js, es una herramienta manual, no pensada para gaze/VR). Como
// este componente no puede hacer `fetch`/`import` directo a `vrUserSettingsApi.util.js` dentro
// del `srcDoc`, la persistencia real vive en `SyncStereoTestView.jsx` (que sí tiene ese import):
// el widget solo pide/envía la posición por postMessage (`compass-ready`, `compass-set-position`,
// `compass-save-position`) — ver esa vista para el `getUserSetting`/`saveUserSetting`.
//
// Componente de prueba aislado, no se usa desde ningún archivo de producción.
// Pedido del usuario (ampliación, sección 11 del requerimiento): quinta porción "Interfaz", con
// una opción "Position" que activa los marcadores rojos de vrPositionControl.js y muestra su
// d-pad al lado de la brújula.
// Pedido del usuario (ampliación posterior): "Volver" y "Cerrar sesión" ya no son dos porciones
// tipo "action" sueltas (que solo abrían el modal fijo `#confirm-panel`, sin un panel propio
// anclado a su porción como el resto) — se consolidan en UNA porción "EXIT" tipo "panel" (mismo
// mecanismo genérico que Configuración/Overlays/Interfaz: panel anclado y tangente a su bisectriz,
// ver PANEL_RADIUS/SECTION_BISECTOR), con las dos opciones como filas dentro de ese panel (ver
// buildExitGroupHTML) — cada fila sigue abriendo `#confirm-panel` antes de ejecutar la acción,
// igual que antes. Por eso ya no queda ninguna porción tipo "action": las 4 son "panel", ángulo
// fijo de 360/4 = 90° cada una (WEDGE_THETA_LENGTH = 360 / SECTIONS.length, más abajo).
const SECTIONS = [
  { key: 'config', labelKey: 'arsConfig.tab.config', thetaStart: 0, type: 'panel' },
  { key: 'overlays', labelKey: 'arsConfig.tab.overlays', thetaStart: 90, type: 'panel' },
  { key: 'interface', labelKey: 'arsConfig.tab.interface', thetaStart: 180, type: 'panel' },
  { key: 'exit', labelKey: 'arsConfig.tab.exit', thetaStart: 270, type: 'panel' },
];
const WEDGE_THETA_LENGTH = 360 / SECTIONS.length;
const STEP_DEG = WEDGE_THETA_LENGTH;
const RADIUS = 1.2;
// Pedido del usuario: las 4 porciones comparten el mismo gris transparente (ya no un color
// distinto por sección — la etiqueta de texto es lo que las distingue), y el círculo pasa a ser
// una dona (hueco circular en el centro) en vez de un disco completo.
const WEDGE_COLOR = '#888888';
const WEDGE_OPACITY = 0.45;
const RING_INNER_RADIUS = RADIUS * 0.4;
// Pedido del usuario (ampliación): el panel de la sección activa (Configuración/Overlays/
// Interfaz) ya no vive en un punto fijo — se ancla a la MISMA bisectriz angular que su porción
// (ver SECTION_BISECTOR más abajo) y queda TANGENTE al círculo de la brújula en ese punto, por su
// borde INFERIOR (no el lateral — pedido explícito del usuario, para que se lea bien desde el
// centro del menú).
const PANEL_WIDTH = 2.2;
// Requerimiento 016: 5.2 → 5.8. La pestaña "Interfaz" suma una segunda fila de toggle ("Cursor",
// debajo de "Position", con un margen extra pedido por el usuario — ver TOGGLE_ROW_MARGIN), que
// empuja el contenido de los d-pads más abajo — con 5.2 el botón Guardar del d-pad de Position
// quedaba recortado por el borde inferior del panel (mismo síntoma ya documentado al agregar la
// fila "Scale").
const PANEL_HEIGHT = 5.8;
// Hallazgo real (verificado dos veces: primero midiendo en el navegador, después con una réplica
// exacta de la composición de matrices de rotación de THREE.js hecha aparte para confirmarlo sin
// depender del navegador — ambas coinciden): con `rotation="-90 0 0"` en #settings-panel (el
// primer intento), el eje LOCAL X (ancho) queda alineado radialmente y el Y (alto) queda
// tangencial — el borde que tocaba el círculo era el LATERAL izquierdo, no el inferior. Con
// `rotation="-90 0 -90"` (ver más abajo, en #settings-panel) el mapeo se invierte limpiamente:
// alto → radial, ancho → tangencial, y además con el signo correcto (Y negativo, la parte de
// abajo del panel donde está el botón Guardar, queda MÁS CERCA del centro) — así que ahora el
// radio se calcula con PANEL_HEIGHT, no PANEL_WIDTH.
const PANEL_RADIUS = RADIUS + PANEL_HEIGHT / 2;
// Pedido del usuario (ampliación): el panel de confirmación de la sección "EXIT" (Volver/Cerrar
// sesión) ahora se ancla/tangencia igual que el panel de configuración de cada sección (ver
// #settings-panel-anchor más abajo) — misma rotación "-90 0 -90" y mismo patrón de radio por borde
// inferior, pero con su propia altura (más baja que PANEL_HEIGHT), de ahí un radio propio.
const CONFIRM_PANEL_WIDTH = 2.2;
const CONFIRM_PANEL_HEIGHT = 1.55;
const CONFIRM_PANEL_RADIUS = RADIUS + CONFIRM_PANEL_HEIGHT / 2;
// Ubicación pedida por el usuario: el menú (compass-root) en el origen de la escena, la cámara
// directamente arriba mirando hacia abajo — en vez del esquema anterior (menú a GROUND_Z=-4 frente
// a una cámara a la altura de los ojos, CAMERA_Y=1.8, mirando casi horizontal).
const MENU_POSITION = { x: 0, y: 0, z: 0 };
const CAMERA_POSITION = { x: 0, y: 3, z: 0 };

// Campos de la pestaña "Configuración" — mismos rangos/paso que tenían los `<input type="range">`
// de SyncConfigMenu.jsx (min/max), ahora como steppers +/- discretos (no hay precedente de
// slider arrastrable en 3D en este repo, ver requerimiento.md sección 5).
const CONFIG_FIELDS = [
  { key: 'separation', labelKey: 'config.separation', min: 0, max: 100, step: 4 },
  { key: 'width', labelKey: 'config.width', min: 200, max: 900, step: 20 },
  { key: 'height', labelKey: 'config.height', min: 200, max: 900, step: 20 },
];
// Mismas 4 claves que `OVERLAY_OPTIONS` de SyncConfigMenu.jsx — se duplica acá (en vez de
// importarla) porque ese componente ya no se usa como panel (ver SyncStereoTestView.jsx) y este
// archivo no depende de él. `*Short` son etiquetas cortas nuevas (ver locales) — las descripciones
// largas existentes (`syncConfig.overlay.camera`, etc.) no entran en una fila angosta de 3D.
const OVERLAY_OPTIONS = [
  { key: 'camera', labelKey: 'syncConfig.overlay.cameraShort' },
  { key: 'video', labelKey: 'syncConfig.overlay.videoShort' },
  { key: 'cone', labelKey: 'syncConfig.overlay.coneShort' },
  { key: 'karaoke', labelKey: 'syncConfig.overlay.karaokeShort' },
  { key: 'youtubeVideo', labelKey: 'syncConfig.overlay.youtubeVideoShort' },
  // Overlay "Song Text": letra de la canción seleccionada, sincronizada con la reproducción.
  { key: 'songText', labelKey: 'syncConfig.overlay.songTextShort' },
  // Requerimiento 014 (ampliación): "New Song" separado de "karaoke" como overlay independiente
  // (antes solo se podía ocultar/mostrar junto con la lista de canciones) — pedido del usuario.
  { key: 'newSong', labelKey: 'syncConfig.overlay.newSongShort' },
];

// Grupo "Configuración": título/cerrar/sesión arriba, filas de valor + steppers, guardar abajo —
// mismos offsets relativos que ocuparía un panel HTML vertical (ver comentario grande sobre por
// qué esto funciona igual una vez el grupo entero se tira plano contra el suelo).
function buildConfigGroupHTML() {
  const rows = CONFIG_FIELDS.map((field, i) => {
    const y = 0.25 - i * 0.4;
    return `
      <a-text data-field-label="${field.key}" align="center" color="#ffffff" width="2.6" position="0 ${(y + 0.16).toFixed(2)} 0.02"></a-text>
      <a-plane class="clickable" data-step="${field.key}" data-dir="-1" width="0.32" height="0.28" color="#333333" material="shader: flat; side: double;" position="-0.85 ${y.toFixed(2)} 0.01"><a-text value="-" align="center" color="#fff" width="6" position="0 0 0.01"></a-text></a-plane>
      <a-plane class="clickable" data-step="${field.key}" data-dir="1" width="0.32" height="0.28" color="#333333" material="shader: flat; side: double;" position="0.85 ${y.toFixed(2)} 0.01"><a-text value="+" align="center" color="#fff" width="6" position="0 0 0.01"></a-text></a-plane>
    `;
  }).join('\n');
  // Fila "Doble panel" (pedido del usuario): togglea si SyncStereoTestView.jsx renderiza los dos
  // paneles estéreo o uno solo, centrado, para ver mejor sin gafas VR. Misma fila clickeable +
  // check a la derecha que ya usa buildOverlaysGroupHTML() (toda la fila, no un cuadradito chico),
  // debajo de los 3 steppers y antes del botón Guardar — comparte el mismo botón/persistencia de
  // "Guardar" que separación/ancho/alto (ver SyncStereoTestView.jsx: CONFIG_SETTINGS_VIEW).
  return `
    <a-entity id="settings-config-group" visible="false">
      ${rows}
      <a-plane class="clickable" id="settings-dual-panel-toggle" width="1.9" height="0.28" color="#333333" material="shader: flat; side: double;" position="0 -0.90 0.01">
        <a-text id="settings-dual-panel-label" value="" align="left" color="#ffffff" width="5" position="-0.9 0 0.01"></a-text>
        <a-text id="settings-dual-panel-check" value="" align="right" color="#69F0AE" width="5" position="0.9 0 0.01"></a-text>
      </a-plane>
      <a-plane class="clickable" id="settings-save-config-btn" width="1.0" height="0.34" color="#2e7d32" material="shader: flat; side: double;" position="0 -1.25 0.01">
        <a-text id="settings-save-config-label" align="center" color="#fff" width="0.9" wrap-count="10" position="0 0 0.01"></a-text>
      </a-plane>
      <a-text id="settings-save-config-sub" align="center" color="#999999" width="3.2" position="0 -1.50 0.01"></a-text>
    </a-entity>
  `;
}

// Grupo "Overlays": una fila clickeable por overlay (toda la fila alterna, no solo un cuadradito
// — más fácil de apuntar con la mirada que un checkbox chico), con un check a la derecha cuando
// está seleccionado.
function buildOverlaysGroupHTML() {
  const rows = OVERLAY_OPTIONS.map((opt, i) => {
    const y = 0.35 - i * 0.32;
    return `
      <a-plane class="clickable" data-overlay-toggle="${opt.key}" width="1.9" height="0.28" color="#333333" material="shader: flat; side: double;" position="0 ${y.toFixed(2)} 0.01">
        <a-text data-overlay-label="${opt.key}" value="__LABEL_overlay_${opt.key}__" align="left" color="#ffffff" width="5" position="-0.9 0 0.01"></a-text>
        <a-text data-overlay-check="${opt.key}" value="" align="right" color="#69F0AE" width="5" position="0.9 0 0.01"></a-text>
      </a-plane>
    `;
  }).join('\n');
  // Botón/subtexto reubicados en función de `OVERLAY_OPTIONS.length` (antes, posición fija
  // "0 -1.0 0.01"): con la 5ta clave agregada (youtubeVideo) la última fila caía en y=-0.93, casi
  // pegada al botón fijo de antes — se separan dinámicamente para que agregar overlays a futuro no
  // vuelva a producir este mismo solapamiento.
  const lastRowY = 0.35 - (OVERLAY_OPTIONS.length - 1) * 0.32;
  const btnY = lastRowY - 0.4;
  const subY = btnY - 0.27;
  return `
    <a-entity id="settings-overlays-group" visible="false">
      ${rows}
      <a-plane class="clickable" id="settings-save-overlays-btn" width="1.0" height="0.34" color="#2e7d32" material="shader: flat; side: double;" position="0 ${btnY.toFixed(2)} 0.01">
        <a-text id="settings-save-overlays-label" align="center" color="#fff" width="0.9" wrap-count="10" position="0 0 0.01"></a-text>
      </a-plane>
      <a-text id="settings-save-overlays-sub" align="center" color="#999999" width="3.2" position="0 ${subY.toFixed(2)} 0.01"></a-text>
    </a-entity>
  `;
}

// Pedido del usuario (ampliación, sección 11): grupo "Interfaz" — una fila "Position" (mismo
// patrón checkbox-fila que buildOverlaysGroupHTML()) que activa/desactiva los marcadores rojos de
// vrPositionControl.js en el overlay real (mensaje 'compass-toggle-position-mode', ver
// SyncStereoTestView.jsx), y debajo un d-pad genérico X/Y/Z (mismo patrón de steppers que
// buildConfigGroupHTML()) que solo se muestra cuando hay un elemento seleccionado
// ('position-element-selected', al clickear un marcador en el overlay). A diferencia de los
// steppers de Configuración (`data-step`, `fieldStep()` busca en CONFIG_FIELDS), estos usan
// `data-position-step` — un atributo distinto a propósito, para no colarse en ese handler
// compartido, que no sabe nada de ejes x/y/z.
const POSITION_AXES = ['x', 'y', 'z'];
// Paso INICIAL, ajustable en vivo por el usuario con su propia fila "+/-" (pedido: "el paso o
// valor de edición para aplicar") — a diferencia del widget original de vrPositionControl.js, que
// tenía un input HTML editable proyectado sobre el d-pad, acá es una fila más del panel (mismo
// patrón que el resto), sin reconstruir ese sistema de proyección mundo→pantalla dentro del
// iframe. Rango acotado para que no se vaya a un extremo inútil (0 o gigante) por error.
const DEFAULT_POSITION_STEP = 0.25;
const POSITION_STEP_RANGE = { min: 0.05, max: 5 };
const POSITION_STEP_INCREMENT = 0.05;

// Requerimiento 016: opción "Cursor" — apariencia/comportamiento de `#main-cursor` (el único
// reticle visible de AR-SYNC, ver el script de dwell más abajo). A diferencia de "Position" (que
// edita un elemento ANCLADO AL MUNDO seleccionado en el overlay real), acá no hay "elemento a
// seleccionar": el cursor es siempre el mismo, único, y su `position` es relativa a la cámara
// (`#main-cursor` es hijo de `<a-camera>`, ver `position="0 0 -1"`), no una coordenada de escena.
const CURSOR_POSITION_AXES = ['x', 'y', 'z'];
// Pedido del usuario: el incremento de posición/escala es ajustable en vivo (propia fila "+/-",
// igual que "Paso" en Position), no un valor fijo — mismo patrón que
// DEFAULT_POSITION_STEP/POSITION_STEP_RANGE/POSITION_STEP_INCREMENT, incluida la decisión de
// Position de que un solo "step" cubra varios controles a la vez (ahí posición+rotación+escala;
// acá posición+escala — el tiempo de activación queda con su propio incremento fijo,
// CURSOR_FUSE_STEP, porque es una unidad distinta, milisegundos, no espacial).
const DEFAULT_CURSOR_STEP = 0.02;
const CURSOR_STEP_RANGE = { min: 0.01, max: 1 };
const CURSOR_STEP_INCREMENT = 0.01;
const CURSOR_SCALE_RANGE = { min: 0.2, max: 5 };
const CURSOR_FUSE_STEP = 250;
const CURSOR_FUSE_RANGE = { min: 500, max: 5000 };
// Sin precedente de color picker libre en esta UI 3D (ver requerimiento.md sección 5) — paleta
// fija cíclica (+/-), mismo patrón de interacción que el resto del menú.
const CURSOR_COLORS = ['#ffffff', '#ff5252', '#69f0ae', '#448aff', '#ffd740', '#18ffff'];
// 'point'/'square'/'triangle' son primitives nativos de A-Frame con radios/tamaños chicos; 'cross'
// no tiene primitive nativo — se resuelve con dos <a-plane> hijos de #main-cursor cruzados en 90°
// (#cursor-cross-h/#cursor-cross-v, ver el <a-cursor> más abajo), mostrados solo para esa opción.
const CURSOR_GEOMETRIES = ['point', 'square', 'triangle', 'cross'];
const DEFAULT_CURSOR_CONFIG = {
  position: [0, 0, -1],
  scale: 1,
  fuseTimeout: 2500,
  color: '#ffffff',
  geometry: 'point',
  visible: true,
};
// Fila genérica reusada por posición (data-position-step) y rotación (data-rotation-step) — misma
// forma visual que un CONFIG_FIELDS, con un atributo distinto por tipo a propósito (para que el
// handler de clicks de cada uno no se pise con el otro ni con `data-step` de Configuración).
function buildAxisStepperRow(dataAttr, axis, y) {
  return `
    <a-text data-${dataAttr}-label="${axis}" align="center" color="#ffffff" width="2.6" position="0 ${y.toFixed(2)} 0.02"></a-text>
    <a-plane class="clickable" data-${dataAttr}="${axis}" data-dir="-1" width="0.32" height="0.26" color="#333333" material="shader: flat; side: double;" position="-0.55 ${y.toFixed(2)} 0.01"><a-text value="-" align="center" color="#fff" width="6" position="0 0 0.01"></a-text></a-plane>
    <a-plane class="clickable" data-${dataAttr}="${axis}" data-dir="1" width="0.32" height="0.26" color="#333333" material="shader: flat; side: double;" position="0.55 ${y.toFixed(2)} 0.01"><a-text value="+" align="center" color="#fff" width="6" position="0 0 0.01"></a-text></a-plane>
  `;
}
// Requerimiento 016: fila numérica genérica de una sola línea con label + "-"/"+" (mismo patrón
// visual que `stepRow`/`scaleRow` de más abajo, factorizado para no repetirlo 3 veces más con la
// fila "Cursor": escala, tiempo de activación, y como base de las filas cíclicas de color/
// geometría, que reusan la misma forma pero sin semántica numérica).
function buildStepperRow(idPrefix, y) {
  return `
    <a-text id="${idPrefix}-label" align="center" color="#ffffff" width="2.6" position="0 ${y.toFixed(2)} 0.02"></a-text>
    <a-plane class="clickable" id="${idPrefix}-minus" width="0.32" height="0.26" color="#333333" material="shader: flat; side: double;" position="-0.55 ${y.toFixed(2)} 0.01"><a-text value="-" align="center" color="#fff" width="6" position="0 0 0.01"></a-text></a-plane>
    <a-plane class="clickable" id="${idPrefix}-plus" width="0.32" height="0.26" color="#333333" material="shader: flat; side: double;" position="0.55 ${y.toFixed(2)} 0.01"><a-text value="+" align="center" color="#fff" width="6" position="0 0 0.01"></a-text></a-plane>
  `;
}

// Requerimiento 016: contenido del sub-panel "Cursor" — reusa el MISMO rango vertical (`y`) que
// `position-dpad-group` porque los dos son mutuamente excluyentes (ver los click handlers: abrir
// uno cierra el otro), así que nunca compiten por espacio en pantalla al mismo tiempo. Sin
// "elemento seleccionado" (no hay nada que elegir, el cursor es siempre el mismo, único), pero sí
// con su propia fila "Paso" (pedido del usuario: poder ajustar el incremento de posición/escala,
// mismo patrón que "Paso" en Position) — más posición x/y/z (relativa a la cámara, ver comentario
// de CURSOR_POSITION_AXES), escala, tiempo de activación, color y geometría (ambos cíclicos +/-),
// visibilidad (toggle), y Guardar/Cancel. 9 filas en total, mismo presupuesto que
// `position-dpad-group` (elementLabel+step+3pos+3rot+scale).
function buildCursorDpadGroupHTML(startY) {
  const ROW_SPACING = 0.28;
  let y = startY;
  const stepRowY = y; y -= ROW_SPACING;
  const positionRowsY = CURSOR_POSITION_AXES.map(() => { const rowY = y; y -= ROW_SPACING; return rowY; });
  const scaleRowY = y; y -= ROW_SPACING;
  const fuseRowY = y; y -= ROW_SPACING;
  const colorRowY = y; y -= ROW_SPACING;
  const geometryRowY = y; y -= ROW_SPACING;
  const visibleRowY = y; y -= ROW_SPACING;
  const saveY = y - 0.06;

  const stepRow = buildStepperRow('dpad-cursor-step', stepRowY);
  const positionRows = CURSOR_POSITION_AXES.map((axis, i) => buildAxisStepperRow('cursor-position-step', axis, positionRowsY[i])).join('\n');
  const scaleRow = buildStepperRow('dpad-cursor-scale', scaleRowY);
  const fuseRow = buildStepperRow('dpad-cursor-fuse', fuseRowY);
  const colorRow = buildStepperRow('dpad-cursor-color', colorRowY);
  const geometryRow = buildStepperRow('dpad-cursor-geometry', geometryRowY);

  return `
    <a-entity id="cursor-dpad-group" visible="false">
      ${stepRow}
      ${positionRows}
      ${scaleRow}
      ${fuseRow}
      ${colorRow}
      ${geometryRow}
      <a-plane class="clickable" id="settings-cursor-visible-toggle" width="1.9" height="0.26" color="#333333" material="shader: flat; side: double;" position="0 ${visibleRowY.toFixed(2)} 0.01">
        <a-text id="settings-cursor-visible-label" value="" align="left" color="#ffffff" width="5" position="-0.9 0 0.01"></a-text>
        <a-text id="settings-cursor-visible-check" value="" align="right" color="#69F0AE" width="5" position="0.9 0 0.01"></a-text>
      </a-plane>
      <a-plane class="clickable" id="dpad-cursor-save-btn" width="0.9" height="0.34" color="#2e7d32" material="shader: flat; side: double;" position="-0.55 ${saveY.toFixed(2)} 0.01">
        <a-text id="dpad-cursor-save-label" align="center" color="#fff" width="0.9" wrap-count="10" position="0 0 0.01"></a-text>
      </a-plane>
      <a-plane class="clickable" id="dpad-cursor-cancel-btn" width="0.9" height="0.34" color="#333333" material="shader: flat; side: double;" position="0.55 ${saveY.toFixed(2)} 0.01">
        <a-text id="dpad-cursor-cancel-label" align="center" color="#fff" width="0.9" wrap-count="10" position="0 0 0.01"></a-text>
      </a-plane>
    </a-entity>
  `;
}

function buildInterfaceGroupHTML() {
  // Todo el layout vertical calculado con un solo paso fijo entre filas — agregar/quitar filas acá
  // no requiere retocar posiciones a mano en el resto del bloque.
  const ROW_SPACING = 0.28;
  // Pedido del usuario: un margen extra (no solo ROW_SPACING) entre la fila "Position" y la fila
  // "Cursor" — separa visualmente los dos toggles en vez de quedar pegados uno al otro.
  const TOGGLE_ROW_MARGIN = 0.08;
  const positionToggleY = 0.55;
  const cursorToggleY = positionToggleY - ROW_SPACING - TOGGLE_ROW_MARGIN;
  // Requerimiento 016: el contenido de los d-pads arranca un ROW_SPACING + TOGGLE_ROW_MARGIN más
  // abajo que antes de agregar la fila "Cursor" (ver PANEL_HEIGHT, ajustado en consecuencia).
  let y = cursorToggleY - 0.21; // mismo gap (0.21) que ya usaba "Position" hacia su propio contenido
  // Hallazgo real (reportado por el usuario tras la primera versión de este panel): la etiqueta
  // del elemento seleccionado estaba hardcodeada en y=0.13, casi pegada a la fila de posición X
  // (que con el layout de esta ampliación cae cerca de ese mismo valor) — ahora es una fila más
  // de la MISMA secuencia calculada, así que nunca puede volver a chocar con la siguiente.
  const elementLabelY = y; y -= ROW_SPACING;
  const stepRowY = y; y -= ROW_SPACING;
  const positionRowsY = POSITION_AXES.map(() => { const rowY = y; y -= ROW_SPACING; return rowY; });
  const rotationRowsY = POSITION_AXES.map(() => { const rowY = y; y -= ROW_SPACING; return rowY; });
  // Pedido del usuario: fila "Scale" para agrandar/achicar el elemento seleccionado (motivación
  // concreta: agrandar el overlay "Youtube Video" para verlo mejor) — un solo valor uniforme, no
  // por eje (a diferencia de posición/rotación), así que reusa el patrón de fila única de `stepRow`
  // en vez de `buildAxisStepperRow`.
  const scaleRowY = y; y -= ROW_SPACING;
  const saveY = y - 0.06;

  const stepRow = buildStepperRow('dpad-step', stepRowY);
  const positionRows = POSITION_AXES.map((axis, i) => buildAxisStepperRow('position-step', axis, positionRowsY[i])).join('\n');
  const rotationRows = POSITION_AXES.map((axis, i) => buildAxisStepperRow('rotation-step', axis, rotationRowsY[i])).join('\n');
  const scaleRow = buildStepperRow('dpad-scale', scaleRowY);

  // Requerimiento 016: sub-panel "Cursor" reusa el mismo rango vertical que `position-dpad-group`
  // (empieza en el mismo `y` calculado arriba, antes de que el cascade de arriba lo fuera
  // decrementando) — ver `buildCursorDpadGroupHTML`.
  const cursorDpadGroupStartY = cursorToggleY - 0.21;
  const cursorDpadGroup = buildCursorDpadGroupHTML(cursorDpadGroupStartY);

  return `
    <a-entity id="settings-interface-group" visible="false">
      <a-plane class="clickable" id="settings-position-toggle" width="1.9" height="0.28" color="#333333" material="shader: flat; side: double;" position="0 ${positionToggleY.toFixed(2)} 0.01">
        <a-text id="settings-position-label" value="" align="left" color="#ffffff" width="5" position="-0.9 0 0.01"></a-text>
        <a-text id="settings-position-check" value="" align="right" color="#69F0AE" width="5" position="0.9 0 0.01"></a-text>
      </a-plane>
      <a-plane class="clickable" id="settings-cursor-toggle" width="1.9" height="0.28" color="#333333" material="shader: flat; side: double;" position="0 ${cursorToggleY.toFixed(2)} 0.01">
        <a-text id="settings-cursor-toggle-label" value="" align="left" color="#ffffff" width="5" position="-0.9 0 0.01"></a-text>
        <a-text id="settings-cursor-toggle-check" value="" align="right" color="#69F0AE" width="5" position="0.9 0 0.01"></a-text>
      </a-plane>
      <a-entity id="position-dpad-group" visible="false">
        <a-text id="dpad-element-label" align="center" color="#4FC3F7" width="2.6" position="0 ${elementLabelY.toFixed(2)} 0.01"></a-text>
        ${stepRow}
        ${positionRows}
        ${rotationRows}
        ${scaleRow}
        <!-- Pedido del usuario (ampliación): botón "Cancel" junto a "Guardar" — restaura la
             posición/rotación del elemento seleccionado a su último valor guardado (la fuente de
             verdad es vrPositionControl.js, que es quien conoce el snapshot guardado; ver mensaje
             'position-reset' en SyncStereoTestView.jsx/aframe-overlay-modules.js). -->
        <a-plane class="clickable" id="dpad-save-btn" width="0.9" height="0.34" color="#2e7d32" material="shader: flat; side: double;" position="-0.55 ${saveY.toFixed(2)} 0.01">
          <a-text id="dpad-save-label" align="center" color="#fff" width="0.9" wrap-count="10" position="0 0 0.01"></a-text>
        </a-plane>
        <a-plane class="clickable" id="dpad-cancel-btn" width="0.9" height="0.34" color="#333333" material="shader: flat; side: double;" position="0.55 ${saveY.toFixed(2)} 0.01">
          <a-text id="dpad-cancel-label" align="center" color="#fff" width="0.9" wrap-count="10" position="0 0 0.01"></a-text>
        </a-plane>
      </a-entity>
      ${cursorDpadGroup}
    </a-entity>
  `;
}

// Pedido del usuario (ampliación): grupo "EXIT" — reemplaza a las antiguas porciones "action"
// sueltas (Volver/Cerrar sesión). Mismo patrón de fila clickeable que buildOverlaysGroupHTML()
// (toda la fila, no un botón chico); a diferencia de esas filas, estas no togglean nada — cada
// click llama directo a "window.__requestConfirm(action)" (mismo modal `#confirm-panel` que ya
// usaban las porciones "action"), no manda postMessage al padre.
function buildExitGroupHTML() {
  return `
    <a-entity id="settings-exit-group" visible="false">
      <a-plane class="clickable" data-exit-action="back" width="1.9" height="0.28" color="#333333" material="shader: flat; side: double;" position="0 0.35 0.01">
        <a-text id="settings-exit-back-label" align="left" color="#ffffff" width="5" position="-0.9 0 0.01"></a-text>
      </a-plane>
      <a-plane class="clickable" data-exit-action="logout" width="1.9" height="0.28" color="#333333" material="shader: flat; side: double;" position="0 0.03 0.01">
        <a-text id="settings-exit-logout-label" align="left" color="#ffffff" width="5" position="-0.9 0 0.01"></a-text>
      </a-plane>
    </a-entity>
  `;
}

// Panel completo: fondo + título + cerrar + sesión + los grupos de arriba (uno visible a la
// vez, según qué porción se activó). Se ubica 3m al frente del origen (misma dirección -Z en la
// que ya mira la cámara por defecto, ver CAMERA_POSITION/pitch inicial) para que aparezca cerca de
// donde el usuario ya está mirando al bajar la vista hacia la brújula, no en un punto arbitrario.
function buildSettingsPanelHTML() {
  return `
    <!-- position "0 0 0" (no "0 0.02 -3" como antes): el offset radial ahora lo pone el ancla
         "#settings-panel-anchor" (ver más abajo, donde se inserta esto), que además es hijo de
         #compass-wheel para que el panel gire CON la rueda y quede siempre junto a su sección —
         pedido del usuario. -->
    <!-- rotation "-90 0 -90" (no "-90 0 0"): el -90 extra en Z es lo que invierte cuál de los dos
         ejes locales (ancho/alto) queda radial — ver el comentario grande junto a PANEL_RADIUS
         más arriba para la derivación completa. -->
    <a-entity id="settings-panel" visible="false" rotation="-90 0 -90" position="0 0 0">
      <!-- height 5.2 (no 3.2): el grupo "Interfaz" ahora tiene etiqueta de elemento + fila "Step"
           + 3 filas de posición + 3 de rotación + fila "Scale" + Guardar (9 filas en total) — las
           demás secciones (Configuración/Overlays) quedan con más margen libre abajo, sin
           problema. Pedido del usuario: fila "Scale" para agrandar/achicar el elemento
           seleccionado (motivación concreta: agrandar el overlay "Youtube Video"). Con 4.6 (el
           valor anterior, pensado para 8 filas) el botón Guardar quedaba recortado por el borde
           inferior del panel al agregar esta 9na fila. -->
      <a-plane width="${PANEL_WIDTH}" height="${PANEL_HEIGHT}" color="#1a1a1a" opacity="0.95" material="shader: flat; side: double;" position="0 0 0"></a-plane>
      <a-text id="settings-title" align="center" color="#4FC3F7" width="2.6" position="0 0.9 0.01"></a-text>
      <!-- z=0.02 (no 0.01, como el título/sesión): el título centrado puede llegar a extenderse
           hasta esta zona — un botón .clickable necesita quedar sin ambigüedad por delante, ver
           skill aframe-elementos-3d. -->
      <a-plane class="clickable" id="settings-close-btn" width="0.3" height="0.3" color="#333333" material="shader: flat; side: double;" position="0.95 0.9 0.02">
        <a-text value="X" align="center" color="#fff" width="6" position="0 0 0.01"></a-text>
      </a-plane>
      <a-text id="settings-session" align="center" color="#999999" width="2.4" position="0 0.65 0.01"></a-text>
      ${buildConfigGroupHTML()}
      ${buildOverlaysGroupHTML()}
      ${buildInterfaceGroupHTML()}
      ${buildExitGroupHTML()}
    </a-entity>
  `;
}

// Panel de confirmación (pedido del usuario) para las filas "Volver"/"Cerrar sesión" del panel
// "EXIT" (ver buildExitGroupHTML) — un click en esas filas ya no dispara la acción directo,
// primero abre este panel con el mensaje correspondiente y espera Confirmar/Cancelar.
//
// Pedido del usuario (ampliación): ya no vive en un punto fijo — se ancla/tangencia a la sección
// "EXIT" igual que el panel de configuración de cada sección (ver #settings-panel-anchor en el
// srcDoc). Por eso ahora lleva la MISMA rotación "-90 0 -90" (no "-90 0 0") y `position="0 0 0"`
// (el offset radial lo pone su ancla `#confirm-panel-anchor` + el entity interno que lo empuja
// CONFIRM_PANEL_RADIUS hacia afuera). Nunca está abierto a la vez que #settings-panel (ver
// __requestConfirm, que cierra este último).
function buildConfirmPanelHTML() {
  return `
    <a-entity id="confirm-panel" visible="false" rotation="-90 0 -90" position="0 0 0">
      <a-plane width="${CONFIRM_PANEL_WIDTH}" height="${CONFIRM_PANEL_HEIGHT}" color="#1a1a1a" opacity="0.95" material="shader: flat; side: double;" position="0 0 0"></a-plane>
      <a-text id="confirm-message" align="center" color="#ffffff" width="2.4" position="0 0.52 0.01"></a-text>
      <!-- Pedido del usuario: mostrar la sesión activa debajo del mensaje de "Cerrar sesión",
           para poder verificar de qué cuenta se está cerrando sesión antes de confirmar. Mismo
           texto (STATIC.loggedInAs/noSession) que ya usa "#settings-session" en la pestaña
           Configuración — ver window.__requestConfirm, más abajo, para cuándo se completa. -->
      <a-text id="confirm-user" align="center" color="#aaaaaa" width="2.0" position="0 0.30 0.01"></a-text>
      <a-plane class="clickable" id="confirm-yes-btn" width="0.95" height="0.34" color="#c62828" material="shader: flat; side: double;" position="-0.55 0.05 0.01">
        <a-text id="confirm-yes-label" align="center" color="#fff" width="6" position="0 0 0.01"></a-text>
      </a-plane>
      <a-plane class="clickable" id="confirm-cancel-btn" width="0.95" height="0.34" color="#333333" material="shader: flat; side: double;" position="0.55 0.05 0.01">
        <a-text id="confirm-cancel-label" align="center" color="#fff" width="6" position="0 0 0.01"></a-text>
      </a-plane>
      <!-- Requerimiento 013 (ampliación): botón de prueba "login-test", visible solo al confirmar
           "Cerrar sesión". Inicia sesión con el usuario de prueba (prueba@gmail.com / 123456) sin
           salir de la vista, para recargar las configuraciones de ese usuario. El login real corre
           en SyncStereoTestView.jsx (compass-do-action name=login-test), no acá — mismo criterio
           que el resto de la persistencia. -->
      <a-plane class="clickable" id="login-test-btn" visible="false" width="1.6" height="0.34" color="#1565C0" material="shader: flat; side: double;" position="0 -0.5 0.01">
        <a-text id="login-test-label" align="center" color="#fff" width="6" position="0 0 0.01"></a-text>
      </a-plane>
    </a-entity>
  `;
}

// Fondo opaco único, debajo de las 4 porciones semitransparentes (hallazgo: con solo el
// material semitransparente de cada porción, el gris de fondo real que se ve depende de qué haya
// detrás en el video de la cámara AR en ese punto — un rincón oscuro del cuarto hace ver esa
// porción más oscura que las demás aunque el color/opacidad de las 4 sea idéntico, ver
// problems_solutions.md del Requerimiento 013. Esta dona debe ser 100% opaca (sin `transparent`
// ni `opacity<1`): a 0.9 el 10% restante dejaba pasar el video AR de fondo y la porción que
// cayera sobre una zona oscura del video se veía más oscura que las demás. Fija el fondo real
// que el gris semitransparente de arriba mezcla, así las 4 porciones se ven iguales sin importar
// qué haya detrás en el AR. Va apenas por debajo (mismo eje Y, normal de esta dona ya que está en
// el mismo plano rotado "-90 0 0") de las porciones de color, no dentro de #compass-wheel para no
// heredar su rotación (es un círculo completo, da igual, pero así queda claro que es fondo fijo).
function buildWedgeBackingHTML() {
  return `
    <a-ring
      radius-inner="${RING_INNER_RADIUS}"
      radius-outer="${RADIUS}"
      color="#222222"
      material="shader: flat;"
      rotation="-90 0 0"
      position="0 -0.01 0">
    </a-ring>
  `;
}

function buildWedgesHTML() {
  // Radio medio de la franja de la dona (entre el hueco y el borde exterior) — ahí es donde va
  // el texto de cada porción, ni pegado al hueco ni al borde.
  const midRadius = (RING_INNER_RADIUS + RADIUS) / 2;
  return buildWedgeBackingHTML() + SECTIONS.map(({ key, thetaStart, type }) => {
    const bisectorDeg = thetaStart + WEDGE_THETA_LENGTH / 2;
    return `
      <!-- Puramente decorativa: SIN clase .clickable ni data-* — pedido del usuario: "el click se
           debe detectar solo en el texto de cada sección", no en toda la porción. 'side: front'
           (no 'double'): con 'transparent: true' y la cámara mirando de costado (no desde arriba),
           'side: double' también renderiza la cara trasera y duplica el blend, así que la porción
           más inclinada respecto a la vista queda más oscura que las demás. -->
      <a-ring
        radius-inner="${RING_INNER_RADIUS}"
        radius-outer="${RADIUS}"
        theta-start="${thetaStart}"
        theta-length="${WEDGE_THETA_LENGTH}"
        color="${WEDGE_COLOR}"
        opacity="${WEDGE_OPACITY}"
        material="shader: flat; side: front; transparent: true;"
        rotation="-90 0 0"
        position="0 0 0">
      </a-ring>
      <!-- Texto y su área de click, ubicados y orientados radialmente (pedido del usuario: "del
           centro hacia afuera"), con 3 rotaciones simples anidadas en vez de una sola compuesta
           (evita tener que adivinar el orden de composición de un Euler "x y z" combinado):
             1. (este a-entity) gira todo el grupo en Y por la bisectriz de la porción — pone el
                eje +Z local de este grupo apuntando radialmente hacia afuera.
             2. (a-entity interno) gira -90 en Y — alinea el eje +X (dirección de lectura del
                texto) con ese +Z radial, y ubica el grupo a mid-radius a lo largo de ese eje.
             3. (a-text/a-plane) gira -90 en X — los tira planos contra el suelo, sin tocar el eje
                +X ya alineado radialmente en el paso 2. -->
      <a-entity rotation="0 ${bisectorDeg.toFixed(2)} 0">
        <a-entity rotation="0 -90 0" position="0 0.02 ${midRadius.toFixed(2)}">
          <a-text
            data-section-label="${key}"
            value="__LABEL_${key}__"
            align="center"
            color="#ffffff"
            width="2.1"
            rotation="-90 0 0">
          </a-text>
        </a-entity>
        <!-- Área de click real: un plano invisible del tamaño del texto, no de toda la porción.
             opacity 0.01 (no 0 exacto) — mismo criterio ya usado en el proyecto para hit-areas
             invisibles pero raycastables (ver mic-icon en VRLocalVideoOverlaySync.jsx): "visible"
             es lo que desactiva el raycaster, la opacidad no. -->
        <a-entity rotation="0 -90 0" position="0 0.01 ${midRadius.toFixed(2)}">
          <a-plane
            class="clickable compass-wedge"
            data-section="${key}"
            data-type="${type}"
            width="1.3" height="0.4"
            material="shader: flat; side: double; transparent: true; opacity: 0.01;"
            rotation="-90 0 0">
          </a-plane>
        </a-entity>
      </a-entity>
    `;
  }).join('\n');
}

const SyncConfigCompassMenuInner = ({ forwardedRef, cursorFuseTimeout = 2500 }) => {
  const { t } = useVRLanguage();
  const saveLabel = t('aframe.positionControl.save');

  const wedgesHTML = SECTIONS.reduce(
    (html, section) => html.replace(`__LABEL_${section.key}__`, t(section.labelKey)),
    buildWedgesHTML(),
  );

  const settingsPanelHTML = OVERLAY_OPTIONS.reduce(
    (html, opt) => html.replace(`__LABEL_overlay_${opt.key}__`, t(opt.labelKey)),
    buildSettingsPanelHTML(),
  );

  const confirmPanelHTML = buildConfirmPanelHTML();

  // Etiquetas estáticas que el script del panel combina en tiempo real con los valores dinámicos
  // recibidos por `compass-config-state` (separación/ancho/alto/email/etc. viven en
  // SyncStereoTestView.jsx, no acá) — mismo criterio que las porciones de la brújula, pero pasadas
  // como JSON a un `<script>` en vez de sustituidas en el HTML, porque se recombinan en cada
  // actualización de estado, no una sola vez al construir el DOM.
  const staticLabels = {
    configTitle: t('arsConfig.tab.config'),
    overlaysTitle: t('arsConfig.tab.overlays'),
    loggedInAs: t('syncConfig.loggedInAs'),
    noSession: t('syncConfig.noSession'),
    deviceMobile: t('syncConfig.deviceMobile'),
    deviceWeb: t('syncConfig.deviceWeb'),
    saveConfig: t('syncConfig.saveConfig'),
    saveOverlays: t('syncConfig.saveOverlays'),
    // Requerimiento 013 (ajuste pedido por el usuario): el botón verde muestra solo "Guardar"
    // (verbo corto, para que no sobresalga lateralmente) y el resto del texto ("selección
    // (Móvil)") va debajo, en una línea aparte.
    saveShort: t('aframe.positionControl.save'),
    saveConfigSub: t('syncConfig.saveConfigSub'),
    saveOverlaysSub: t('syncConfig.saveOverlaysSub'),
    fields: Object.fromEntries(CONFIG_FIELDS.map((f) => [f.key, t(f.labelKey)])),
    dualPanel: t('config.dualPanel'),
    interfaceTitle: t('arsConfig.tab.interface'),
    position: t('config.position'),
    positionAxes: { x: t('config.positionX'), y: t('config.positionY'), z: t('config.positionZ') },
    rotationAxes: { x: t('config.rotationX'), y: t('config.rotationY'), z: t('config.rotationZ') },
    scale: t('config.scale'),
    step: t('config.step'),
    exitTitle: t('arsConfig.tab.exit'),
    exitBack: t('home.back'),
    exitLogout: t('home.logout'),
    // Panel de confirmación (pedido del usuario) — evita que un dwell/click accidental dispare
    // "Volver"/"Cerrar sesión" sin que el usuario lo confirme (ahora disparado desde las filas del
    // panel "EXIT", ver buildExitGroupHTML, no desde una porción propia).
    confirmBack: t('home.confirmBack'),
    confirmLogout: t('home.confirmLogout'),
    confirmYes: t('home.confirmYes'),
    confirmCancel: t('home.confirmCancel'),
    loginTest: t('home.loginTest'),
    // Requerimiento 016: fila "Cursor" y su sub-panel — mismas claves de eje que "Position"
    // (positionAxes), pero acá aplicadas a un offset relativo a la cámara, no a coordenadas de
    // mundo (ver comentario grande junto a CURSOR_POSITION_AXES).
    cursorToggle: t('config.cursor'),
    cursorScale: t('config.scale'),
    cursorFuseTimeout: t('config.cursorFuseTimeout'),
    cursorColor: t('config.cursorColor'),
    cursorGeometry: t('config.cursorGeometry'),
    cursorGeometryNames: {
      point: t('config.cursorGeometryPoint'),
      square: t('config.cursorGeometrySquare'),
      triangle: t('config.cursorGeometryTriangle'),
      cross: t('config.cursorGeometryCross'),
    },
    cursorVisible: t('config.cursorVisible'),
  };

  // Ajuste pedido por el usuario: a diferencia de Requerimiento 012 (donde el pitch inicial SÍ
  // apuntaba al objetivo, ver VRLocalVideoOverlaySync.jsx), acá la vista inicial mira al frente
  // (horizontal, pitch 0) aunque el menú esté abajo — el usuario tiene que bajar la mirada para
  // verlo, como mirar al piso, en vez de arrancar ya apuntándolo.
  const initialCursorPitch = 0;

  const srcDoc = `
    <html>
      <head>
        <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
      </head>
      <body style="margin:0; background:transparent;">
        <a-scene embedded vr-mode-ui="enabled: false" style="width: 100vw; height: 100vh; background: transparent;">
          <a-entity id="compass-root" position="${MENU_POSITION.x} ${MENU_POSITION.y} ${MENU_POSITION.z}">
            <!-- Grupo rotable: las dos porciones tipo torta -->
            <a-entity id="compass-wheel" rotation="0 0 0">
              ${wedgesHTML}
              <!-- Pedido del usuario (ampliación): el panel de la sección activa (Configuración/
                   Overlays/Interfaz) hijo de #compass-wheel, para que gire CON la rueda cuando se
                   usan las flechas — ancla su rotación.y a la bisectriz de la sección que se
                   activó (JS, ver __activateSettingsSection: SECTION_BISECTOR/#settings-panel-anchor),
                   y la entidad interna lo empuja PANEL_RADIUS hacia afuera en esa misma dirección
                   ya rotada — mismo patrón de 2 niveles (rotar, después trasladar en el frame ya
                   rotado) que ya usa buildWedgesHTML() para el texto de cada porción. -->
              <a-entity id="settings-panel-anchor" rotation="0 0 0">
                <a-entity rotation="0 -90 0" position="0 0.02 ${PANEL_RADIUS.toFixed(2)}">
                  ${settingsPanelHTML}
                </a-entity>
              </a-entity>
              <!-- Pedido del usuario (ampliación): el panel de confirmación de "EXIT" se ancla/
                   tangencia igual que el de configuración (mismo patrón de 2 niveles: rotar el
                   ancla a la bisectriz, después empujar CONFIRM_PANEL_RADIUS en el frame rotado).
                   Su ancla (#confirm-panel-anchor) se rota a la bisectriz de "EXIT" en
                   __requestConfirm (ver JS más abajo) — vive dentro de #compass-wheel, así que
                   gira con la rueda junto a su sección, igual que #settings-panel-anchor. -->
              <a-entity id="confirm-panel-anchor" rotation="0 0 0">
                <a-entity rotation="0 -90 0" position="0 0.02 ${CONFIRM_PANEL_RADIUS.toFixed(2)}">
                  ${confirmPanelHTML}
                </a-entity>
              </a-entity>
            </a-entity>

            <!-- Requerimiento 013 (ampliación): botón "X" en el hueco de la dona que
                 muestra/oculta #compass-wheel (pedido del usuario) — vive FUERA de #compass-wheel
                 a propósito, para poder seguir clickeándolo y mostrar el menú de nuevo aunque
                 esté oculto. Con el menú visible aparecen además "+"/"-" a los lados ("+ (X) -")
                 para acercar/alejar #compass-root en Y respecto a la cámara — reusan el mismo
                 mecanismo "data-move" que el d-pad del widget de posición (ver más abajo), así que
                 lo que muevan queda incluido si se guarda desde ese mismo widget. -->
            <a-plane
              class="clickable wheel-visibility-dependent"
              data-move="0,0.3,0"
              width="0.22" height="0.22"
              color="#333333"
              material="shader: flat; side: double;"
              rotation="-90 0 0"
              position="${(-(RING_INNER_RADIUS * 0.55)).toFixed(2)} 0.01 0">
              <a-text value="+" align="center" color="#fff" width="6" position="0 0 0.01"></a-text>
            </a-plane>
            <a-plane
              id="wheel-visibility-toggle"
              class="clickable"
              width="0.26" height="0.26"
              color="#333333"
              material="shader: flat; side: double;"
              rotation="-90 0 0"
              position="0 0.01 0">
              <a-text value="X" align="center" color="#fff" width="6" position="0 0 0.01"></a-text>
            </a-plane>
            <a-plane
              class="clickable wheel-visibility-dependent"
              data-move="0,-0.3,0"
              width="0.22" height="0.22"
              color="#333333"
              material="shader: flat; side: double;"
              rotation="-90 0 0"
              position="${(RING_INNER_RADIUS * 0.55).toFixed(2)} 0.01 0">
              <a-text value="-" align="center" color="#fff" width="6" position="0 0 0.01"></a-text>
            </a-plane>

            <!-- Triángulo de norte: FIJO, no es hijo de #compass-wheel, marca el punto de
                 referencia/frente de la brújula (no orientación geomagnética real). -->
            <a-triangle
              vertex-a="-0.12 0 0"
              vertex-b="0.12 0 0"
              vertex-c="0 0.24 0"
              color="#FFC107"
              material="shader: flat; side: double;"
              rotation="-90 0 0"
              position="0 0.05 ${(RADIUS * 0.95).toFixed(2)}">
            </a-triangle>

            <!-- Flechas: rotan #compass-wheel 180° por click/dwell, en cada sentido. Llevan
                 "wheel-visibility-dependent" porque solo tienen sentido con la dona visible (se
                 ocultan y muestran junto con #compass-wheel, ver el botón "X"). Pedido del
                 usuario: reubicadas junto a la "X" (arriba/abajo) formando cruz con "+"/"-"
                 (izquierda/derecha), mismo tamaño que estos — quedan en el hueco de la dona. -->
            <a-plane
              class="clickable compass-arrow wheel-visibility-dependent"
              data-arrow="left"
              width="0.22" height="0.22"
              color="#333333"
              material="shader: flat; side: double;"
              position="0 0.01 ${(-(RING_INNER_RADIUS * 0.55)).toFixed(2)}"
              rotation="-90 0 0">
              <a-text value="<-" align="center" color="#ffffff" width="6" position="0 0 0.01"></a-text>
            </a-plane>
            <a-plane
              class="clickable compass-arrow wheel-visibility-dependent"
              data-arrow="right"
              width="0.22" height="0.22"
              color="#333333"
              material="shader: flat; side: double;"
              position="0 0.01 ${(RING_INNER_RADIUS * 0.55).toFixed(2)}"
              rotation="-90 0 0">
              <a-text value="->" align="center" color="#ffffff" width="6" position="0 0 0.01"></a-text>
            </a-plane>

            <!-- Widget de posición (Requerimiento 013, ampliación): marcador 📍 clickeable que
                 abre/cierra un d-pad para mover #compass-root y guardarlo. Ver comentario grande
                 más arriba sobre por qué la persistencia real vive en SyncStereoTestView.jsx.
                 A diferencia del círculo/flechas (planas contra el suelo, rotation="-90 0 0"),
                 este widget queda parado por encima de la brújula, de frente a la cámara (misma
                 orientación por defecto que usa vrPositionControl.js para sus propios paneles). -->
            <a-circle
              id="position-marker"
              class="clickable"
              radius="0.18"
              color="#d21919"
              material="shader: flat; side: double;"
              position="0 1 0">
            </a-circle>
            <a-entity id="position-dpad" visible="false" position="0 1.9 0">
              <a-text id="position-coords" align="center" color="#ffffff" width="3.6" position="0 0.85 0"></a-text>
              <a-plane class="clickable" data-move="0,0.3,0" width="0.44" height="0.36" color="#333333" material="shader: flat; side: double;" position="0 0.48 0"><a-text value="^" align="center" color="#fff" width="6" position="0 0 0.01"></a-text></a-plane>
              <a-plane class="clickable" data-move="-0.3,0,0" width="0.44" height="0.36" color="#333333" material="shader: flat; side: double;" position="-0.55 0 0"><a-text value="&lt;" align="center" color="#fff" width="6" position="0 0 0.01"></a-text></a-plane>
              <a-plane class="clickable" data-move="0.3,0,0" width="0.44" height="0.36" color="#333333" material="shader: flat; side: double;" position="0.55 0 0"><a-text value="&gt;" align="center" color="#fff" width="6" position="0 0 0.01"></a-text></a-plane>
              <a-plane class="clickable" data-move="0,-0.3,0" width="0.44" height="0.36" color="#333333" material="shader: flat; side: double;" position="0 -0.48 0"><a-text value="v" align="center" color="#fff" width="6" position="0 0 0.01"></a-text></a-plane>
              <a-plane class="clickable" data-move="0,0,-0.3" width="0.44" height="0.36" color="#333333" material="shader: flat; side: double;" position="-0.3 -0.95 0"><a-text value="-" align="center" color="#fff" width="6" position="0 0 0.01"></a-text></a-plane>
              <a-plane class="clickable" data-move="0,0,0.3" width="0.44" height="0.36" color="#333333" material="shader: flat; side: double;" position="0.3 -0.95 0"><a-text value="+" align="center" color="#fff" width="6" position="0 0 0.01"></a-text></a-plane>
              <a-plane id="position-save-btn" class="clickable" width="0.85" height="0.34" color="#2e7d32" material="shader: flat; side: double;" position="0 -1.4 0"><a-text value="${saveLabel}" align="center" color="#fff" width="6" position="0 0 0.01"></a-text></a-plane>
            </a-entity>
          </a-entity>

          <!-- Cámara con reticle de gaze estático (Requerimiento 012, mismo patrón que
               VRConeOverlaySync.jsx: SIN el componente cursor="fuse:..." nativo — su pipeline de
               eventos no se pudo hacer disparar en este contexto; el script de más abajo maneja
               color/escala/dwell/click a mano). El <a-cursor> primitivo sigue trayendo consigo el
               componente "cursor" por defecto, que dispara 'click' sobre el elemento intersectado
               en el CENTRO de la pantalla — se desactiva (cursor="enabled: false") porque en web el
               click de mouse debe resolver por la POSICIÓN REAL del cursor (ver el script
               "mouse-click" más abajo), no por el centro: si no, un click en cualquier punto
               activaría lo que está en el centro de la pantalla. El raycaster (que alimenta el
               dwell del reticle) se conserva intacto. -->
          <!-- Pedido del usuario: las flechas deben acercar/alejar la cámara del overlay de
               contenido (karaoke/video/cono), no la de esta brújula — la brújula siempre debe
               quedarse fija en CAMERA_POSITION, mirando hacia abajo al menú ("el menú siempre
               esté debajo"). El componente wasd-controls viene activo por defecto en a-camera y
               sí recibe las flechas (a diferencia del mouse, el teclado no depende de qué capa
               está encima). Sin deshabilitarlo acá, apretar una flecha alejaba esta cámara de la
               geometría fija del menú, dando la sensación de que "el menú se aleja" en vez de
               acercar el contenido. -->
          <a-camera position="${CAMERA_POSITION.x} ${CAMERA_POSITION.y} ${CAMERA_POSITION.z}" rotation="0 0 0" wasd-controls="enabled: false">
            <a-cursor
              id="main-cursor"
              position="0 0 -1"
              geometry="primitive: ring; radiusInner: 0.02; radiusOuter: 0.03"
              material="color: white; shader: flat; opacity: 0.85"
              cursor="enabled: false"
              raycaster="objects: .clickable; far: 30; interval: 100">
              <!-- Requerimiento 016: geometría "cross" — A-Frame no tiene un primitive nativo de
                   cruz, así que se arma con dos planos delgados cruzados en 90°, hijos de
                   #main-cursor (heredan su escala/posición, así que la animación de fuse y el
                   reposicionamiento configurable siguen funcionando igual). Ocultos por defecto;
                   window.__applyCursorConfig los muestra/oculta según la geometría elegida. -->
              <a-plane id="cursor-cross-h" visible="false" width="0.06" height="0.008" material="shader: flat; opacity: 0.85" position="0 0 0.001"></a-plane>
              <a-plane id="cursor-cross-v" visible="false" width="0.008" height="0.06" material="shader: flat; opacity: 0.85" position="0 0 0.001"></a-plane>
            </a-cursor>
          </a-camera>
        </a-scene>

        <script>
          // Pitch inicial hacia el suelo de la brújula (ver comentario en initialCursorPitch más
          // arriba) — mismo criterio que Requerimiento 012: look-controls solo copia estos
          // valores a la cámara real en su siguiente tick(), no de forma síncrona.
          (function () {
            function applyInitialPitch() {
              var cameraEl = document.querySelector('a-camera');
              var lookControls = cameraEl && cameraEl.components && cameraEl.components['look-controls'];
              if (lookControls && lookControls.pitchObject) {
                lookControls.pitchObject.rotation.x = ${initialCursorPitch};
              } else {
                setTimeout(applyInitialPitch, 100);
              }
            }
            applyInitialPitch();
          })();
        </script>

        <script>
          // Requerimiento 013: rotación del grupo de porciones (flechas) + selección de sección
          // (porciones), reusando el mismo mecanismo propio de hover/dwell/click de gaze del
          // Requerimiento 012 (ver el mismo bloque en VRConeOverlaySync.jsx).
          (function () {
            var STEP_DEG = ${STEP_DEG};

            function send(msg) {
              window.parent.postMessage(Object.assign({ source: 'ars-sync-test' }, msg), '*');
            }

            function rotateWheel(direction) {
              var wheel = document.querySelector('#compass-wheel');
              if (!wheel) return;
              var current = wheel.getAttribute('rotation') || { y: 0 };
              var nextY = current.y + direction * STEP_DEG;
              wheel.setAttribute('animation__compass-rotate', {
                property: 'rotation.y', to: nextY, dur: 300, easing: 'easeInOutQuad',
              });
            }

            // Las porciones (todas tipo "panel", incluida "EXIT") NO aplican
            // "window.__activateSettingsSection" localmente al clickear — pedido del usuario:
            // el padre (SyncStereoTestView.jsx) es la fuente de verdad de qué sección está
            // abierta en AMBOS paneles (antes solo se abría en el panel que clickeó, y un panel
            // recién montado en "Doble panel" arrancaba sin saberlo). Se manda la intención
            // ('compass-section-changed') y se espera a que el padre la rebroadcastee — mismo
            // patrón que 'compass-wheel-visibility-toggle', ver script del panel 3D más abajo
            // para el listener que de verdad aplica el cambio. "Volver"/"Cerrar sesión" ya no son
            // porciones propias: son filas DENTRO del panel de "EXIT" (ver buildExitGroupHTML),
            // que siguen delegando en "window.__requestConfirm" sin cambios.
            document.addEventListener('DOMContentLoaded', function () {
              var leftArrow = document.querySelector('[data-arrow="left"]');
              var rightArrow = document.querySelector('[data-arrow="right"]');
              if (leftArrow) leftArrow.addEventListener('click', function () { rotateWheel(1); });
              if (rightArrow) rightArrow.addEventListener('click', function () { rotateWheel(-1); });

              document.querySelectorAll('.compass-wedge').forEach(function (wedgeEl) {
                wedgeEl.addEventListener('click', function () {
                  send({ action: 'compass-section-changed', section: wedgeEl.dataset.section });
                });
              });
            });

            var cursorEl = document.querySelector('#main-cursor');
            var FUSE_MS = ${cursorFuseTimeout};
            var COOLDOWN_MS = 600;
            var hoveredEl = null;
            var fuseStart = null;
            var lockedEl = null;
            var lastActivationAt = 0;

            // Requerimiento 016: apariencia/comportamiento configurables del cursor — aplicados acá
            // (no solo cacheados) porque este script es el dueño real de #main-cursor y de
            // setVisual()/tick(), que corren cada 50ms. El script del panel de "Cursor" (más abajo
            // en este mismo documento, otro script con su propio scope) no puede tocar estas
            // variables directo — expone window.__applyCursorConfig para que se lo pida desde ahí
            // cada vez que el usuario cambia un control (aplicación en tiempo real) y al cargar la
            // config guardada.
            var cursorBaseScale = 1;
            var cursorIdleColor = 'white';
            var cursorGeometry = 'point';
            window.__applyCursorConfig = function (cfg) {
              if (!cfg || !cursorEl) return;
              if (typeof cfg.fuseTimeout === 'number') FUSE_MS = cfg.fuseTimeout;
              if (typeof cfg.scale === 'number') cursorBaseScale = cfg.scale;
              if (typeof cfg.color === 'string') cursorIdleColor = cfg.color;
              if (cfg.position) {
                cursorEl.setAttribute('position', cfg.position[0] + ' ' + cfg.position[1] + ' ' + cfg.position[2]);
              }
              if (typeof cfg.geometry === 'string') {
                cursorGeometry = cfg.geometry;
                applyCursorGeometry(cfg.geometry);
              }
              if (typeof cfg.visible === 'boolean') {
                cursorEl.setAttribute('visible', cfg.visible);
              }
            };

            // "cross" no tiene primitive nativo de A-Frame — se resuelve mostrando los dos planos
            // hijos #cursor-cross-h/#cursor-cross-v (ver el <a-cursor> más arriba) y ocultando la
            // geometría propia de #main-cursor (opacity: 0, no visible:false — el raycaster sigue
            // viviendo en #main-cursor mismo, independiente de su apariencia). Para el resto de las
            // formas se hace lo inverso: ocultar los planos de cruz y setear el primitive nativo.
            function applyCursorGeometry(shape) {
              var crossH = document.querySelector('#cursor-cross-h');
              var crossV = document.querySelector('#cursor-cross-v');
              if (shape === 'cross') {
                if (crossH) crossH.setAttribute('visible', true);
                if (crossV) crossV.setAttribute('visible', true);
              } else {
                if (crossH) crossH.setAttribute('visible', false);
                if (crossV) crossV.setAttribute('visible', false);
                var geom =
                  shape === 'square' ? 'primitive: box; width: 0.05; height: 0.05; depth: 0.005' :
                  shape === 'triangle' ? 'primitive: triangle; vertexA: 0 0.03 0; vertexB: -0.03 -0.025 0; vertexC: 0.03 -0.025 0' :
                  shape === 'point' ? 'primitive: circle; radius: 0.015' :
                  'primitive: ring; radiusInner: 0.02; radiusOuter: 0.03';
                cursorEl.setAttribute('geometry', geom);
              }
            }

            // Pedido del usuario: este círculo es el único visible de todo el panel (ver
            // aframe-overlay-modules.html/VRConeOverlaySync.jsx), pero su raycaster solo puede
            // intersectar elementos de ESTA escena (wedges/panel de config/widget de posición) —
            // nunca los botones reales de un overlay de contenido (video/cono/karaoke), que vive
            // en OTRO iframe. Ese overlay ya calcula su propio hover/progreso de dwell (ver
            // 'gaze-hover' en aframe-overlay-modules.js) y lo reenvía acá vía SyncStereoTestView.jsx
            // — se cachea para pintarlo cuando este círculo no tenga nada propio que mostrar.
            var remoteGazeHovering = false;
            var remoteGazeProgress = 0;
            window.addEventListener('message', function (ev) {
              var msg = ev.data;
              if (!msg || msg.source !== 'ars-sync-test' || msg.action !== 'gaze-hover') return;
              remoteGazeHovering = !!msg.hovering;
              remoteGazeProgress = msg.progress || 0;
            });

            function setVisual(color, fuseScale) {
              // Requerimiento 016: fuseScale (1 en reposo, encogiendo hacia 0.1 mientras dura el
              // fuse) sigue siendo un FACTOR sobre la escala base configurable por el usuario, no
              // el valor final — así la preferencia guardada no se pierde en cada tick.
              var totalScale = cursorBaseScale * fuseScale;
              cursorEl.setAttribute('scale', totalScale + ' ' + totalScale + ' ' + totalScale);
              var materialStr = 'color: ' + color + '; shader: flat; opacity: 0.85';
              if (cursorGeometry === 'cross') {
                // La geometría propia de #main-cursor queda invisible (el raycaster no depende de
                // su apariencia) — el color/opacity real se pinta en los dos planos de cruz.
                cursorEl.setAttribute('material', 'opacity: 0');
                var crossH = document.querySelector('#cursor-cross-h');
                var crossV = document.querySelector('#cursor-cross-v');
                if (crossH) crossH.setAttribute('material', materialStr);
                if (crossV) crossV.setAttribute('material', materialStr);
              } else {
                cursorEl.setAttribute('material', materialStr);
              }
            }

            function tick() {
              if (!cursorEl) return;
              var raycasterComp = cursorEl.components && cursorEl.components['raycaster'];
              if (!raycasterComp) return;
              var target = (raycasterComp.intersectedEls && raycasterComp.intersectedEls[0]) || null;

              if (target !== lockedEl) lockedEl = null;

              if (target !== hoveredEl) {
                hoveredEl = target;
                fuseStart = (target && target !== lockedEl) ? Date.now() : null;
              }

              if (!target || target === lockedEl) {
                // Nada propio que mirar acá: si el overlay de contenido reporta estar apuntando
                // uno de sus botones, se refleja ESE hover/progreso — el click en sí lo dispara el
                // propio overlay con su propio raycaster/dwell (ver aframe-overlay-modules.js),
                // acá solo se pinta el único círculo visible con el mismo feedback.
                if (remoteGazeHovering) {
                  setVisual('#ff3333', 1 - 0.9 * remoteGazeProgress);
                } else {
                  setVisual(cursorIdleColor, 1);
                }
                return;
              }

              var elapsed = Date.now() - fuseStart;
              var progress = Math.min(1, elapsed / FUSE_MS);
              setVisual('#ff3333', 1 - 0.9 * progress);

              if (progress >= 1) {
                var now = Date.now();
                if (now - lastActivationAt >= COOLDOWN_MS) {
                  target.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
                  lastActivationAt = now;
                }
                lockedEl = target;
                fuseStart = null;
                setVisual(cursorIdleColor, 1);
              }
            }

            function findRaycaster() {
              cursorEl = document.querySelector('#main-cursor');
              var raycasterComp = cursorEl && cursorEl.components && cursorEl.components['raycaster'];
              if (raycasterComp) {
                setInterval(tick, 50);
              } else {
                setTimeout(findRaycaster, 100);
              }
            }
            findRaycaster();
          })();
        </script>

        <script>
          // Requerimiento 013 (ampliación): widget de posición — mueve #compass-root con clicks
          // directos (sin dwell, mismo criterio manual que vrPositionControl.js) y pide/guarda su
          // posición vía postMessage, porque este srcDoc no puede hacer fetch/import directo a
          // vrUserSettingsApi.util.js (ver comentario grande al principio del archivo). La
          // persistencia real corre en SyncStereoTestView.jsx.
          (function () {
            function send(msg) {
              window.parent.postMessage(Object.assign({ source: 'ars-sync-test' }, msg), '*');
            }

            function formatCoords(p) {
              return p.x.toFixed(2) + ', ' + p.y.toFixed(2) + ', ' + p.z.toFixed(2);
            }

            document.addEventListener('DOMContentLoaded', function () {
              var rootEl = document.querySelector('#compass-root');
              var marker = document.querySelector('#position-marker');
              var dpad = document.querySelector('#position-dpad');
              var coordsLabel = document.querySelector('#position-coords');
              var saveBtn = document.querySelector('#position-save-btn');
              if (!rootEl || !marker || !dpad) return;

              // Última posición confirmada en DB (o la inicial por defecto hasta que el padre
              // conteste "compass-set-position") — permite saber si hay cambios sin guardar al
              // cerrar el menú con la "X" (pedido del usuario).
              var lastSavedPosition = Object.assign({}, rootEl.getAttribute('position'));

              function positionChanged() {
                var pos = rootEl.getAttribute('position');
                return pos.x !== lastSavedPosition.x || pos.y !== lastSavedPosition.y || pos.z !== lastSavedPosition.z;
              }

              function savePosition() {
                var pos = rootEl.getAttribute('position');
                send({ action: 'compass-save-position', x: pos.x, y: pos.y, z: pos.z });
                lastSavedPosition = { x: pos.x, y: pos.y, z: pos.z };
              }

              function refreshCoordsLabel() {
                coordsLabel.setAttribute('value', formatCoords(rootEl.getAttribute('position')));
              }
              refreshCoordsLabel();

              marker.addEventListener('click', function () {
                dpad.setAttribute('visible', !dpad.getAttribute('visible'));
              });

              // Requerimiento 013 (sync pedido por el usuario): la visibilidad NO es local a cada
              // panel — al tocarse la X esta brújula NO alterna su propio estado, solo emite la
              // INTENCIÓN ('compass-wheel-visibility-toggle'). El estado real y su sincronización
              // los decide el padre (SyncStereoTestView.jsx, fuente de verdad única), que aplica un
              // antirebote de 1s y responde con 'compass-wheel-visibility' a AMBAS instancias (la
              // que clickeó y la otra) — así los dos ojos quedan siempre alineados aunque el click
              // o el dwell solo ocurran en uno.
              var wheelEl = document.querySelector('#compass-wheel');
              var wheelToggleBtn = document.querySelector('#wheel-visibility-toggle');
              var wheelDependentEls = document.querySelectorAll('.wheel-visibility-dependent');

              function applyWheelVisibility(visible) {
                wheelEl.setAttribute('visible', visible);
                wheelDependentEls.forEach(function (el) { el.setAttribute('visible', visible); });
                if (!visible) {
                  if (window.__closeSettingsPanel) window.__closeSettingsPanel();
                  if (window.__closeConfirmPanel) window.__closeConfirmPanel();
                }
              }

              if (wheelEl && wheelToggleBtn) {
                wheelToggleBtn.addEventListener('click', function () {
                  // Guardado de posición: solo la instancia que recibió el click real, y solo si el
                  // menú está por ocultarse (el padre confirmará el nuevo estado y lo rebroadcasteará).
                  if (wheelEl.getAttribute('visible') && positionChanged()) savePosition();
                  send({ action: 'compass-wheel-visibility-toggle' });
                });
              }

              // Aplica el estado decidido por el padre (broadcast a ambas instancias) — esta brújula
              // ya no decide su visibilidad por sí sola.
              window.addEventListener('message', function (ev) {
                var msg = ev.data;
                if (!msg || msg.source !== 'ars-sync-test' || msg.action !== 'compass-wheel-visibility') return;
                applyWheelVisibility(msg.visible);
              });

              // Selector global (no acotado a #position-dpad): también agarra los botones "+"/"-"
              // del hueco central de la brújula (ver el "X"/"+"/"-" cerca de #compass-wheel) —
              // mismo mecanismo, mismo eje Y, distinto lugar en la pantalla para acceder más fácil.
              document.querySelectorAll('[data-move]').forEach(function (btn) {
                var parts = btn.dataset.move.split(',').map(Number);
                btn.addEventListener('click', function () {
                  var pos = rootEl.getAttribute('position');
                  var next = {
                    x: pos.x + parts[0],
                    y: pos.y + parts[1],
                    z: pos.z + parts[2],
                  };
                  rootEl.setAttribute('position', next);
                  refreshCoordsLabel();
                });
              });

              saveBtn.addEventListener('click', function () {
                savePosition();
                var prevColor = saveBtn.getAttribute('color');
                saveBtn.setAttribute('color', '#117711');
                setTimeout(function () { saveBtn.setAttribute('color', prevColor); }, 400);
              });

              // Avisa al padre que ya puede aplicar la posición guardada (si la hay) — el padre
              // responde con "compass-set-position" apenas reciba esto, con la última posición
              // conocida (guardada en DB o la que ya tenga en memoria).
              window.addEventListener('message', function (ev) {
                var msg = ev.data;
                if (!msg || msg.source !== 'ars-sync-test' || msg.action !== 'compass-set-position') return;
                rootEl.setAttribute('position', { x: msg.x, y: msg.y, z: msg.z });
                lastSavedPosition = { x: msg.x, y: msg.y, z: msg.z };
                refreshCoordsLabel();
              });
              send({ action: 'compass-ready' });
            });
          })();
        </script>

        <!-- Etiquetas estáticas ya traducidas (ver "staticLabels" en el componente React) —
             JSON plano en vez de embebido como string JS, para no tener que escapar comillas de
             textos traducidos dentro de un literal de un solo tipo de comilla. -->
        <script type="application/json" id="settings-static-labels">${JSON.stringify(staticLabels)}</script>

        <script>
          // Requerimiento 013 (pedido explícito del usuario): panel 3D de la sección activa —
          // steppers +/- para "Configuración", filas clickeables para "Overlays". El estado real
          // (separación/ancho/alto/overlays/guardado/sesión) vive en SyncStereoTestView.jsx (que sí
          // puede getUserSetting/saveUserSetting) — acá solo se cachea lo último recibido por
          // "compass-config-state" y se mandan deltas/acciones, mismo patrón que el widget de
          // posición de más arriba.
          (function () {
            function send(msg) {
              window.parent.postMessage(Object.assign({ source: 'ars-sync-test' }, msg), '*');
            }

            var STATIC = JSON.parse(document.getElementById('settings-static-labels').textContent);
            var FIELDS = ${JSON.stringify(CONFIG_FIELDS)};
            // Hallazgo real (reportado por el usuario: etiquetas de eje vacías y el +/- "desvinculaba"
            // el elemento): POSITION_AXES/POSITION_STEP son constantes del archivo React (afuera),
            // no existen dentro de este iframe en tiempo de ejecución — sin este var, cada click de
            // +/- tiraba un ReferenceError silencioso (nunca llegaba a mandar 'position-move' ni a
            // refrescar las etiquetas), y encima combinado con el hallazgo de más abajo (positionMode
            // faltante en el broadcast periódico del padre) se veía como si el elemento se soltara.
            var POSITION_AXES = ${JSON.stringify(POSITION_AXES)};
            var POSITION_STEP_RANGE = ${JSON.stringify(POSITION_STEP_RANGE)};
            var POSITION_STEP_INCREMENT = ${POSITION_STEP_INCREMENT};
            // Pedido del usuario (ampliación): el paso ya no es fijo — su propia fila +/- lo
            // ajusta en vivo (ver dpad-step-minus/plus más abajo), arrancando en
            // DEFAULT_POSITION_STEP y usado tanto para mover posición como rotación. Se interpola
            // como VAR (no solo como valor de arranque) porque el handler de
            // 'position-element-selected' lo reusa como fallback cuando el elemento no tiene step
            // guardado — sin este var, ese fallback tiraba ReferenceError (hallazgo real).
            var DEFAULT_POSITION_STEP = ${DEFAULT_POSITION_STEP};
            var currentStep = DEFAULT_POSITION_STEP;
            // Requerimiento 016: mismo motivo que el hallazgo de arriba (POSITION_AXES) — estas
            // constantes también son del módulo React de afuera, hay que interpolarlas como var
            // para que existan dentro de este iframe.
            var CURSOR_POSITION_AXES = ${JSON.stringify(CURSOR_POSITION_AXES)};
            var DEFAULT_CURSOR_STEP = ${DEFAULT_CURSOR_STEP};
            var CURSOR_STEP_RANGE = ${JSON.stringify(CURSOR_STEP_RANGE)};
            var CURSOR_STEP_INCREMENT = ${CURSOR_STEP_INCREMENT};
            var cursorStep = DEFAULT_CURSOR_STEP;
            var CURSOR_SCALE_RANGE = ${JSON.stringify(CURSOR_SCALE_RANGE)};
            var CURSOR_FUSE_STEP = ${CURSOR_FUSE_STEP};
            var CURSOR_FUSE_RANGE = ${JSON.stringify(CURSOR_FUSE_RANGE)};
            var DEFAULT_CURSOR_CONFIG = ${JSON.stringify(DEFAULT_CURSOR_CONFIG)};
            // Pedido del usuario (ampliación): bisectriz angular de cada sección tipo "panel"
            // (Configuración/Overlays/Interfaz) — usada para rotar #settings-panel-anchor hacia
            // la misma dirección que la porción activa, ver __activateSettingsSection más abajo.
            var SECTION_BISECTOR = ${JSON.stringify(
              Object.fromEntries(
                SECTIONS.filter((s) => s.type === 'panel').map((s) => [s.key, s.thetaStart + WEDGE_THETA_LENGTH / 2]),
              ),
            )};
            var currentSection = null; // 'config' | 'overlays' | null
            var state = null; // último "compass-config-state" recibido

            function fieldStep(key) {
              for (var i = 0; i < FIELDS.length; i++) {
                if (FIELDS[i].key === key) return FIELDS[i].step;
              }
              return 1;
            }

            function deviceLabel(deviceType) {
              return deviceType === 'mobile' ? STATIC.deviceMobile : STATIC.deviceWeb;
            }

            function refreshDisplay() {
              if (!state || !currentSection) return;

              document.querySelector('#settings-title').setAttribute(
                'value',
                currentSection === 'overlays' ? STATIC.overlaysTitle :
                currentSection === 'interface' ? STATIC.interfaceTitle :
                currentSection === 'exit' ? STATIC.exitTitle :
                STATIC.configTitle,
              );
              // Pedido del usuario: no mostrar el correo de sesión en la pestaña "Interfaz" (ahí no
              // aporta — a diferencia de "Configuración"/"Overlays", donde el guardado depende
              // directamente de tener sesión, ver "Guardar selección (Web)"/sub-textos de esos
              // botones).
              document.querySelector('#settings-session').setAttribute(
                'value', currentSection === 'interface' ? '' : (state.userEmail ? (STATIC.loggedInAs + ': ' + state.userEmail) : STATIC.noSession),
              );

              FIELDS.forEach(function (field) {
                var labelEl = document.querySelector('[data-field-label="' + field.key + '"]');
                if (labelEl) labelEl.setAttribute('value', STATIC.fields[field.key] + ': ' + state[field.key] + 'px');
              });
              // Fila "Doble panel" (pedido del usuario): mismo criterio visual que las filas de
              // Overlays (fondo claro + check cuando está activo), pero acá "activo" = dualPanel
              // true (dos paneles, el default de siempre) y desactivarlo dibuja un solo panel.
              document.querySelector('#settings-dual-panel-label').setAttribute('value', STATIC.dualPanel);
              var dualPanelOn = state.dualPanel !== false;
              document.querySelector('#settings-dual-panel-toggle').setAttribute('color', dualPanelOn ? '#4FC3F7' : '#333333');
              document.querySelector('#settings-dual-panel-label').setAttribute('color', dualPanelOn ? '#0D1B2A' : '#ffffff');
              document.querySelector('#settings-dual-panel-check').setAttribute('value', dualPanelOn ? '✓' : '');
              document.querySelector('#settings-dual-panel-check').setAttribute('color', dualPanelOn ? '#0D1B2A' : '#69F0AE');
              document.querySelector('#settings-save-config-label').setAttribute(
                'value', STATIC.saveShort,
              );
              document.querySelector('#settings-save-config-sub').setAttribute(
                'value', STATIC.saveConfigSub + ' (' + deviceLabel(state.deviceType) + ')',
              );
              document.querySelector('#settings-save-config-btn').setAttribute(
                'color', state.configSaved ? '#555555' : '#2e7d32',
              );

              // Requerimiento 013 (ampliación pedida por el usuario): la fila entera del overlay
              // refleja su estado con color — activo en color claro, inactivo en gris oscuro. La
              // etiqueta cambia a oscuro sobre el fondo claro para mantener el contraste. El menú
              // NO se cierra al togglear: el click solo manda 'compass-toggle-overlay' y el estado
              // vuelve por 'compass-config-state', dejando el panel abierto (ver listener de click
              // más abajo).
              document.querySelectorAll('[data-overlay-toggle]').forEach(function (rowEl) {
                var key = rowEl.dataset.overlayToggle;
                var selected = (state.selectedOverlays || []).indexOf(key) !== -1;
                rowEl.setAttribute('color', selected ? '#4FC3F7' : '#333333');
                var labelEl = document.querySelector('[data-overlay-label="' + key + '"]');
                if (labelEl) labelEl.setAttribute('color', selected ? '#0D1B2A' : '#ffffff');
                var checkEl = document.querySelector('[data-overlay-check="' + key + '"]');
                if (checkEl) {
                  checkEl.setAttribute('value', selected ? '✓' : '');
                  checkEl.setAttribute('color', selected ? '#0D1B2A' : '#69F0AE');
                }
              });
              document.querySelector('#settings-save-overlays-label').setAttribute(
                'value', STATIC.saveShort,
              );
              document.querySelector('#settings-save-overlays-sub').setAttribute(
                'value', STATIC.saveOverlaysSub + ' (' + deviceLabel(state.deviceType) + ')',
              );
              document.querySelector('#settings-save-overlays-btn').setAttribute(
                'color', state.overlaysSaved ? '#555555' : '#2e7d32',
              );

              // Pedido del usuario (ampliación, sección 11): fila "Position" — mismo criterio
              // visual que "Doble panel"/Overlays (fondo claro + check cuando está activo).
              // "Activo" acá = modo edición de posición encendido (muestra los marcadores rojos
              // en el overlay real, ver SyncStereoTestView.jsx → 'position-mode-changed').
              document.querySelector('#settings-position-label').setAttribute('value', STATIC.position);
              var positionModeOn = !!state.positionMode;
              document.querySelector('#settings-position-toggle').setAttribute('color', positionModeOn ? '#4FC3F7' : '#333333');
              document.querySelector('#settings-position-label').setAttribute('color', positionModeOn ? '#0D1B2A' : '#ffffff');
              document.querySelector('#settings-position-check').setAttribute('value', positionModeOn ? '✓' : '');
              document.querySelector('#settings-position-check').setAttribute('color', positionModeOn ? '#0D1B2A' : '#69F0AE');
              document.querySelector('#dpad-save-label').setAttribute('value', STATIC.saveShort);
              document.querySelector('#dpad-cancel-label').setAttribute('value', STATIC.confirmCancel);
              // Si se apaga el modo posición, no tiene sentido seguir mostrando el d-pad de un
              // elemento que ya no se puede seleccionar de nuevo — se oculta también acá.
              if (!positionModeOn) hidePositionDpad();

              // Requerimiento 016: fila "Cursor" — solo la etiqueta (la traducción llega con
              // state); el color/check de "abierto" se refresca aparte en refreshCursorToggle()
              // porque depende de cursorDpadOpen, una variable puramente local a este iframe (no
              // viaja en compass-config-state, a diferencia de positionMode).
              document.querySelector('#settings-cursor-toggle-label').setAttribute('value', STATIC.cursorToggle);
              refreshCursorToggle();
            }

            // Pedido del usuario (ampliación, sección 11): d-pad genérico de mover el elemento
            // seleccionado — a diferencia de los grupos de arriba, su visibilidad/contenido NO
            // depende de 'compass-config-state' (eso es config compartida entre TODO lo demás),
            // sino de 'position-element-selected' (qué elemento del overlay real se clickeó, con
            // su posición actual) — ver el listener de message más abajo.
            var selectedPositionKey = null;
            var selectedPositionValue = [0, 0, 0]; // último valor conocido, se actualiza optimista tras cada +/-
            // Pedido del usuario (ampliación): 3 valores más para el ángulo de giro de cada eje,
            // junto a la posición — mismo criterio optimista que selectedPositionValue.
            var selectedRotationValue = [0, 0, 0];
            // Pedido del usuario: escala uniforme del elemento seleccionado (agrandar/achicar,
            // motivación concreta: agrandar el overlay "Youtube Video") — un solo número, no una
            // tupla por eje como posición/rotación (ver setScale en vrPositionControl.js, que
            // aplica el mismo valor a los 3 ejes de object3D.scale).
            var selectedScaleValue = 1;
            var SCALE_MIN = 0.2;
            var SCALE_MAX = 5;
            // Pedido del usuario (ampliación): snapshot del último valor GUARDADO del elemento
            // seleccionado — es la referencia para saber si hay "cambios sin guardar" y para que el
            // botón "Cancel" (que solo se activa en ese caso) restaure. La fuente de verdad real
            // del guardado vive en vrPositionControl.js (ver 'position-reset'); acá se mantiene una
            // copia optimista para decidir en vivo si mostrar/ocultar Cancel.
            var savedPositionValue = [0, 0, 0];
            var savedRotationValue = [0, 0, 0];
            var savedScaleValue = 1;
            // Pedido del usuario (ampliación): baseline del step GUARDADO del elemento — incluido en
            // la comparación de "cambios sin guardar", así cambiar solo el step también activa
            // Save (verde) y muestra Cancel.
            var savedStep = DEFAULT_POSITION_STEP;
            // Pedido del usuario (ampliación): true cuando posición/rotación/step actuales difieren
            // de las guardadas — controla si el botón "Cancel" está visible/clickeable y si Save
            // está verde (con cambios) o gris (sin cambios).
            var hasUnsavedChanges = false;

            // Requerimiento 016: estado del sub-panel "Cursor" — sin "elemento seleccionado" (el
            // cursor es siempre el mismo, único), así que a diferencia de Position no depende de
            // ningún mensaje position-element-selected: se abre/cierra con su propio toggle local
            // (cursorDpadOpen) y su config arranca con DEFAULT_CURSOR_CONFIG hasta que llega la
            // guardada por compass-config-state (ver el listener de message más abajo).
            var cursorDpadOpen = false;
            var cursorConfig = JSON.parse(JSON.stringify(DEFAULT_CURSOR_CONFIG));
            var savedCursorConfig = JSON.parse(JSON.stringify(DEFAULT_CURSOR_CONFIG));
            var cursorHasUnsavedChanges = false;
            var CURSOR_COLOR_NAMES = ${JSON.stringify(CURSOR_COLORS)};
            var CURSOR_GEOMETRY_NAMES = ${JSON.stringify(CURSOR_GEOMETRIES)};

            function refreshCursorCancelState() {
              var diff =
                cursorConfig.position[0] !== savedCursorConfig.position[0] ||
                cursorConfig.position[1] !== savedCursorConfig.position[1] ||
                cursorConfig.position[2] !== savedCursorConfig.position[2] ||
                cursorConfig.scale !== savedCursorConfig.scale ||
                cursorConfig.fuseTimeout !== savedCursorConfig.fuseTimeout ||
                cursorConfig.color !== savedCursorConfig.color ||
                cursorConfig.geometry !== savedCursorConfig.geometry ||
                cursorConfig.visible !== savedCursorConfig.visible;
              cursorHasUnsavedChanges = diff;
              var saveBtn = document.querySelector('#dpad-cursor-save-btn');
              if (saveBtn) saveBtn.setAttribute('color', diff ? '#2e7d32' : '#555555');
              var cancelBtn = document.querySelector('#dpad-cursor-cancel-btn');
              if (!cancelBtn) return;
              cancelBtn.setAttribute('visible', diff);
              if (diff) cancelBtn.classList.add('clickable');
              else cancelBtn.classList.remove('clickable');
            }

            function refreshCursorDpad() {
              document.querySelector('#dpad-cursor-step-label').setAttribute('value', STATIC.step + ': ' + cursorStep.toFixed(2));
              CURSOR_POSITION_AXES.forEach(function (axis, i) {
                var labelEl = document.querySelector('[data-cursor-position-step-label="' + axis + '"]');
                if (labelEl) labelEl.setAttribute('value', STATIC.positionAxes[axis] + ': ' + cursorConfig.position[i].toFixed(2));
              });
              document.querySelector('#dpad-cursor-scale-label').setAttribute('value', STATIC.cursorScale + ': ' + cursorConfig.scale.toFixed(2));
              document.querySelector('#dpad-cursor-fuse-label').setAttribute('value', STATIC.cursorFuseTimeout + ': ' + cursorConfig.fuseTimeout + 'ms');
              document.querySelector('#dpad-cursor-color-label').setAttribute('value', STATIC.cursorColor);
              document.querySelector('#dpad-cursor-color-label').setAttribute('color', cursorConfig.color);
              document.querySelector('#dpad-cursor-geometry-label').setAttribute('value', STATIC.cursorGeometry + ': ' + STATIC.cursorGeometryNames[cursorConfig.geometry]);
              document.querySelector('#settings-cursor-visible-label').setAttribute('value', STATIC.cursorVisible);
              document.querySelector('#settings-cursor-visible-toggle').setAttribute('color', cursorConfig.visible ? '#4FC3F7' : '#333333');
              document.querySelector('#settings-cursor-visible-label').setAttribute('color', cursorConfig.visible ? '#0D1B2A' : '#ffffff');
              document.querySelector('#settings-cursor-visible-check').setAttribute('value', cursorConfig.visible ? '✓' : '');
              document.querySelector('#settings-cursor-visible-check').setAttribute('color', cursorConfig.visible ? '#0D1B2A' : '#69F0AE');
              document.querySelector('#dpad-cursor-save-label').setAttribute('value', STATIC.saveShort);
              document.querySelector('#dpad-cursor-cancel-label').setAttribute('value', STATIC.confirmCancel);
              refreshCursorCancelState();
            }

            // Aplica en vivo sobre #main-cursor de ESTE panel (ver window.__applyCursorConfig,
            // definido en el otro script de más arriba) y refresca sus labels. No manda nada al
            // padre — la usa tanto un edit local (que sí debe avisar al padre, ver
            // applyCursorConfigLive) como la aplicación de un cursor-live-apply recibido del panel
            // hermano (que NO debe volver a avisar al padre, o se arma un eco infinito).
            function applyCursorVisual() {
              if (window.__applyCursorConfig) window.__applyCursorConfig(cursorConfig);
              refreshCursorDpad();
            }

            // Pedido del usuario: la sincronización entre los dos paneles de "Doble panel" debe
            // pasar SIEMPRE por el padre (SyncStereoTestView.jsx) relayando el mensaje a ambos
            // iframes de la brújula de inmediato — no por un cambio de estado de React (más lento/
            // menos confiable, mismo motivo por el que "Position" ya sincroniza position-move así,
            // no con setState en cada movimiento). Cada edit local aplica el efecto acá Y manda
            // 'compass-cursor-live' — el padre lo reenvía a ambas brújulas (ver
            // SyncStereoTestView.jsx), incluida esta misma (aplicar el propio valor de vuelta es
            // inofensivo). Sin esto, mover el cursor en un panel no se veía reflejado en el otro
            // hasta guardar.
            function applyCursorConfigLive() {
              applyCursorVisual();
              send({ action: 'compass-cursor-live', config: cursorConfig });
            }

            function refreshCursorToggle() {
              document.querySelector('#settings-cursor-toggle').setAttribute('color', cursorDpadOpen ? '#4FC3F7' : '#333333');
              document.querySelector('#settings-cursor-toggle-label').setAttribute('color', cursorDpadOpen ? '#0D1B2A' : '#ffffff');
              document.querySelector('#settings-cursor-toggle-check').setAttribute('value', cursorDpadOpen ? '✓' : '');
              document.querySelector('#settings-cursor-toggle-check').setAttribute('color', cursorDpadOpen ? '#0D1B2A' : '#69F0AE');
            }

            function hideCursorDpad() {
              cursorDpadOpen = false;
              document.querySelector('#cursor-dpad-group').setAttribute('visible', false);
              setCursorDpadInteractive(false);
              refreshCursorToggle();
            }

            function refreshCancelState() {
              var diff = false;
              POSITION_AXES.forEach(function (axis, i) {
                if (selectedPositionValue[i] !== savedPositionValue[i]) diff = true;
                if (selectedRotationValue[i] !== savedRotationValue[i]) diff = true;
              });
              // Pedido del usuario (ampliación): el step también cuenta como cambio sin guardar.
              if (currentStep !== savedStep) diff = true;
              // Pedido del usuario: la escala también cuenta como cambio sin guardar.
              if (selectedScaleValue !== savedScaleValue) diff = true;
              hasUnsavedChanges = diff;
              var cancelBtn = document.querySelector('#dpad-cancel-btn');
              // Pedido del usuario (ampliación): el botón Guardar refleja si hay cambios sin
              // guardar — gris (#555555) cuando no hay nada que guardar, verde (#2e7d32) cuando sí.
              // Mismo criterio que Configuración/Overlays (configSaved/overlaysSaved → #555555).
              var saveBtn = document.querySelector('#dpad-save-btn');
              if (saveBtn) saveBtn.setAttribute('color', hasUnsavedChanges ? '#2e7d32' : '#555555');
              if (!cancelBtn) return;
              cancelBtn.setAttribute('visible', hasUnsavedChanges);
              // Igual que el resto del panel: la detectabilidad sigue a la visibilidad (el raycaster
              // no filtra por visible), así que se quita/reagrega la clase .clickable.
              if (hasUnsavedChanges) cancelBtn.classList.add('clickable');
              else cancelBtn.classList.remove('clickable');
            }
            function refreshPositionDpad() {
              document.querySelector('#dpad-element-label').setAttribute('value', selectedPositionKey || '');
              document.querySelector('#dpad-step-label').setAttribute('value', STATIC.step + ': ' + currentStep.toFixed(2));
              POSITION_AXES.forEach(function (axis, i) {
                var posLabelEl = document.querySelector('[data-position-step-label="' + axis + '"]');
                if (posLabelEl) {
                  posLabelEl.setAttribute('value', STATIC.positionAxes[axis] + ': ' + selectedPositionValue[i].toFixed(2));
                }
                var rotLabelEl = document.querySelector('[data-rotation-step-label="' + axis + '"]');
                if (rotLabelEl) {
                  rotLabelEl.setAttribute('value', STATIC.rotationAxes[axis] + ': ' + selectedRotationValue[i].toFixed(2) + '°');
                }
              });
              var scaleLabelEl = document.querySelector('#dpad-scale-label');
              if (scaleLabelEl) {
                scaleLabelEl.setAttribute('value', STATIC.scale + ': ' + selectedScaleValue.toFixed(2));
              }
              refreshCancelState();
            }
            function hidePositionDpad() {
              selectedPositionKey = null;
              document.querySelector('#position-dpad-group').setAttribute('visible', false);
              setDpadInteractive(false);
            }

            // Pedido del usuario: el raycaster de A-Frame NO filtra por visibilidad — una sección
            // oculta (visible=false) seguía siendo detectable/clickeable con el mouse o la mirada,
            // así que se podían "activar" botones de una sección que no se estaba viendo. Solución:
            // el cursor usa raycaster="objects: .clickable", así que lo único que define qué es
            // detectable es la clase ".clickable" — se la quita/reagrega según qué grupo está
            // visible. Se captura UNA vez la lista original de clickeables por grupo (al cargar,
            // antes de tocar clases) y se reusa para quitar/reponer la clase sin perder el set.
            var SECTION_GROUP_IDS = ['config', 'overlays', 'interface', 'exit'];
            var groupClickables = {};
            var dpadClickables = [];
            var cursorDpadClickables = [];
            function captureGroupClickables() {
              SECTION_GROUP_IDS.forEach(function (s) {
                var group = document.querySelector('#settings-' + s + '-group');
                if (!group) { groupClickables[s] = []; return; }
                var els = Array.prototype.slice.call(group.querySelectorAll('.clickable'));
                // El d-pad de "Interfaz" tiene su PROPIA visibilidad (depende de si hay un elemento
                // seleccionado), no de la sección completa — se excluye acá y se gestiona aparte
                // con setDpadInteractive(). Requerimiento 016: mismo criterio para el sub-panel de
                // "Cursor" (depende de cursorDpadOpen, no de la sección) — setCursorDpadInteractive().
                var dpad = group.querySelector('#position-dpad-group');
                if (dpad) els = els.filter(function (el) { return !dpad.contains(el); });
                var cursorDpad = group.querySelector('#cursor-dpad-group');
                if (cursorDpad) els = els.filter(function (el) { return !cursorDpad.contains(el); });
                groupClickables[s] = els;
              });
              var dpad = document.querySelector('#position-dpad-group');
              dpadClickables = dpad ? Array.prototype.slice.call(dpad.querySelectorAll('.clickable')) : [];
              var cursorDpad = document.querySelector('#cursor-dpad-group');
              cursorDpadClickables = cursorDpad ? Array.prototype.slice.call(cursorDpad.querySelectorAll('.clickable')) : [];
            }
            function setGroupInteractive(section, active) {
              (groupClickables[section] || []).forEach(function (el) {
                if (active) el.classList.add('clickable');
                else el.classList.remove('clickable');
              });
            }
            function setAllGroupsInteractive(active) {
              SECTION_GROUP_IDS.forEach(function (s) { setGroupInteractive(s, active); });
            }
            function setDpadInteractive(active) {
              dpadClickables.forEach(function (el) {
                if (active) el.classList.add('clickable');
                else el.classList.remove('clickable');
              });
            }
            function setCursorDpadInteractive(active) {
              cursorDpadClickables.forEach(function (el) {
                if (active) el.classList.add('clickable');
                else el.classList.remove('clickable');
              });
            }

            // Expuesta en window: la cierra tanto su propio botón ✕ como el panel de confirmación
            // (pedido del usuario: solo un panel puede estar abierto a la vez) cuando se activa
            // una acción "back"/"logout" mientras este panel ya estaba abierto.
            function closeSettingsPanel() {
              currentSection = null;
              document.querySelector('#settings-panel').setAttribute('visible', false);
              setAllGroupsInteractive(false);
              var closeBtn = document.querySelector('#settings-close-btn');
              if (closeBtn) closeBtn.classList.remove('clickable');
            }
            window.__closeSettingsPanel = closeSettingsPanel;

            // Expuesta en window: la llama el script de rotación/selección (arriba) cuando se
            // activa una porción tipo "panel" — este script es el dueño del estado
            // abierto/cerrado del panel, no el de la brújula. Cierra primero el panel de
            // confirmación si estaba abierto (pedido del usuario: nunca los dos a la vez).
            window.__activateSettingsSection = function (section) {
              if (window.__closeConfirmPanel) window.__closeConfirmPanel();
              currentSection = section;
              // Pedido del usuario (ampliación): el panel aparece junto a SU sección — rota el
              // ancla (hijo de #compass-wheel) a la bisectriz de la porción activada. Como el
              // ancla es hijo de la rueda, si después se gira con las flechas, panel y porción
              // giran juntos sin que haga falta ningún código extra acá.
              var bisector = SECTION_BISECTOR[section];
              if (bisector !== undefined) {
                document.querySelector('#settings-panel-anchor').setAttribute('rotation', '0 ' + bisector + ' 0');
              }
              document.querySelector('#settings-panel').setAttribute('visible', true);
              document.querySelector('#settings-config-group').setAttribute('visible', section === 'config');
              document.querySelector('#settings-overlays-group').setAttribute('visible', section === 'overlays');
              document.querySelector('#settings-interface-group').setAttribute('visible', section === 'interface');
              document.querySelector('#settings-exit-group').setAttribute('visible', section === 'exit');
              // Solo la sección activa queda detectable (pedido del usuario, ver helper arriba).
              setAllGroupsInteractive(false);
              setGroupInteractive(section, true);
              var closeBtn = document.querySelector('#settings-close-btn');
              if (closeBtn) closeBtn.classList.add('clickable');
              refreshDisplay();
            };

            document.addEventListener('DOMContentLoaded', function () {
              // Pedido del usuario: al cargar no hay sección activa — capturar el set original de
              // clickeables y dejarlos todos no-detectables (ninguna sección visible).
              captureGroupClickables();
              setAllGroupsInteractive(false);
              setDpadInteractive(false);
              setCursorDpadInteractive(false);
              // Requerimiento 016: aplica DEFAULT_CURSOR_CONFIG sobre #main-cursor de entrada — sin
              // esto, un usuario sin config guardada (compass-config-state.cursorConfig nunca
              // llega, ver el listener de message) se queda con la apariencia hardcodeada del
              // markup original (geometry: ring) en vez del default nuevo (geometry: point), porque
              // applyCursorConfigLive() de otro modo solo se dispara al recibir un valor guardado.
              applyCursorConfigLive();
              // Mismo criterio que el click de las porciones (ver script de arriba): no cierra
              // localmente, manda la intención y espera a que el padre la rebroadcastee a los dos
              // paneles.
              document.querySelector('#settings-close-btn').addEventListener('click', function () {
                send({ action: 'compass-section-changed', section: null });
              });

              document.querySelectorAll('[data-step]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                  var key = btn.dataset.step;
                  send({ action: 'compass-update-' + key, delta: Number(btn.dataset.dir) * fieldStep(key) });
                });
              });
              document.querySelector('#settings-dual-panel-toggle').addEventListener('click', function () {
                send({ action: 'compass-toggle-dual-panel' });
              });
              document.querySelector('#settings-save-config-btn').addEventListener('click', function () {
                send({ action: 'compass-save-config' });
              });

              document.querySelectorAll('[data-overlay-toggle]').forEach(function (el) {
                el.addEventListener('click', function () {
                  send({ action: 'compass-toggle-overlay', key: el.dataset.overlayToggle });
                });
              });
              document.querySelector('#settings-save-overlays-btn').addEventListener('click', function () {
                send({ action: 'compass-save-overlays' });
              });

              // Pedido del usuario (ampliación): filas del panel "EXIT" — a diferencia de las de
              // arriba, NO mandan postMessage al padre: llaman directo a "window.__requestConfirm"
              // (definida en el script del modal de confirmación, más abajo, expuesta en window),
              // mismo comportamiento que antes tenían las porciones "action" sueltas.
              document.querySelector('#settings-exit-back-label').setAttribute('value', STATIC.exitBack);
              document.querySelector('#settings-exit-logout-label').setAttribute('value', STATIC.exitLogout);
              document.querySelectorAll('[data-exit-action]').forEach(function (el) {
                el.addEventListener('click', function () {
                  if (window.__requestConfirm) window.__requestConfirm(el.dataset.exitAction);
                });
              });

              // Pedido del usuario (ampliación, sección 11): fila "Position" — mismo criterio que
              // "Doble panel" (no aplica local, manda la intención y espera el rebroadcast).
              document.querySelector('#settings-position-toggle').addEventListener('click', function () {
                send({ action: 'compass-toggle-position-mode' });
              });

              // Requerimiento 016: fila "Cursor" — a diferencia de "Position", abrir/cerrar el
              // sub-panel es 100% local (no hay nada que sincronizar con otro iframe, el cursor
              // vive solo acá). Mutuamente excluyente con el d-pad de Position: abrir uno cierra
              // el otro, por el mismo motivo documentado junto a PANEL_HEIGHT (el panel no tiene
              // altura para mostrar los dos a la vez).
              document.querySelector('#settings-cursor-toggle').addEventListener('click', function () {
                cursorDpadOpen = !cursorDpadOpen;
                if (cursorDpadOpen) {
                  hidePositionDpad();
                  document.querySelector('#cursor-dpad-group').setAttribute('visible', true);
                  setCursorDpadInteractive(true);
                  refreshCursorDpad();
                } else {
                  document.querySelector('#cursor-dpad-group').setAttribute('visible', false);
                  setCursorDpadInteractive(false);
                }
                refreshCursorToggle();
              });
              // Pedido del usuario: fila "Paso" — ajusta cursorStep en vivo, mismo criterio que
              // "Paso" en Position (no manda nada por su cuenta, el próximo +/- de posición/escala
              // ya lo usa).
              document.querySelector('#dpad-cursor-step-minus').addEventListener('click', function () {
                cursorStep = Math.max(CURSOR_STEP_RANGE.min, +(cursorStep - CURSOR_STEP_INCREMENT).toFixed(2));
                refreshCursorDpad();
              });
              document.querySelector('#dpad-cursor-step-plus').addEventListener('click', function () {
                cursorStep = Math.min(CURSOR_STEP_RANGE.max, +(cursorStep + CURSOR_STEP_INCREMENT).toFixed(2));
                refreshCursorDpad();
              });
              CURSOR_POSITION_AXES.forEach(function (axis, i) {
                document.querySelectorAll('[data-cursor-position-step="' + axis + '"]').forEach(function (btn) {
                  btn.addEventListener('click', function () {
                    var dir = Number(btn.dataset.dir);
                    cursorConfig.position[i] = +(cursorConfig.position[i] + dir * cursorStep).toFixed(2);
                    applyCursorConfigLive();
                  });
                });
              });
              document.querySelector('#dpad-cursor-scale-minus').addEventListener('click', function () {
                cursorConfig.scale = Math.max(CURSOR_SCALE_RANGE.min, +(cursorConfig.scale - cursorStep).toFixed(2));
                applyCursorConfigLive();
              });
              document.querySelector('#dpad-cursor-scale-plus').addEventListener('click', function () {
                cursorConfig.scale = Math.min(CURSOR_SCALE_RANGE.max, +(cursorConfig.scale + cursorStep).toFixed(2));
                applyCursorConfigLive();
              });
              document.querySelector('#dpad-cursor-fuse-minus').addEventListener('click', function () {
                cursorConfig.fuseTimeout = Math.max(CURSOR_FUSE_RANGE.min, cursorConfig.fuseTimeout - CURSOR_FUSE_STEP);
                applyCursorConfigLive();
              });
              document.querySelector('#dpad-cursor-fuse-plus').addEventListener('click', function () {
                cursorConfig.fuseTimeout = Math.min(CURSOR_FUSE_RANGE.max, cursorConfig.fuseTimeout + CURSOR_FUSE_STEP);
                applyCursorConfigLive();
              });
              // Paleta fija cíclica (sin picker libre, ver requerimiento.md sección 5): +/- da la
              // vuelta al llegar a un extremo en vez de detenerse.
              function cycle(list, current, dir) {
                var idx = list.indexOf(current);
                if (idx === -1) idx = 0;
                return list[(idx + dir + list.length) % list.length];
              }
              document.querySelector('#dpad-cursor-color-minus').addEventListener('click', function () {
                cursorConfig.color = cycle(CURSOR_COLOR_NAMES, cursorConfig.color, -1);
                applyCursorConfigLive();
              });
              document.querySelector('#dpad-cursor-color-plus').addEventListener('click', function () {
                cursorConfig.color = cycle(CURSOR_COLOR_NAMES, cursorConfig.color, 1);
                applyCursorConfigLive();
              });
              document.querySelector('#dpad-cursor-geometry-minus').addEventListener('click', function () {
                cursorConfig.geometry = cycle(CURSOR_GEOMETRY_NAMES, cursorConfig.geometry, -1);
                applyCursorConfigLive();
              });
              document.querySelector('#dpad-cursor-geometry-plus').addEventListener('click', function () {
                cursorConfig.geometry = cycle(CURSOR_GEOMETRY_NAMES, cursorConfig.geometry, 1);
                applyCursorConfigLive();
              });
              document.querySelector('#settings-cursor-visible-toggle').addEventListener('click', function () {
                cursorConfig.visible = !cursorConfig.visible;
                applyCursorConfigLive();
              });
              document.querySelector('#dpad-cursor-save-btn').addEventListener('click', function () {
                if (!cursorHasUnsavedChanges) return;
                send({ action: 'compass-save-cursor', config: cursorConfig });
                savedCursorConfig = JSON.parse(JSON.stringify(cursorConfig));
                refreshCursorCancelState();
                var btn = document.querySelector('#dpad-cursor-save-btn');
                var prevColor = btn.getAttribute('color');
                btn.setAttribute('color', '#117711');
                setTimeout(function () { btn.setAttribute('color', prevColor); }, 400);
              });
              // A diferencia de Position (cuyo Cancel manda 'position-reset' porque el elemento
              // vive en OTRO iframe), acá no hace falta mensaje: cursorConfig vive en este mismo
              // script, restaurar el snapshot guardado alcanza.
              document.querySelector('#dpad-cursor-cancel-btn').addEventListener('click', function () {
                if (!cursorHasUnsavedChanges) return;
                cursorConfig = JSON.parse(JSON.stringify(savedCursorConfig));
                applyCursorConfigLive();
              });
              // Fila "Paso" (pedido del usuario: el valor de edición a aplicar es ajustable, ya
              // no fijo) — solo cambia currentStep, no manda nada por su cuenta: el próximo
              // click de posición/rotación ya lo usa.
              document.querySelector('#dpad-step-minus').addEventListener('click', function () {
                currentStep = Math.max(POSITION_STEP_RANGE.min, +(currentStep - POSITION_STEP_INCREMENT).toFixed(2));
                // Pedido del usuario (ampliación): el step se guarda POR ELEMENTO — al cambiarlo se
                // manda al overlay (vía padre), que lo persiste junto con position/rotation al
                // pulsar Guardar (ver 'position-step' en vrPositionControl.js).
                if (selectedPositionKey) send({ action: 'position-step', key: selectedPositionKey, step: currentStep });
                refreshPositionDpad();
              });
              document.querySelector('#dpad-step-plus').addEventListener('click', function () {
                currentStep = Math.min(POSITION_STEP_RANGE.max, +(currentStep + POSITION_STEP_INCREMENT).toFixed(2));
                if (selectedPositionKey) send({ action: 'position-step', key: selectedPositionKey, step: currentStep });
                refreshPositionDpad();
              });
              // Steppers X/Y/Z de posición del d-pad genérico: solo tienen sentido si hay un
              // elemento seleccionado (selectedPositionKey) — si no, el grupo está oculto y no
              // deberían ser clickeables, pero por las dudas (raycast compartido) se valida acá
              // también.
              document.querySelectorAll('[data-position-step]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                  if (!selectedPositionKey) return;
                  var axis = btn.dataset.positionStep;
                  var dir = Number(btn.dataset.dir);
                  var delta = dir * currentStep;
                  send({ action: 'position-move', key: selectedPositionKey, kind: 'position', axis: axis, delta: delta });
                  // Actualización optimista del valor mostrado (mismo criterio que el d-pad
                  // original de vrPositionControl.js: mover ya refresca la etiqueta, sin esperar
                  // confirmación de vuelta).
                  var axisIndex = POSITION_AXES.indexOf(axis);
                  if (axisIndex !== -1) {
                    selectedPositionValue[axisIndex] = +(selectedPositionValue[axisIndex] + delta).toFixed(2);
                    refreshPositionDpad();
                  }
                });
              });
              // Pedido del usuario (ampliación): 3 steppers más, uno por eje de rotación — mismo
              // patrón que los de posición, con kind: 'rotation' para que
              // vrPositionControl.js sepa qué campo tocar (ver aframe-overlay-modules.js).
              document.querySelectorAll('[data-rotation-step]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                  if (!selectedPositionKey) return;
                  var axis = btn.dataset.rotationStep;
                  var dir = Number(btn.dataset.dir);
                  var delta = dir * currentStep;
                  send({ action: 'position-move', key: selectedPositionKey, kind: 'rotation', axis: axis, delta: delta });
                  var axisIndex = POSITION_AXES.indexOf(axis);
                  if (axisIndex !== -1) {
                    selectedRotationValue[axisIndex] = +(selectedRotationValue[axisIndex] + delta).toFixed(2);
                    refreshPositionDpad();
                  }
                });
              });
              // Pedido del usuario: fila "Scale" — un solo valor uniforme (no por eje), mismo
              // patrón de mensaje que posición/rotación con kind: 'scale' (ver setScale en
              // vrPositionControl.js). Clamp local a SCALE_MIN/MAX para no mandar un valor
              // negativo o absurdamente grande por apretar +/- de más.
              document.querySelector('#dpad-scale-minus').addEventListener('click', function () {
                if (!selectedPositionKey) return;
                var next = Math.max(SCALE_MIN, +(selectedScaleValue - currentStep).toFixed(2));
                var delta = +(next - selectedScaleValue).toFixed(2);
                if (delta === 0) return;
                send({ action: 'position-move', key: selectedPositionKey, kind: 'scale', delta: delta });
                selectedScaleValue = next;
                refreshPositionDpad();
              });
              document.querySelector('#dpad-scale-plus').addEventListener('click', function () {
                if (!selectedPositionKey) return;
                var next = Math.min(SCALE_MAX, +(selectedScaleValue + currentStep).toFixed(2));
                var delta = +(next - selectedScaleValue).toFixed(2);
                if (delta === 0) return;
                send({ action: 'position-move', key: selectedPositionKey, kind: 'scale', delta: delta });
                selectedScaleValue = next;
                refreshPositionDpad();
              });
              document.querySelector('#dpad-save-btn').addEventListener('click', function () {
                if (!selectedPositionKey) return;
                send({ action: 'position-save', key: selectedPositionKey });
                // Pedido del usuario (ampliación): lo recién guardado pasa a ser el nuevo baseline
                // — Cancel se oculta porque ya no hay cambios sin guardar. Incluye el step.
                savedPositionValue = selectedPositionValue.slice();
                savedRotationValue = selectedRotationValue.slice();
                savedStep = currentStep;
                savedScaleValue = selectedScaleValue;
                refreshCancelState();
                var btn = document.querySelector('#dpad-save-btn');
                var prevColor = btn.getAttribute('color');
                btn.setAttribute('color', '#117711');
                setTimeout(function () { btn.setAttribute('color', prevColor); }, 400);
              });
              // Pedido del usuario (ampliación): botón "Cancel" — solo clickeable cuando hay
              // cambios sin guardar (refreshCancelState lo muestra/oculta). Manda 'position-reset'
              // y espera a que vrPositionControl.js restaure el último valor guardado y conteste
              // con 'position-element-selected' (que acá actualiza el d-pad y vuelve a ocultar
              // Cancel, ver el listener de message más abajo).
              document.querySelector('#dpad-cancel-btn').addEventListener('click', function () {
                if (!selectedPositionKey || !hasUnsavedChanges) return;
                send({ action: 'position-reset', key: selectedPositionKey });
              });
            });

            window.addEventListener('message', function (ev) {
              var msg = ev.data;
              if (!msg || msg.source !== 'ars-sync-test') return;
              if (msg.action === 'compass-config-state') {
                state = msg;
                // Requerimiento 016: a diferencia del resto de state (que sí se re-aplica sin
                // condición en cada broadcast, porque el usuario no lo está editando en vivo acá),
                // cursorConfig solo se re-hidrata cuando el valor recibido es REALMENTE distinto
                // del último guardado que ya se aplicó — esto cubre tanto la carga inicial (arranca
                // en DEFAULT_CURSOR_CONFIG, cualquier config real guardada difiere) como un guardado
                // hecho en el panel HERMANO (dual panel): sin esto, cada broadcast periódico (que
                // dispara cualquier otro cambio del menú, no solo Cursor) pisaría en silencio una
                // edición de cursor sin guardar en ESTE panel.
                if (msg.cursorConfig && JSON.stringify(msg.cursorConfig) !== JSON.stringify(savedCursorConfig)) {
                  cursorConfig = Object.assign({}, DEFAULT_CURSOR_CONFIG, msg.cursorConfig, {
                    position: (msg.cursorConfig.position || DEFAULT_CURSOR_CONFIG.position).slice(),
                  });
                  savedCursorConfig = JSON.parse(JSON.stringify(cursorConfig));
                  // applyCursorVisual (no applyCursorConfigLive): este valor ya vino del padre, no
                  // hace falta devolverlo por 'compass-cursor-live' — evita un eco innecesario.
                  applyCursorVisual();
                }
                refreshDisplay();
              } else if (msg.action === 'cursor-live-apply') {
                // Pedido del usuario: sincronización entre paneles a través del padre, no por
                // cambio de estado de React — ver el comentario grande junto a
                // applyCursorConfigLive. Actualiza el cursorConfig local (para que, si este mismo
                // panel abre luego su propio sub-panel de Cursor, ya muestre el valor en vivo del
                // hermano) y aplica el efecto visual, pero NO toca savedCursorConfig (esto no es un
                // guardado, sigue siendo un cambio en curso) ni reenvía nada (applyCursorVisual, no
                // applyCursorConfigLive — si reenviara, el padre lo devolvería de nuevo en eco).
                if (msg.config) {
                  cursorConfig = Object.assign({}, cursorConfig, msg.config, {
                    position: (msg.config.position || cursorConfig.position).slice(),
                  });
                  applyCursorVisual();
                }
              } else if (msg.action === 'compass-section-changed') {
                // Único lugar que de verdad abre/cierra el panel — la fuente de verdad es
                // SyncStereoTestView.jsx (ver 'compass-section-changed' en handleMessage ahí),
                // este listener solo aplica lo que el padre ya decidió. Idempotente: si esta
                // MISMA instancia originó el cambio, volver a aplicar la misma sección es un
                // no-op visual.
                if (msg.section) window.__activateSettingsSection(msg.section);
                else closeSettingsPanel();
              } else if (msg.action === 'position-element-selected') {
                // Pedido del usuario (ampliación, sección 11): un marcador rojo del overlay real
                // se clickeó — muestra el d-pad genérico con la posición actual de ESE elemento.
                // No cambia currentSection ni abre el panel por su cuenta: si el usuario todavía
                // no entró a "Interfaz", el grupo entero sigue oculto (visible solo cuando
                // currentSection === 'interface', ver __activateSettingsSection) — el d-pad queda
                // listo pero no se le impone la sección al usuario.
                selectedPositionKey = msg.key;
                selectedPositionValue = msg.position.slice();
                selectedRotationValue = (msg.rotation || [0, 0, 0]).slice();
                // Pedido del usuario: la escala también se restaura por elemento (o 1 por defecto
                // si el elemento nunca se escaló) — mismo criterio que step/position/rotation.
                selectedScaleValue = typeof msg.scale === 'number' && Number.isFinite(msg.scale) ? msg.scale : 1;
                // Pedido del usuario (ampliación): el "step" se guarda por elemento — al seleccionar
                // uno, se restaura su step guardado (o el default si no hay ninguno para ESE
                // elemento). El overlay lo incluye en 'position-element-selected' (ver
                // vrPositionControl.js: onSelect y carga de BD).
                if (typeof msg.step === 'number' && Number.isFinite(msg.step)) {
                  currentStep = Math.min(POSITION_STEP_RANGE.max, Math.max(POSITION_STEP_RANGE.min, msg.step));
                } else {
                  currentStep = DEFAULT_POSITION_STEP;
                }
                // Pedido del usuario (ampliación): al seleccionar (o al restaurar tras Cancel), el
                // valor recibido es el estado guardado — baseline = actual, sin cambios pendientes,
                // así que Cancel arranca oculto. Incluye el step.
                savedPositionValue = selectedPositionValue.slice();
                savedRotationValue = selectedRotationValue.slice();
                savedStep = currentStep;
                savedScaleValue = selectedScaleValue;
                // Requerimiento 016: mutuamente excluyente con el sub-panel de Cursor (ver el
                // click handler de #settings-cursor-toggle, que hace lo mismo en la otra dirección).
                if (cursorDpadOpen) hideCursorDpad();
                document.querySelector('#position-dpad-group').setAttribute('visible', true);
                setDpadInteractive(true);
                refreshPositionDpad();
              }
            });
          })();
        </script>

        <script>
          // Panel de confirmación (pedido del usuario) para las filas "Volver"/"Cerrar sesión" de
          // la sección "EXIT" — reusa las mismas etiquetas estáticas que el panel de configuración
          // ("settings-static-labels", ver script anterior).
          (function () {
            function send(msg) {
              window.parent.postMessage(Object.assign({ source: 'ars-sync-test' }, msg), '*');
            }

            var STATIC = JSON.parse(document.getElementById('settings-static-labels').textContent);
            var pendingAction = null; // 'back' | 'logout' | null
            // Pedido del usuario (ampliación): bisectriz de la sección "EXIT" para anclar el panel
            // de confirmación tangente a esa porción (ver __requestConfirm). Se interpola acá (este
            // es un <script> distinto al que define SECTION_BISECTOR, así que no comparten scope).
            var EXIT_BISECTOR = ${SECTIONS.find((s) => s.key === 'exit').thetaStart + WEDGE_THETA_LENGTH / 2};
            // Pedido del usuario: cachea el último email recibido por "compass-config-state" (lo
            // manda SyncStereoTestView.jsx, mismo mensaje que ya consume el panel de Configuración
            // para "#settings-session") para poder mostrarlo debajo del mensaje de "Cerrar sesión"
            // sin depender de que la pestaña Configuración haya estado abierta antes.
            var lastUserEmail = null;
            window.addEventListener('message', function (ev) {
              var msg = ev.data;
              if (!msg || msg.source !== 'ars-sync-test' || msg.action !== 'compass-config-state') return;
              lastUserEmail = msg.userEmail || null;
            });

            // Pedido del usuario: igual que las secciones del panel de Configuración (ver su
            // helper), el raycaster de A-Frame no filtra por visibilidad — se quita/reagrega la
            // clase ".clickable" de los botones del modal según esté abierto/cerrado, para que el
            // modal oculto no sea detectable.
            function setConfirmBtn(selector, active) {
              var el = document.querySelector(selector);
              if (!el) return;
              if (active) el.classList.add('clickable');
              else el.classList.remove('clickable');
            }
            function setConfirmInteractive(active) {
              setConfirmBtn('#confirm-yes-btn', active);
              setConfirmBtn('#confirm-cancel-btn', active);
            }

            function hideConfirm() {
              pendingAction = null;
              document.querySelector('#confirm-panel').setAttribute('visible', false);
              document.querySelector('#login-test-btn').setAttribute('visible', false);
              setConfirmInteractive(false);
              setConfirmBtn('#login-test-btn', false);
            }
            // Expuesta en window: la llama "__activateSettingsSection" (ver script anterior)
            // cuando se activa una porción tipo "panel" mientras este panel ya estaba abierto —
            // pedido del usuario: solo un panel puede estar abierto a la vez.
            window.__closeConfirmPanel = hideConfirm;

            // Expuesta en window: la llaman las filas "Volver"/"Cerrar sesión" de la sección "EXIT"
            // (ver buildExitGroupHTML). Cierra primero el panel de configuración si estaba abierto.
            window.__requestConfirm = function (action) {
              if (window.__closeSettingsPanel) window.__closeSettingsPanel();
              pendingAction = action;
              // Pedido del usuario (ampliación): el panel de confirmación se ancla/tangencia a la
              // sección "EXIT" como el panel de configuración de cada sección — rota su ancla
              // (#confirm-panel-anchor, hijo de #compass-wheel) a la bisectriz de "EXIT" antes de
              // mostrarlo. Como __closeSettingsPanel() de arriba solo oculta #settings-panel (no
              // toca #settings-panel-anchor), y #settings-panel ya estaba anclado a "EXIT" en este
              // punto (el click vino de una fila de esa sección), los dos quedan sobre la misma
              // tangente — pero se rota explícitamente para no depender de ese flujo.
              var confirmAnchor = document.querySelector('#confirm-panel-anchor');
              if (confirmAnchor) {
                confirmAnchor.setAttribute('rotation', '0 ' + EXIT_BISECTOR + ' 0');
              }
              var messageKey = action === 'logout' ? 'confirmLogout' : 'confirmBack';
              document.querySelector('#confirm-message').setAttribute('value', STATIC[messageKey]);
              // Solo tiene sentido mostrar la sesión activa al confirmar "Cerrar sesión" — en
              // "Volver" se deja vacío (mismo criterio que "login-test-btn" más abajo).
              document.querySelector('#confirm-user').setAttribute(
                'value', action === 'logout' ? (lastUserEmail ? (STATIC.loggedInAs + ': ' + lastUserEmail) : STATIC.noSession) : '',
              );
              document.querySelector('#confirm-panel').setAttribute('visible', true);
              // Requerimiento 013 (ampliación): el botón "login-test" solo tiene sentido al
              // confirmar "Cerrar sesión" — es la alternativa rápida a cerrar sesión y recargar a
              // mano el usuario de prueba.
              document.querySelector('#login-test-btn').setAttribute('visible', action === 'logout');
              // Solo lo visible queda detectable (pedido del usuario, ver setConfirmInteractive).
              setConfirmInteractive(true);
              setConfirmBtn('#login-test-btn', action === 'logout');
            };

            document.addEventListener('DOMContentLoaded', function () {
              document.querySelector('#confirm-yes-label').setAttribute('value', STATIC.confirmYes);
              document.querySelector('#confirm-cancel-label').setAttribute('value', STATIC.confirmCancel);
              document.querySelector('#login-test-label').setAttribute('value', STATIC.loginTest);
              // Pedido del usuario: al cargar el modal está cerrado — dejar sus botones
              // no-detectables (el HTML los trae con .clickable por defecto).
              setConfirmInteractive(false);
              setConfirmBtn('#login-test-btn', false);

              document.querySelector('#confirm-yes-btn').addEventListener('click', function () {
                if (pendingAction) send({ action: 'compass-do-action', name: pendingAction });
                hideConfirm();
              });
              document.querySelector('#confirm-cancel-btn').addEventListener('click', hideConfirm);
              document.querySelector('#login-test-btn').addEventListener('click', function () {
                send({ action: 'compass-do-action', name: 'login-test' });
                hideConfirm();
              });
            });
          })();
        </script>

        <script>
          // Puente de sincronización de cámara por postMessage — mismo patrón que
          // VRConeOverlaySync.jsx/VRLocalVideoOverlaySync.jsx, pero SOLO entre las dos instancias
          // de esta brújula (izquierda/derecha) — SyncStereoTestView.jsx lo relaya exactamente
          // así, nunca hacia video/cono/karaoke. Se intentó reenviarlo también a esos overlays
          // (para que giraran junto con la cámara aunque ya no reciban el drag/touch real, al
          // quedar la brújula como capa más externa), pero eso pisaba el pitch propio que cada uno
          // calcula para apuntar a su plano ("initialCursorPitch" en VRLocalVideoOverlaySync.jsx),
          // y con timing distinto por panel el video terminaba a una altura distinta en cada uno
          // — revertido, ver problems_solutions.md del Requerimiento 013.
          (function () {
            function send(msg) {
              window.parent.postMessage(Object.assign({ source: 'ars-sync-test' }, msg), '*');
            }
            var cameraEl = null;
            var lookControls = null;
            var lastSentYaw = null, lastSentPitch = null;
            var lastReceivedYaw = null, lastReceivedPitch = null;
            var EPS = 0.001;

            function findCamera() {
              cameraEl = document.querySelector('a-camera');
              if (cameraEl && cameraEl.components && cameraEl.components['look-controls']) {
                lookControls = cameraEl.components['look-controls'];
                setInterval(pollCameraMovement, 16);
              } else {
                setTimeout(findCamera, 100);
              }
            }
            findCamera();

            function pollCameraMovement() {
              if (!lookControls || !lookControls.yawObject || !lookControls.pitchObject) return;
              var yaw = lookControls.yawObject.rotation.y;
              var pitch = lookControls.pitchObject.rotation.x;
              var matchesReceived = lastReceivedYaw !== null &&
                Math.abs(yaw - lastReceivedYaw) < EPS && Math.abs(pitch - lastReceivedPitch) < EPS;
              var changed = lastSentYaw === null ||
                Math.abs(yaw - lastSentYaw) > EPS || Math.abs(pitch - lastSentPitch) > EPS;
              if (!matchesReceived && changed) {
                lastSentYaw = yaw; lastSentPitch = pitch;
                send({ action: 'camera-rotation', yaw: yaw, pitch: pitch });
              }
            }

            window.addEventListener('message', function (ev) {
              var msg = ev.data;
              if (!msg || msg.source !== 'ars-sync-test') return;
              if (msg.action === 'camera-rotation' && lookControls) {
                lastReceivedYaw = msg.yaw;
                lastReceivedPitch = msg.pitch;
                lookControls.yawObject.rotation.y = msg.yaw;
                lookControls.pitchObject.rotation.x = msg.pitch;
              }
            });
          })();
        </script>

        <script>
          // Pedido del usuario: en web, además del reticle circular (gaze/dwell, que dispara desde
          // el CENTRO de la pantalla), el mouse debe poder seleccionar cualquier elemento
          // clickeable con su click real, resolviendo por la POSICIÓN del mouse (no el centro).
          // Hasta ahora el click de mouse caía en el componente "cursor" por defecto del <a-cursor>,
          // que también apunta al centro — por eso se desactivó (cursor="enabled: false") y acá se
          // reimplementa con un raycast manual a la posición del mouse, mismo patrón que
          // vrPositionControl.js/aframe-overlay-modules.js.
          //
          // Se usa pointerdown/pointerup con umbral de movimiento (no "click" directo) para no
          // confundir un arrastre de cámara (drag-to-look, ver el script de más abajo) con un click:
          // si el puntero se movió más de 4px entre bajar y soltar, es arrastre y no se activa nada.
          (function () {
            var isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(navigator.userAgent || '');
            if (isMobile) return;

            var sceneEl = document.querySelector('a-scene');
            var THREE = AFRAME.THREE;
            var mouse = new THREE.Vector2();
            var raycaster = new THREE.Raycaster();
            raycaster.far = 30;

            var downX = 0;
            var downY = 0;
            var moved = false;

            function collectTargets() {
              var targets = [];
              document.querySelectorAll('.clickable').forEach(function (el) {
                if (!el.object3D) return;
                el.object3D.traverse(function (o) {
                  if (o.isMesh) targets.push({ mesh: o, el: el });
                });
              });
              return targets;
            }

            window.addEventListener('pointerdown', function (e) {
              downX = e.clientX;
              downY = e.clientY;
              moved = false;
            });
            window.addEventListener('pointermove', function (e) {
              if (Math.abs(e.clientX - downX) > 4 || Math.abs(e.clientY - downY) > 4) moved = true;
            });
            window.addEventListener('pointerup', function (e) {
              if (moved) return;
              if (!sceneEl || !sceneEl.camera) return;
              var canvas = sceneEl.canvas;
              if (!canvas) return;
              var rect = canvas.getBoundingClientRect();
              var x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
              var y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
              mouse.set(x, y);
              raycaster.setFromCamera(mouse, sceneEl.camera);
              var targets = collectTargets();
              var hits = raycaster.intersectObjects(targets.map(function (t) { return t.mesh; }), false);
              if (!hits.length) return;
              var target = targets.find(function (t) { return t.mesh === hits[0].object; });
              if (target) {
                target.el.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
              }
            });
          })();
        </script>

        <script>
          // Pedido del usuario: en web, poder mover la cámara con el mouse (click sostenido +
          // arrastre), igual que ya se puede en mobile con el giroscopio. La brújula es la capa
          // MÁS EXTERNA de cada panel (ver SyncStereoTestView.jsx, pointerEvents:'auto' en todas
          // las capas), así que el mousedown/mousemove real solo le llega a ELLA, nunca al
          // overlay real de abajo (video/cono/karaoke) — por eso, hasta ahora, arrastrar el mouse
          // solo apuntaba el gaze de la brújula, sin mover la vista.
          //
          // A diferencia del bloque de arriba (que reenvía la ROTACIÓN YA CALCULADA de esta
          // cámara y quedó documentado como bug — ver el comentario de "revertido" arriba), acá se
          // reenvían los DELTAS crudos del mouse (mismos que consume look-controls: e.movementX/Y
          // mientras el botón está sostenido) al overlay de contenido del MISMO panel, para que
          // ESE overlay los sume a su PROPIA rotación con su propia fórmula (misma que usa
          // look-controls internamente) — nunca se pisa un valor absoluto ajeno, solo se le da
          // input a la cámara real, exactamente como ya recibe su propio drag/giroscopio. La
          // sincronización entre panel izquierdo/derecho del overlay de contenido ya la resuelve
          // su propio puente existente (pollCameraMovement en VRLocalVideoOverlaySync.jsx/
          // VRConeOverlaySync.jsx/aframe-overlay-modules.js), así que acá alcanza con reenviar el
          // delta una sola vez, al panel de este mismo lado.
          //
          // Mobile no se toca: ahí el giroscopio ya llega directo a cada overlay real (sin pasar
          // por esta brújula), así que este puente ni siquiera se activa.
          (function () {
            var isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(navigator.userAgent || '');
            if (isMobile) return;

            function send(msg) {
              window.parent.postMessage(Object.assign({ source: 'ars-sync-test' }, msg), '*');
            }

            var dragging = false;
            window.addEventListener('mousedown', function (e) {
              if (e.button === 0) dragging = true;
            });
            window.addEventListener('mouseup', function () { dragging = false; });
            window.addEventListener('mousemove', function (e) {
              if (!dragging) return;
              var dx = e.movementX || 0;
              var dy = e.movementY || 0;
              if (!dx && !dy) return;
              send({ action: 'mouse-look-delta', dx: dx, dy: dy });
            });

            // Pedido del usuario: las 4 flechas mueven la cámara del overlay de contenido
            // (karaoke/video/cono) del MISMO panel — arriba/abajo adelante/atrás (hacia donde
            // mira), izquierda/derecha lateral (strafe, perpendicular a hacia donde mira) — mismo
            // criterio que el drag de mouse de arriba (esta brújula es la única capa que recibe
            // el teclado real en web, ver wasd-controls deshabilitado en el a-camera de más
            // abajo, que ahora deja de consumir las flechas acá). El campo axis distingue qué eje
            // mover; delta el signo.
            window.addEventListener('keydown', function (e) {
              var isForward = e.key === 'ArrowUp' || e.key === 'ArrowDown';
              var isStrafe = e.key === 'ArrowLeft' || e.key === 'ArrowRight';
              if (!isForward && !isStrafe) return;
              e.preventDefault();
              var delta = (e.key === 'ArrowUp' || e.key === 'ArrowRight') ? 1 : -1;
              send({ action: 'camera-zoom-delta', delta: delta, axis: isStrafe ? 'strafe' : 'forward' });
            });
          })();
        </script>
      </body>
    </html>
  `;

  return (
    <iframe
      ref={forwardedRef}
      title="AR-SYNC Compass Menu"
      srcDoc={srcDoc}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        background: 'transparent',
        pointerEvents: 'auto',
      }}
      allow="xr-spatial-tracking; fullscreen"
    />
  );
};

export default React.forwardRef((props, ref) => SyncConfigCompassMenuInner({ ...props, forwardedRef: ref }));
