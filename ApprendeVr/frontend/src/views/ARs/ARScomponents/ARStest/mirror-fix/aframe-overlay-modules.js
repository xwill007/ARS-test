// Requerimiento 011: entrada de esta página. Importa el componente A-Frame REAL de
// src/views/A-frame (arrastra VRNewSongAf.js, que VRKaraokeAf.js ya importa) — no se copia ni
// reescribe código, es el mismo módulo que usa la vista A-Frame de producción.
//
// Patrón a seguir para exponer un nuevo componente A-Frame como overlay de "AR-SYNC"
// (SyncStereoTestView.jsx) en mirror-fix:
// 1. Crear un `<nombre>.html` en esta carpeta que cargue /libs/aframe.min.js + este tipo de
//    script de entrada, y declare las entidades a-entity necesarias (ver aframe-overlay-modules.html).
// 2. Este .js importa el/los componente(s) reales por su ruta relativa dentro de
//    src/views/A-frame/components/... (sin copiar su código), y agrega el puente de sincronización
//    de cámara (abajo) si el overlay debe reaccionar al giroscopio/acelerómetro igual que los
//    demás overlays de AR-SYNC.
// 3. Registrar el nuevo .html en vite.config.js -> build.rollupOptions.input.
// 4. Crear un componente React `<Nombre>OverlaySync.jsx` (ver VRKaraokeOverlaySync.jsx) que monte
//    ese .html en un <iframe src="..."> real (no srcDoc) con forwardRef, y agregarlo a
//    SYNCABLE_OVERLAYS en SyncStereoTestView.jsx + OVERLAY_OPTIONS en SyncConfigMenu.jsx.
import '../../../../A-frame/components/VRKaraokeAf/VRKaraokeAf.js';

// Puente de sincronización de rotación de cámara entre los paneles izquierdo/derecho de AR-SYNC —
// mismo patrón que el bloque final de VRLocalVideoOverlaySync.jsx / VRConeOverlaySync.jsx (ver
// esos archivos para el detalle de por qué se escribe directo en yawObject/pitchObject de
// look-controls en vez de con setAttribute, y por qué se compara contra el último valor RECIBIDO
// en vez del último enviado, para no reenviar en loop lo que se acaba de aplicar de forma remota).
// Solo se sincroniza rotación (no posición): la cámara de esta escena es estática, sin
// wasd-controls deshabilitado explícitamente pero sin motivo para moverse.
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
    if (!msg || msg.source !== 'ars-sync-test' || msg.action !== 'camera-rotation' || !lookControls) return;
    lastReceivedYaw = msg.yaw;
    lastReceivedPitch = msg.pitch;
    lookControls.yawObject.rotation.y = msg.yaw;
    lookControls.pitchObject.rotation.x = msg.pitch;
  });
})();

// Puente de sincronización de play/pause/seek del video interno de vr-karaoke-af — mismo patrón
// que el bloque de video de VRLocalVideoOverlaySync.jsx (mismo canal 'ars-sync-test', ver ese
// archivo para el detalle del workaround de silenciar antes de play() remoto: el panel que RECIBE
// el mensaje nunca tuvo un gesto real en su propio iframe, y los navegadores bloquean
// video.play() programático sin gesto salvo que esté muted).
//
// Diferencia clave con VRLocalVideoOverlaySync: acá no hay un <video> fijo — VRKaraokeAf.js
// recrea su `<video>` real (this._htmlVideo, ver loadVideo() en VRKaraokeAf.js) cada vez que
// cambia la canción seleccionada, así que hay que re-engancharse cada vez que cambia esa
// referencia, no una sola vez. Se lee `_htmlVideo` (campo por convención "privado", no expuesto
// como API pública) en vez de tocar VRKaraokeAf.js — mismo principio de no modificar el
// componente real que ya sigue el resto de este archivo; si VRKaraokeAf.js renombra ese campo en
// el futuro, este puente deja de encontrar el video (se degrada a "sin sync", no rompe nada).
(function () {
  function send(msg) {
    window.parent.postMessage(Object.assign({ source: 'ars-sync-test' }, msg), '*');
  }

  // Requerimiento 012: volumen por panel para evitar eco (mismo criterio que
  // VRLocalVideoOverlaySync.jsx — ambos paneles de AR-SYNC suenan por el mismo dispositivo
  // físico). isPrimaryPanel/isRightPanel llegan como query string desde VRKaraokeOverlaySync.jsx
  // (esta página no puede recibir props de React directamente).
  const params = new URLSearchParams(window.location.search);
  const isPrimaryPanel = params.get('isPrimaryPanel') !== 'false';
  const isRightPanel = params.get('isRightPanel') === 'true';

  let karaokeComp = null;
  let video = null;
  let suppressNextPlay = false;
  let suppressNextPause = false;
  let suppressNextSeeked = false;

  function findKaraokeComponent() {
    const entity = document.querySelector('#karaoke-vr-component');
    karaokeComp = entity && entity.components && entity.components['vr-karaoke-af'];
    if (karaokeComp) {
      setInterval(watchVideoElement, 300);
    } else {
      setTimeout(findKaraokeComponent, 200);
    }
  }
  findKaraokeComponent();

  // vr-karaoke-af reemplaza this._htmlVideo en cada cambio de canción — comparar por referencia
  // para reenganchar los listeners cuando cambia, en vez de asumir que sigue siendo el mismo video.
  function watchVideoElement() {
    const current = karaokeComp && karaokeComp._htmlVideo;
    if (current && current !== video) {
      video = current;
      wireVideo(video);
    }
  }

  function wireVideo(v) {
    // Bajar el volumen del panel izquierdo (primario) para no escuchar las dos pistas
    // superpuestas — mismo valor que usa VRLocalVideoOverlaySync.jsx para su video.
    if (isPrimaryPanel && !isRightPanel) {
      v.muted = false;
      v.volume = 0.01;
    } else if (isRightPanel) {
      v.muted = false;
      v.volume = 1.0;
    } else {
      v.muted = false;
      v.volume = 0.05;
    }
    v.addEventListener('play', function () {
      if (suppressNextPlay) { suppressNextPlay = false; return; }
      send({ action: 'karaoke-play' });
    });
    v.addEventListener('pause', function () {
      if (suppressNextPause) { suppressNextPause = false; return; }
      send({ action: 'karaoke-pause' });
    });
    v.addEventListener('seeked', function () {
      if (suppressNextSeeked) { suppressNextSeeked = false; return; }
      send({ action: 'karaoke-seek', time: v.currentTime });
    });
  }

  window.addEventListener('message', function (ev) {
    const msg = ev.data;
    if (!msg || msg.source !== 'ars-sync-test' || !video) return;
    if (msg.action === 'karaoke-play') {
      suppressNextPlay = true;
      const wasMuted = video.muted;
      video.muted = true;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(function () { video.muted = wasMuted; })
          .catch(function (err) {
            video.muted = wasMuted;
            console.warn('vr-karaoke-af: play remoto bloqueado por el navegador incluso muted:', err);
          });
      } else {
        video.muted = wasMuted;
      }
    } else if (msg.action === 'karaoke-pause') {
      suppressNextPause = true;
      video.pause();
    } else if (msg.action === 'karaoke-seek') {
      suppressNextSeeked = true;
      video.currentTime = msg.time;
    }
  });
})();

