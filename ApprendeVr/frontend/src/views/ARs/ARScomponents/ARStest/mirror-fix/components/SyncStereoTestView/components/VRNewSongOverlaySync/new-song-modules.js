// Entrada de new-song.html (overlay "New Song" de AR-SYNC, Requerimiento 014 ampliación). Importa
// el componente A-Frame REAL de src/views/A-frame (mismo criterio que aframe-overlay-modules.js:
// no se copia ni reescribe código) — antes vivía como una entidad más DENTRO de la escena del
// overlay "karaoke" (ver aframe-overlay-modules.html); pedido del usuario: separarlo en su propio
// overlay independiente, activable/desactivable por separado desde el menú ⚙️ → "Overlays".
import '../../../../../../../../A-frame/components/VRKaraokeAf/components/VRNewSongAf/VRNewSongAf.js';
import { initPositionControl } from '../../../../../../../../A-frame/vrPositionControl.js';

(function () {
  const sceneEl = document.querySelector('a-scene');
  if (sceneEl.hasLoaded) {
    initPositionControl({ external: true });
  } else {
    sceneEl.addEventListener('loaded', () => initPositionControl({ external: true }));
  }
})();

// Puente de sincronización de rotación/zoom de cámara — copia exacta del bloque equivalente en
// aframe-overlay-modules.js (mismo patrón que el resto de los overlays de AR-SYNC). Ver ese
// archivo para el detalle de por qué se escribe directo en yawObject/pitchObject y por qué se
// compara contra el último valor RECIBIDO en vez del último enviado.
(function () {
  function send(msg) {
    window.parent.postMessage(Object.assign({ source: 'ars-sync-test' }, msg), '*');
  }

  let cameraEl = null;
  let lookControls = null;
  let lastSentYaw = null, lastSentPitch = null;
  let lastReceivedYaw = null, lastReceivedPitch = null;
  const EPS = 0.001;

  function findCamera() {
    cameraEl = document.querySelector('a-camera');
    if (cameraEl && cameraEl.components && cameraEl.components['look-controls']) {
      lookControls = cameraEl.components['look-controls'];
      setInterval(pollCameraRotation, 16);
    } else {
      setTimeout(findCamera, 100);
    }
  }
  findCamera();

  function pollCameraRotation() {
    if (!lookControls || !lookControls.yawObject || !lookControls.pitchObject) return;
    const yaw = lookControls.yawObject.rotation.y;
    const pitch = lookControls.pitchObject.rotation.x;
    const matchesReceived = lastReceivedYaw !== null &&
      Math.abs(yaw - lastReceivedYaw) < EPS && Math.abs(pitch - lastReceivedPitch) < EPS;
    const changed = lastSentYaw === null ||
      Math.abs(yaw - lastSentYaw) > EPS || Math.abs(pitch - lastSentPitch) > EPS;
    if (!matchesReceived && changed) {
      lastSentYaw = yaw; lastSentPitch = pitch;
      send({ action: 'camera-rotation', yaw, pitch });
    }
  }

  window.addEventListener('message', function (ev) {
    const msg = ev.data;
    if (!msg || msg.source !== 'ars-sync-test' || !lookControls) return;
    if (msg.action === 'camera-rotation') {
      lastReceivedYaw = msg.yaw;
      lastReceivedPitch = msg.pitch;
      lookControls.yawObject.rotation.y = msg.yaw;
      lookControls.pitchObject.rotation.x = msg.pitch;
    } else if (msg.action === 'mouse-look-delta' && lookControls.yawObject && lookControls.pitchObject) {
      const PI_2 = Math.PI / 2;
      lookControls.yawObject.rotation.y -= 0.002 * msg.dx;
      lookControls.pitchObject.rotation.x -= 0.002 * msg.dy;
      lookControls.pitchObject.rotation.x = Math.max(-PI_2, Math.min(PI_2, lookControls.pitchObject.rotation.x));
    } else if (msg.action === 'camera-zoom-delta' && cameraEl) {
      const STEP = 0.6;
      const THREE = AFRAME.THREE;
      const move = new THREE.Vector3();
      if (msg.axis === 'strafe') {
        const quat = new THREE.Quaternion();
        cameraEl.object3D.getWorldQuaternion(quat);
        move.set(1, 0, 0).applyQuaternion(quat);
        move.y = 0;
        if (move.lengthSq() > 0) move.normalize();
      } else {
        cameraEl.object3D.getWorldDirection(move);
        move.negate();
      }
      cameraEl.object3D.position.addScaledVector(move, msg.delta * STEP);
    }
  });
})();

