import React from 'react';
import { useVRLanguage } from '../../../../../components/VRConfig/VRLanguageContext';

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
//    agrupadas en `#compass-wheel` (rotable en Y). Dos tipos de porción:
//     - "panel" (Configuración, Overlays): muestra/oculta el grupo correspondiente de
//       `#settings-panel` (geometría 3D de esta misma escena, ver más abajo).
//     - "action" (Volver, Cerrar sesión): abre `#confirm-panel` con el mensaje correspondiente en
//       vez de disparar la acción directo (pedido del usuario, evita un dwell/click accidental) —
//       recién al confirmar se manda `compass-do-action`. "Volver" reemplaza al botón "Volver" que
//       tenía SyncStereoTestView.jsx; "Cerrar sesión" reemplaza al botón "← Volver a inicio" de
//       ARTestMirrorButton.jsx mientras AR-SYNC está abierto (ver ese archivo).
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
const SECTIONS = [
  { key: 'config', labelKey: 'arsConfig.tab.config', thetaStart: 0, color: '#1565C0', type: 'panel' },
  { key: 'overlays', labelKey: 'arsConfig.tab.overlays', thetaStart: 90, color: '#2e7d32', type: 'panel' },
  { key: 'back', labelKey: 'home.back', thetaStart: 180, color: '#546E7A', type: 'action', action: 'back' },
  // dwell: false — "Cerrar sesión" es destructivo (borra la credencial guardada) y NO se activa
  // por apuntado sostenido, solo con click directo. El reticle se queda blanco/neutro sobre esta
  // porción en vez de ponerse rojo/achicarse, para que se note que ahí el dwell no hace nada.
  { key: 'logout', labelKey: 'home.logout', thetaStart: 270, color: '#c62828', type: 'action', action: 'logout', dwell: false },
];
const WEDGE_THETA_LENGTH = 360 / SECTIONS.length;
const STEP_DEG = WEDGE_THETA_LENGTH;
const RADIUS = 1.2;
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
  return `
    <a-entity id="settings-config-group" visible="false">
      ${rows}
      <a-plane class="clickable" id="settings-save-config-btn" width="1.3" height="0.32" color="#2e7d32" material="shader: flat; side: double;" position="0 -0.95 0.01">
        <a-text id="settings-save-config-label" align="center" color="#fff" width="6" position="0 0 0.01"></a-text>
      </a-plane>
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
  return `
    <a-entity id="settings-overlays-group" visible="false">
      ${rows}
      <a-plane class="clickable" id="settings-save-overlays-btn" width="1.3" height="0.32" color="#2e7d32" material="shader: flat; side: double;" position="0 -0.9 0.01">
        <a-text id="settings-save-overlays-label" align="center" color="#fff" width="6" position="0 0 0.01"></a-text>
      </a-plane>
    </a-entity>
  `;
}

// Panel completo: fondo + título + cerrar + sesión + los dos grupos de arriba (uno visible a la
// vez, según qué porción se activó). Se ubica 3m al frente del origen (misma dirección -Z en la
// que ya mira la cámara por defecto, ver CAMERA_POSITION/pitch inicial) para que aparezca cerca de
// donde el usuario ya está mirando al bajar la vista hacia la brújula, no en un punto arbitrario.
function buildSettingsPanelHTML() {
  return `
    <a-entity id="settings-panel" visible="false" rotation="-90 0 0" position="0 0.02 -3">
      <a-plane width="2.2" height="2.2" color="#1a1a1a" opacity="0.95" material="shader: flat; side: double;" position="0 0 0"></a-plane>
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
    </a-entity>
  `;
}

// Panel de confirmación (pedido del usuario) para las porciones tipo "action" ("Volver"/"Cerrar
// sesión") — un click/dwell en esas porciones ya no dispara la acción directo, primero abre este
// panel con el mensaje correspondiente y espera Confirmar/Cancelar. Misma ubicación que
// `#settings-panel` (nunca están abiertos los dos a la vez, uno es para porciones "panel" y el
// otro para "action") para que aparezca donde el usuario ya está mirando.
function buildConfirmPanelHTML() {
  return `
    <a-entity id="confirm-panel" visible="false" rotation="-90 0 0" position="0 0.02 -3">
      <a-plane width="2.2" height="1.1" color="#1a1a1a" opacity="0.95" material="shader: flat; side: double;" position="0 0 0"></a-plane>
      <a-text id="confirm-message" align="center" color="#ffffff" width="2.4" position="0 0.3 0.01"></a-text>
      <a-plane class="clickable" id="confirm-yes-btn" width="0.95" height="0.34" color="#c62828" material="shader: flat; side: double;" position="-0.55 -0.25 0.01">
        <a-text id="confirm-yes-label" align="center" color="#fff" width="6" position="0 0 0.01"></a-text>
      </a-plane>
      <a-plane class="clickable" id="confirm-cancel-btn" width="0.95" height="0.34" color="#333333" material="shader: flat; side: double;" position="0.55 -0.25 0.01">
        <a-text id="confirm-cancel-label" align="center" color="#fff" width="6" position="0 0 0.01"></a-text>
      </a-plane>
    </a-entity>
  `;
}

