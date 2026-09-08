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
// Requerimiento 011 (siguiente iteración) / 011: panel de evaluación de pronunciación. No se
// declara como entidad estática — VRKaraokeAf.js lo crea/actualiza dinámicamente al pulsar
// "EVALUATE SONG" (evaluateSong() en VRKaraokeAf.js), igual que en la vista A-Frame original.
// Sin este import, vr-evaluacion-af no está registrado y ese setAttribute no hace nada.
import '../../../../A-frame/components/VREvaluacionAf/VREvaluacionAf.js';
// Requerimiento 012: `initPositionControl()` (Requerimiento 010) — arma el marcador rojo 📍 +
// d-pad + botón GUARDAR de cada elemento posicionable (karaoke, agregar-canción, y el de
// VREvaluacionAf.js que se registra solo al crearse) y, sobre todo, el ÚNICO listener
// `window.addEventListener('pointerdown', ...)` que hace el raycast y procesa esos clicks — sin
// llamar a esta función esos marcadores existen (VREvaluacionAf.js los crea igual) pero ningún
// click les llega, porque nunca se armó el listener que los escucha. Mismo patrón que
// `index.js` de la vista A-Frame original: esperar a que la escena termine de cargar antes de
// llamarla (necesita `sceneEl.camera`/`sceneEl.canvas` ya listos).
import { initPositionControl } from '../../../../A-frame/vrPositionControl.js';
(function () {
  const sceneEl = document.querySelector('a-scene');
  if (sceneEl.hasLoaded) {
    initPositionControl();
  } else {
    sceneEl.addEventListener('loaded', () => initPositionControl());
  }
})();

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
  // Requerimiento 012 (corrección de bug real): antirebote tras cualquier activación — el
  // usuario reportó que un click (manual o por dwell) sobre el botón de play a veces se veía
  // "cancelarse solo" como si fuera un doble click. Causa encontrada: el `key` que identificaba
  // el objetivo era el `uuid` del MESH individual intersectado, pero un mismo botón lógico
  // (btnEl) puede tener varios sub-meshes (fondo + texto/ícono) — si el raycaster alternaba de
  // cuál sub-mesh intersectaba entre un tick y el siguiente (¡mismo botón!), el código lo leía
  // como "cambió de objetivo" y podía re-disparar. Se corrige agrupando por el ELEMENTO (btnEl/
  // entry.el), no por mesh individual, y además se agrega este cooldown explícito como red de
  // seguridad adicional: ninguna activación nueva se procesa hasta pasado COOLDOWN_MS desde la
  // última, sin importar el objetivo.
  const COOLDOWN_MS = 600;
  let camera = null;
  let raycaster = null;
  let hoveredEl = null;
  let fuseStart = null;
  let lockedEl = null;
  let lastActivationAt = 0;

  function collectTargets() {
    const targets = [];
    // Elementos ya cubiertos por los bloques específicos de abajo (karaoke/newSong/eval) — el
    // bloque genérico `.clickable` de más abajo los salta. Hallazgo real durante la verificación
    // de este fix: `.clickable` NO es exclusivo de los widgets de posición como se asumió al
    // escribir el bloque genérico — VRKaraokeAf.js, VRNewSongAf.js y VREvaluacionAf.js también
    // marcan sus propios botones con esa clase (confirmado por grep). Sin este Set, esos botones
    // quedarían duplicados en `targets` (una vez con su `activate` específico, otra con el
    // genérico `dispatchCenterPointerdown`) — `Array.find` igual habría elegido la entrada
    // específica por orden de inserción, así que no había bug funcional, pero sí una lista de
    // raycast innecesariamente grande recorrida cada 50ms.
    const coveredEls = new Set();
    const karaokeEntity = document.querySelector('#karaoke-vr-component');
    const karaokeComp = karaokeEntity && karaokeEntity.components && karaokeEntity.components['vr-karaoke-af'];
    (karaokeComp && karaokeComp._karaokeButtons || []).forEach((btnEl) => {
      if (!btnEl.object3D) return;
      coveredEls.add(btnEl);
      btnEl.object3D.traverse((obj) => {
        if (obj.isMesh) {
          targets.push({
            mesh: obj,
            el: btnEl,
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
      coveredEls.add(entry.el);
      entry.el.object3D.traverse((obj) => {
        if (obj.isMesh) {
          targets.push({ mesh: obj, el: entry.el, activate: () => entry.onClick() });
        }
      });
    });

    // VREvaluacionAf.js (panel de evaluación, creado dinámicamente al pulsar "EVALUATE SONG"):
    // a diferencia de vr-karaoke-af/vr-new-song-af, su lógica de qué botón hace qué vive DENTRO
    // de un listener privado (`_onPointerDown`, `window.addEventListener('pointerdown', ...)`) —
    // no expone un método por botón que se pueda invocar desde afuera. En vez de duplicar esa
    // lógica acá (frágil: seleccionar nivel, cerrar, scroll de fallidos, etc. — varios `types`
    // distintos con ramas internas), se deja que EL PROPIO componente decida: se registran sus
    // botones como objetivos del gaze (para el hover/dwell visual), y al completar el dwell se
    // dispara un `pointerdown` sintético real en `window` apuntando al centro del canvas — la
    // misma posición que ya usa internamente `getPointerNDC` para el gaze (NDC 0,0) — y el propio
    // `_onPointerDown` de VREvaluacionAf.js hace su raycasting real y decide qué botón activar,
    // exactamente igual que si fuera un click real de mouse en el centro de la pantalla.
    const evalEntity = document.querySelector('[vr-evaluacion-af]');
    const evalComp = evalEntity && evalEntity.components && evalEntity.components['vr-evaluacion-af'];
    if (evalComp) {
      const evalButtons = [];
      if (evalComp._closeBtn) evalButtons.push(evalComp._closeBtn);
      (evalComp._numButtons || []).forEach((b) => evalButtons.push(b));
      if (evalComp._pronListenBtn) evalButtons.push(evalComp._pronListenBtn);
      if (evalComp._scrollUpBtn) evalButtons.push(evalComp._scrollUpBtn);
      if (evalComp._scrollDownBtn) evalButtons.push(evalComp._scrollDownBtn);
      (evalComp._optionButtons || []).forEach((b) => evalButtons.push(b));
      if (evalComp._evalBtn) evalButtons.push(evalComp._evalBtn);
      evalButtons.forEach((btnEl) => {
        if (!btnEl || !btnEl.object3D) return;
        coveredEls.add(btnEl);
        btnEl.object3D.traverse((obj) => {
          if (obj.isMesh) {
            targets.push({ mesh: obj, el: btnEl, activate: dispatchCenterPointerdown });
          }
        });
      });
    }

    // Widgets de posición (Requerimiento 010, vía initPositionControl() más arriba): marcador
    // rojo 📍 + d-pad + GUARDAR de karaoke, agregar-canción, y el de VREvaluacionAf.js. Su click
    // real ya funciona con initPositionControl() (raycast propio compartido, mismo patrón
    // window+pointerdown que VREvaluacionAf.js), así que se activan igual: dwell + pointerdown
    // sintético al centro. `createWidget()`/vrPositionControl.js marca sus propios elementos con
    // `.clickable`, pero esa misma clase también la usan los botones de vr-karaoke-af/
    // VRNewSongAf.js/VREvaluacionAf.js (ya cubiertos arriba) — se saltan vía `coveredEls` para no
    // duplicar targets, así este bloque solo termina agregando los widgets de posición en sí.
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
    // Agrupado por ELEMENTO (no por mesh individual) — ver comentario arriba sobre por qué.
    const el = hitTarget ? hitTarget.el : null;

    if (el !== lockedEl) lockedEl = null;

    if (el !== hoveredEl) {
      hoveredEl = el;
      fuseStart = (el && el !== lockedEl) ? Date.now() : null;
    }

    if (!el || el === lockedEl) {
      setPointerVisual('white', 24);
      return;
    }

    const elapsed = Date.now() - fuseStart;
    const progress = Math.min(1, elapsed / FUSE_MS);
    setPointerVisual('#ff3333', 24 * (1 - 0.9 * progress));

    if (progress >= 1) {
      const now = Date.now();
      if (now - lastActivationAt >= COOLDOWN_MS) {
        hitTarget.activate(hitIntersection);
        lastActivationAt = now;
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