// Puente de sincronización de los campos del panel "New Song" entre los paneles izquierdo/derecho
// de AR-SYNC — movido acá tal cual desde aframe-overlay-modules.js (antes vivía ahí porque
// "New Song" era parte de ESE mismo iframe; ahora que es su propio overlay/iframe, el puente se
// mueve con él). Se poll-ea `this._values` (campo "privado" por convención) en vez de enganchar un
// evento, porque VRNewSongAf.js no expone ningún hook de "cambió un campo" — si algún día se
// renombra ese campo, este puente se degrada a "sin sync", no rompe nada.
(function () {
  function send(msg) {
    window.parent.postMessage(Object.assign({ source: 'ars-sync-test' }, msg), '*');
  }

  const FIELD_NAMES = ['titulo', 'autor', 'archivo', 'youtubeUrl'];
  // Clave compartida con VRYoutubeVideoOverlaySync.jsx: como todos los iframes de mirror-fix son
  // del mismo origen, escribir acá alcanza para que el overlay "youtubeVideo" se entere de qué
  // video mostrar sin un puente de postMessage propio para este dato.
  const YOUTUBE_URL_STORAGE_KEY = 'apprendevr_youtube_preview_url';
  let newSongComp = null;
  const lastKnown = { titulo: '', autor: '', archivo: '', youtubeUrl: '' };

  function findComponent() {
    const entity = document.querySelector('#new-song-component');
    newSongComp = entity && entity.components && entity.components['vr-new-song-af'];
    if (newSongComp) {
      setInterval(pollFields, 300);
    } else {
      setTimeout(findComponent, 200);
    }
  }
  findComponent();

  function pollFields() {
    if (!newSongComp || !newSongComp._values) return;
    FIELD_NAMES.forEach((field) => {
      const value = newSongComp._values[field] || '';
      if (value !== lastKnown[field]) {
        lastKnown[field] = value;
        send({ action: 'new-song-field-update', field: field, value: value });
        if (field === 'youtubeUrl') {
          try { localStorage.setItem(YOUTUBE_URL_STORAGE_KEY, value); } catch (e) { /* ignore */ }
        }
      }
    });
  }

  window.addEventListener('message', function (ev) {
    const msg = ev.data;
    if (!msg || msg.source !== 'ars-sync-test' || msg.action !== 'new-song-field-update') return;
    if (!newSongComp || !newSongComp._values || FIELD_NAMES.indexOf(msg.field) === -1) return;
    if (newSongComp._values[msg.field] === msg.value) return;
    newSongComp._values[msg.field] = msg.value;
    lastKnown[msg.field] = msg.value;
    try { newSongComp._refreshFieldText(msg.field); } catch (e) { /* ignore */ }
  });
})();

// Puente de "canción agregada" — a diferencia de cuando "New Song" vivía dentro del mismo iframe
// que "karaoke" (ahí alcanzaba con relayar al panel opuesto, porque el propio panel ya tenía la
// lista en el mismo documento), ahora son overlays/iframes DISTINTOS incluso dentro del MISMO
// panel: este mensaje tiene que llegarle al overlay "karaoke" de AMBOS paneles (el propio y el
// hermano), no solo al opuesto — por eso NO se puede depender del relevo genérico de
// SyncStereoTestView.jsx (que solo reenvía "mismo overlay, panel opuesto"). Ver el handler
// explícito de 'cancion-agregada' en SyncStereoTestView.jsx, que hace ese fan-out a las 4
// combinaciones posibles de panel × instancia de "karaoke".
(function () {
  function send(msg) {
    window.parent.postMessage(Object.assign({ source: 'ars-sync-test' }, msg), '*');
  }
  window.addEventListener('cancion-agregada', function () {
    send({ action: 'cancion-agregada' });
  });
})();