// Requerimiento 012: hover/dwell/click propio para el puntero estático (#mirror-fix-pointer) de
// este overlay — mismo patrón de gaze+fuse que VRLocalVideoOverlaySync.jsx/VRConeOverlaySync.jsx
// (ver esos archivos), pero con SU PROPIO raycasting THREE.js directo en vez de un <a-cursor
// raycaster="...">: los botones de VRKaraokeAf.js (this._karaokeButtons) y VRNewSongAf.js
// (this._clickableEls) no están marcados .clickable/.raycastable — hacen su propio raycasting
// manual por mouse (ver Requerimiento 011) — así que no hay nada que un <a-cursor> nativo pudiera
// intersectar. Se leen esos dos campos "privados" por convención para reusar exactamente los
// mismos botones/callbacks que ya usa el click manual, sin tocar ninguno de los dos componentes
// reales — si algún día renombran esos campos, esto se degrada a "sin auto-click", no rompe nada.
(function () {
  const pointerEl = document.getElementById('mirror-fix-pointer');
  if (!pointerEl) return;
  const FUSE_MS = 2500;
  let camera = null;
  let raycaster = null;
  let hoveredKey = null;
  let fuseStart = null;
  let lockedKey = null;

  function collectTargets() {
    const targets = [];
    const karaokeEntity = document.querySelector('#karaoke-vr-component');
    const karaokeComp = karaokeEntity && karaokeEntity.components && karaokeEntity.components['vr-karaoke-af'];
    (karaokeComp && karaokeComp._karaokeButtons || []).forEach((btnEl) => {
      if (!btnEl.object3D) return;
      btnEl.object3D.traverse((obj) => {
        if (obj.isMesh) {
          targets.push({
            mesh: obj,
            activate: (intersection) => {
              if (typeof btnEl._activateSelection === 'function') {
                btnEl._activateSelection({ type: 'pointerdown', defaultPrevented: false, detail: { intersection } });
              } else {
                btnEl.dispatchEvent(new CustomEvent('click', { bubbles: true, cancelable: true, detail: { intersection } }));
              }
            },
          });
        }
      });
    });
    const newSongEntity = document.querySelector('#new-song-component');
    const newSongComp = newSongEntity && newSongEntity.components && newSongEntity.components['vr-new-song-af'];
    (newSongComp && newSongComp._clickableEls || []).forEach((entry) => {
      if (!entry.el || !entry.el.object3D) return;
      entry.el.object3D.traverse((obj) => {
        if (obj.isMesh) {
          targets.push({ mesh: obj, activate: () => entry.onClick() });
        }
      });
    });
    return targets;
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
    const key = hitTarget ? hitTarget.mesh.uuid : null;

    if (key !== lockedKey) lockedKey = null;

    if (key !== hoveredKey) {
      hoveredKey = key;
      fuseStart = (key && key !== lockedKey) ? Date.now() : null;
    }

    if (!key || key === lockedKey) {
      setPointerVisual('white', 24);
      return;
    }

    const elapsed = Date.now() - fuseStart;
    const progress = Math.min(1, elapsed / FUSE_MS);
    setPointerVisual('#ff3333', 24 * (1 - 0.9 * progress));

    if (progress >= 1) {
      hitTarget.activate(hitIntersection);
      lockedKey = key;
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