function buildWedgesHTML() {
  return SECTIONS.map(({ key, thetaStart, color, type, action, dwell }) => {
    // Texto ubicado en la bisectriz angular de cada porción. Geometría de A-Frame/THREE para
    // `a-cylinder` (sección radial en el plano XZ): x = radius*sin(theta), z = radius*cos(theta),
    // con theta en grados medido desde thetaStart — confirmado visualmente con las 2 porciones
    // originales (thetaStart 0/180° con thetaLength 180° caían en +X/-X, que es exactamente lo
    // que da esta fórmula con bisectriz en 90°/270°).
    const bisectorRad = (thetaStart + WEDGE_THETA_LENGTH / 2) * (Math.PI / 180);
    const textX = RADIUS * 0.6 * Math.sin(bisectorRad);
    const textZ = RADIUS * 0.6 * Math.cos(bisectorRad);
    return `
      <a-cylinder
        class="clickable compass-wedge"
        data-section="${key}"
        data-type="${type}"
        ${action ? `data-action="${action}"` : ''}
        ${dwell === false ? 'data-dwell="false"' : ''}
        radius="${RADIUS}"
        height="0.04"
        theta-start="${thetaStart}"
        theta-length="${WEDGE_THETA_LENGTH}"
        color="${color}"
        opacity="0.75"
        material="shader: flat; side: double;"
        position="0 0 0">
      </a-cylinder>
      <a-text
        data-section-label="${key}"
        value="__LABEL_${key}__"
        align="center"
        color="#ffffff"
        width="2.1"
        rotation="-90 0 0"
        position="${textX.toFixed(2)} 0.03 ${textZ.toFixed(2)}">
      </a-text>
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
    fields: Object.fromEntries(CONFIG_FIELDS.map((f) => [f.key, t(f.labelKey)])),
    // Panel de confirmación (pedido del usuario) para las porciones tipo "action" — evita que un
    // dwell/click accidental dispare "Volver"/"Cerrar sesión" sin que el usuario lo confirme.
    confirmBack: t('home.confirmBack'),
    confirmLogout: t('home.confirmLogout'),
    confirmYes: t('home.confirmYes'),
    confirmCancel: t('home.confirmCancel'),
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
            </a-entity>

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

            <!-- Flechas: rotan #compass-wheel 180° por click/dwell, en cada sentido. -->
            <a-plane
              class="clickable compass-arrow"
              data-arrow="left"
              width="0.4" height="0.4"
              color="#333333"
              material="shader: flat; side: double;"
              position="${(-(RADIUS + 0.45)).toFixed(2)} 0.02 0"
              rotation="-90 0 0">
              <a-text value="◄" align="center" color="#ffffff" width="6" position="0 0 0.01"></a-text>
            </a-plane>
            <a-plane
              class="clickable compass-arrow"
              data-arrow="right"
              width="0.4" height="0.4"
              color="#333333"
              material="shader: flat; side: double;"
              position="${(RADIUS + 0.45).toFixed(2)} 0.02 0"
              rotation="-90 0 0">
              <a-text value="►" align="center" color="#ffffff" width="6" position="0 0 0.01"></a-text>
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

            <!-- Panel 3D de la sección activa (Configuración/Overlays) — ver comentario grande al
                 principio del archivo sobre por qué es geometría de escena y no HTML/hijo de la
                 cámara. -->
            ${settingsPanelHTML}

            <!-- Panel de confirmación para "Volver"/"Cerrar sesión" — ver buildConfirmPanelHTML. -->
            ${buildConfirmPanelHTML()}
          </a-entity>

          <!-- Cámara con reticle de gaze estático (Requerimiento 012, mismo patrón que
               VRConeOverlaySync.jsx: SIN el componente cursor="fuse:..." nativo — su pipeline de
               eventos no se pudo hacer disparar en este contexto; el script de más abajo maneja
               color/escala/dwell/click a mano). El <a-cursor> primitivo sigue trayendo consigo el
               componente "cursor" por defecto (sin fuse), que es lo que hace que el click DIRECTO
               (real, no dwell) también dispare 'click' en el elemento intersectado. -->
          <a-camera position="${CAMERA_POSITION.x} ${CAMERA_POSITION.y} ${CAMERA_POSITION.z}" rotation="0 0 0">
            <a-cursor
              id="main-cursor"
              position="0 0 -1"
              geometry="primitive: ring; radiusInner: 0.02; radiusOuter: 0.03"
              material="color: white; shader: flat; opacity: 0.85"
              raycaster="objects: .clickable; far: 30; interval: 100">
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

            // Las porciones tipo "panel" (Configuración/Overlays) delegan en
            // "window.__activateSettingsSection" (definida por el script del panel 3D, más abajo
            // — ahí vive el estado de qué sección está abierta, el panel es dueño de su propia
            // visibilidad). Las de tipo "action" (Volver/Cerrar sesión) delegan en
            // "window.__requestConfirm" (definida por el script del panel de confirmación) — ya
            // no disparan la acción directo, primero piden confirmar (pedido del usuario).
            document.addEventListener('DOMContentLoaded', function () {
              var leftArrow = document.querySelector('[data-arrow="left"]');
              var rightArrow = document.querySelector('[data-arrow="right"]');
              if (leftArrow) leftArrow.addEventListener('click', function () { rotateWheel(-1); });
              if (rightArrow) rightArrow.addEventListener('click', function () { rotateWheel(1); });

              document.querySelectorAll('.compass-wedge').forEach(function (wedgeEl) {
                wedgeEl.addEventListener('click', function () {
                  if (wedgeEl.dataset.type === 'action') {
                    if (window.__requestConfirm) window.__requestConfirm(wedgeEl.dataset.action);
                  } else if (window.__activateSettingsSection) {
                    window.__activateSettingsSection(wedgeEl.dataset.section);
                  }
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

            function setVisual(color, scale) {
              cursorEl.setAttribute('material', 'color: ' + color + '; shader: flat; opacity: 0.85');
              cursorEl.setAttribute('scale', scale + ' ' + scale + ' ' + scale);
            }

            function tick() {
              if (!cursorEl) return;
              var raycasterComp = cursorEl.components && cursorEl.components['raycaster'];
              if (!raycasterComp) return;
              var target = (raycasterComp.intersectedEls && raycasterComp.intersectedEls[0]) || null;

              // Porciones marcadas data-dwell="false" (hoy: "Cerrar sesión", destructiva) no se
              // activan por apuntado sostenido — el reticle se queda neutro sobre ellas, como si
              // no hubiera nada que mirar. Solo responden al click directo (pipeline nativo de
              // A-Frame, mismo listener 'click' que el resto de porciones).
              if (target && target.dataset && target.dataset.dwell === 'false') {
                lockedEl = null;
                hoveredEl = target;
                fuseStart = null;
                setVisual('white', 1);
                return;
              }

              if (target !== lockedEl) lockedEl = null;

              if (target !== hoveredEl) {
                hoveredEl = target;
                fuseStart = (target && target !== lockedEl) ? Date.now() : null;
              }

              if (!target || target === lockedEl) {
                setVisual('white', 1);
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
                setVisual('white', 1);
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

              function refreshCoordsLabel() {
                coordsLabel.setAttribute('value', formatCoords(rootEl.getAttribute('position')));
              }
              refreshCoordsLabel();

              marker.addEventListener('click', function () {
                dpad.setAttribute('visible', !dpad.getAttribute('visible'));
              });

              document.querySelectorAll('#position-dpad [data-move]').forEach(function (btn) {
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
                var pos = rootEl.getAttribute('position');
                send({ action: 'compass-save-position', x: pos.x, y: pos.y, z: pos.z });
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
                'value', currentSection === 'overlays' ? STATIC.overlaysTitle : STATIC.configTitle,
              );
              document.querySelector('#settings-session').setAttribute(
                'value', state.userEmail ? (STATIC.loggedInAs + ': ' + state.userEmail) : STATIC.noSession,
              );

              FIELDS.forEach(function (field) {
                var labelEl = document.querySelector('[data-field-label="' + field.key + '"]');
                if (labelEl) labelEl.setAttribute('value', STATIC.fields[field.key] + ': ' + state[field.key] + 'px');
              });
              document.querySelector('#settings-save-config-label').setAttribute(
                'value', STATIC.saveConfig + ' (' + deviceLabel(state.deviceType) + ')',
              );
              document.querySelector('#settings-save-config-btn').setAttribute(
                'color', state.configSaved ? '#555555' : '#2e7d32',
              );

              document.querySelectorAll('[data-overlay-check]').forEach(function (el) {
                var selected = (state.selectedOverlays || []).indexOf(el.dataset.overlayCheck) !== -1;
                el.setAttribute('value', selected ? '✓' : '');
              });
              document.querySelector('#settings-save-overlays-label').setAttribute(
                'value', STATIC.saveOverlays + ' (' + deviceLabel(state.deviceType) + ')',
              );
              document.querySelector('#settings-save-overlays-btn').setAttribute(
                'color', state.overlaysSaved ? '#555555' : '#2e7d32',
              );
            }

            // Expuesta en window: la llama el script de rotación/selección (arriba) cuando se
            // activa una porción tipo "panel" — este script es el dueño del estado
            // abierto/cerrado del panel, no el de la brújula.
            window.__activateSettingsSection = function (section) {
              currentSection = section;
              document.querySelector('#settings-panel').setAttribute('visible', true);
              document.querySelector('#settings-config-group').setAttribute('visible', section === 'config');
              document.querySelector('#settings-overlays-group').setAttribute('visible', section === 'overlays');
              refreshDisplay();
            };

            document.addEventListener('DOMContentLoaded', function () {
              document.querySelector('#settings-close-btn').addEventListener('click', function () {
                currentSection = null;
                document.querySelector('#settings-panel').setAttribute('visible', false);
              });

              document.querySelectorAll('[data-step]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                  var key = btn.dataset.step;
                  send({ action: 'compass-update-' + key, delta: Number(btn.dataset.dir) * fieldStep(key) });
                });
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
            });

            window.addEventListener('message', function (ev) {
              var msg = ev.data;
              if (!msg || msg.source !== 'ars-sync-test' || msg.action !== 'compass-config-state') return;
              state = msg;
              refreshDisplay();
            });
          })();
        </script>

        <script>
          // Panel de confirmación (pedido del usuario) para las porciones tipo "action"
          // ("Volver"/"Cerrar sesión") — reusa las mismas etiquetas estáticas que el panel de
          // configuración ("settings-static-labels", ver script anterior).
          (function () {
            function send(msg) {
              window.parent.postMessage(Object.assign({ source: 'ars-sync-test' }, msg), '*');
            }

            var STATIC = JSON.parse(document.getElementById('settings-static-labels').textContent);
            var pendingAction = null; // 'back' | 'logout' | null

            function hideConfirm() {
              pendingAction = null;
              document.querySelector('#confirm-panel').setAttribute('visible', false);
            }

            // Expuesta en window: la llama el script de rotación/selección cuando se activa una
            // porción tipo "action".
            window.__requestConfirm = function (action) {
              pendingAction = action;
              var messageKey = action === 'logout' ? 'confirmLogout' : 'confirmBack';
              document.querySelector('#confirm-message').setAttribute('value', STATIC[messageKey]);
              document.querySelector('#confirm-panel').setAttribute('visible', true);
            };

            document.addEventListener('DOMContentLoaded', function () {
              document.querySelector('#confirm-yes-label').setAttribute('value', STATIC.confirmYes);
              document.querySelector('#confirm-cancel-label').setAttribute('value', STATIC.confirmCancel);

              document.querySelector('#confirm-yes-btn').addEventListener('click', function () {
                if (pendingAction) send({ action: 'compass-do-action', name: pendingAction });
                hideConfirm();
              });
              document.querySelector('#confirm-cancel-btn').addEventListener('click', hideConfirm);
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