// Hover/dwell/click propio para el puntero estático (#mirror-fix-pointer) de este overlay — mismo
// patrón que aframe-overlay-modules.js (ver ese archivo para el detalle completo de cada
// constante/hallazgo), simplificado acá porque este overlay solo tiene los botones de
// VRNewSongAf.js (`_clickableEls`) y, opcionalmente, el widget de posición (marcador + d-pad,
// marcados con `.clickable` por vrPositionControl.js).
(function () {
  const pointerEl = document.getElementById('mirror-fix-pointer');
  if (!pointerEl) return;
  const storedFuseMs = Number(localStorage.getItem('apprendevr_cursor_fuse_timeout'));
  const FUSE_MS = Number.isFinite(storedFuseMs) && storedFuseMs > 0 ? storedFuseMs : 2500;
  const COOLDOWN_MS = 600;
  const REACTIVATION_GRACE_MS = 2000;
  let camera = null;
  let raycaster = null;
  let hoveredEl = null;
  let fuseStart = null;
  let lockedEl = null;
  let lastActivationAt = 0;
  let lastActivatedEl = null;

  function send(msg) {
    window.parent.postMessage(Object.assign({ source: 'ars-sync-test' }, msg), '*');
  }

  function collectTargets() {
    const targets = [];
    const coveredEls = new Set();
    const newSongEntity = document.querySelector('#new-song-component');
    const newSongComp = newSongEntity && newSongEntity.components && newSongEntity.components['vr-new-song-af'];
    (newSongComp && newSongComp._clickableEls || []).forEach((entry) => {
      if (!entry.el || !entry.el.object3D) return;
      coveredEls.add(entry.el);
      entry.el.object3D.traverse((obj) => {
        if (obj.isMesh) {
          targets.push({ mesh: obj, el: entry.el, activate: () => entry.onClick() });
        }
      });
    });
    // Widget de posición (marcador 📍 + d-pad, vrPositionControl.js) — su click real ya funciona
    // con initPositionControl() (raycast propio compartido); se activa igual, dwell + pointerdown
    // sintético al centro.
    document.querySelectorAll('.clickable').forEach((btnEl) => {
      if (!btnEl.object3D || coveredEls.has(btnEl)) return;
      btnEl.object3D.traverse((obj) => {
        if (obj.isMesh) {
          targets.push({ mesh: obj, el: btnEl, activate: dispatchCenterPointerdown });
        }
      });
    });
    return targets;
  }

  function dispatchCenterPointerdown() {
    const sceneEl = document.querySelector('a-scene');
    const canvas = sceneEl && sceneEl.canvas;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = rect.left + rect.width / 2;
    const clientY = rect.top + rect.height / 2;
    window.dispatchEvent(new PointerEvent('pointerdown', {
      clientX,
      clientY,
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: 'mouse',
    }));
  }

  function setPointerVisual(color, sizePx) {
    pointerEl.style.borderColor = color;
    pointerEl.style.width = sizePx + 'px';
    pointerEl.style.height = sizePx + 'px';
    pointerEl.style.marginLeft = (-sizePx / 2) + 'px';
    pointerEl.style.marginTop = (-sizePx / 2) + 'px';
  }

  function tick() {
    if (!camera) return;
    const targets = collectTargets();
    const meshes = targets.map((t) => t.mesh);
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const hits = raycaster.intersectObjects(meshes, false);
    let hitTarget = null;
    let hitIntersection = null;
    if (hits.length) {
      hitIntersection = hits[0];
      hitTarget = targets.find((t) => t.mesh === hits[0].object) || null;
    }
    const el = hitTarget ? hitTarget.el : null;

    if (el !== lockedEl) lockedEl = null;

    const inReactivationGrace = el && el === lastActivatedEl && (Date.now() - lastActivationAt) < REACTIVATION_GRACE_MS;

    if (el !== hoveredEl) {
      hoveredEl = el;
      fuseStart = (el && el !== lockedEl && !inReactivationGrace) ? Date.now() : null;
    }

    if (!el || el === lockedEl || inReactivationGrace) {
      setPointerVisual('white', 24);
      send({ action: 'gaze-hover', hovering: false, progress: 0 });
      return;
    }

    const elapsed = Date.now() - fuseStart;
    const progress = Math.min(1, elapsed / FUSE_MS);
    setPointerVisual('#ff3333', 24 * (1 - 0.9 * progress));
    send({ action: 'gaze-hover', hovering: true, progress: progress });

    if (progress >= 1) {
      const now = Date.now();
      if (now - lastActivationAt >= COOLDOWN_MS) {
        hitTarget.activate(hitIntersection);
        lastActivationAt = now;
        lastActivatedEl = el;
      }
      lockedEl = el;
      fuseStart = null;
      setPointerVisual('white', 24);
    }
  }

  function findCamera() {
    const sceneEl = document.querySelector('a-scene');
    if (sceneEl && sceneEl.camera) {
      camera = sceneEl.camera;
      raycaster = new AFRAME.THREE.Raycaster();
      raycaster.far = 30;
      setInterval(tick, 50);
    } else {
      setTimeout(findCamera, 100);
    }
  }
  findCamera();
})();
