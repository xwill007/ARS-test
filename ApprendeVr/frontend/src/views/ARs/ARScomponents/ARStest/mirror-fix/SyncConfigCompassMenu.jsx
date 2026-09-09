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
//     - "panel" (Configuración, Overlays): abre/cierra el panel HTML correspondiente en
//       SyncStereoTestView.jsx vía `compass-select`/`compass-deselect`.
//     - "action" (Volver, Cerrar sesión): dispara de inmediato una acción vía `compass-do-action`
//       — sin panel ni estado "abierto/cerrado" que rastrear. "Volver" reemplaza al botón "Volver"
//       que tenía SyncStereoTestView.jsx; "Cerrar sesión" reemplaza al botón "← Volver a inicio"
//       de ARTestMirrorButton.jsx mientras AR-SYNC está abierto (ver ese archivo).
//  - Triángulo de norte: entidad FIJA (no rota con el grupo), marca el punto de referencia/frente
//    de la brújula — no es orientación geomagnética real (ver "No incluido" en el requerimiento).
//  - Dos flechas `.clickable` que rotan `#compass-wheel` 360°/N grados por activación (N =
//    secciones = 4 hoy, o sea 90° por paso), con click directo y con apuntado sostenido (dwell).
//
// Esta capa NO renderiza los controles de cada sección "panel" (sliders/checkboxes) — esos siguen
// siendo el HTML/React ya existente de SyncConfigMenu.jsx, mostrado por SyncStereoTestView.jsx
// cuando llega el mensaje `compass-select`. Acá solo se decide QUÉ sección quedó activa, o qué
// acción se disparó, vía postMessage — igual mecanismo (`source: 'ars-sync-test'`) que el resto de
// mirror-fix usa para sincronizar cámara/video entre paneles.
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

            // Solo las porciones tipo "panel" (Configuración/Overlays) llevan un registro de
            // "abierta" — las de tipo "action" (Volver/Cerrar sesión) disparan una vez y no
            // quedan abiertas ni se cierran solas.
            var openSection = null;
            function activatePanelSection(section) {
              if (openSection === section) return;
              openSection = section;
              send({ action: 'compass-select', section: section });
            }

            document.addEventListener('DOMContentLoaded', function () {
              var leftArrow = document.querySelector('[data-arrow="left"]');
              var rightArrow = document.querySelector('[data-arrow="right"]');
              if (leftArrow) leftArrow.addEventListener('click', function () { rotateWheel(-1); });
              if (rightArrow) rightArrow.addEventListener('click', function () { rotateWheel(1); });

              document.querySelectorAll('.compass-wedge').forEach(function (wedgeEl) {
                wedgeEl.addEventListener('click', function () {
                  if (wedgeEl.dataset.type === 'action') {
                    send({ action: 'compass-do-action', name: wedgeEl.dataset.action });
                  } else {
                    activatePanelSection(wedgeEl.dataset.section);
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

            function elementSection(el) {
              // Agrupar por elemento lógico (data-section / data-arrow), no por mesh — mismo
              // criterio que corrigió el commit dea919b para karaoke.
              if (!el) return null;
              return el.dataset && (el.dataset.section || el.dataset.arrow) || null;
            }

            function tick() {
              if (!cursorEl) return;
              var raycasterComp = cursorEl.components && cursorEl.components['raycaster'];
              if (!raycasterComp) return;
              var target = (raycasterComp.intersectedEls && raycasterComp.intersectedEls[0]) || null;

              // Cierra el panel de la sección abierta si se deja de apuntar esa porción (mirando
              // otra cosa o directamente lejos de la brújula).
              if (openSection) {
                var targetKey = elementSection(target);
                if (targetKey !== openSection) {
                  send({ action: 'compass-deselect', section: openSection });
                  openSection = null;
                }
              }

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
