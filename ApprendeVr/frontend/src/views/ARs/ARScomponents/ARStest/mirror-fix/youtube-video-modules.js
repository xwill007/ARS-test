// Entrada de youtube-video.html (overlay "Youtube Video" de AR-SYNC). Ver el comentario grande de
// ese archivo para por qué es una página Vite real y no un srcDoc.
import { initPositionControl } from '../../../../A-frame/vrPositionControl.js';

// Misma clave que escribe el puente de campos de VRNewSongAf.js en aframe-overlay-modules.js: como
// todos los iframes de mirror-fix son del mismo origen, comparten `localStorage` — este overlay
// solo necesita leerla al montar y escuchar el evento `storage` (que el navegador dispara en
// cualquier OTRO documento del mismo origen, nunca en el que escribió) para enterarse de una URL
// pegada desde el panel New Song, sin un puente de postMessage propio para este dato. También
// ESCRIBE acá (si el usuario pega/escribe la URL directo en este overlay), para que sea la misma
// fuente en ambos sentidos.
const YOUTUBE_URL_STORAGE_KEY = 'apprendevr_youtube_preview_url';

(function () {
  const sceneEl = document.querySelector('a-scene');
  if (sceneEl.hasLoaded) {
    initPositionControl({ external: true });
  } else {
    sceneEl.addEventListener('loaded', () => initPositionControl({ external: true }));
  }
})();

// Puente de sincronización de cámara por postMessage — copia exacta del patrón ya usado en
// aframe-overlay-modules.js/VRConeOverlaySync.jsx (rotación + posición + drag de mouse desde la
// brújula). Ver esos archivos para el detalle de por qué se escribe directo en yawObject/
// pitchObject y por qué se compara contra el último valor RECIBIDO en vez del último enviado.
(function () {
  function send(msg) {
    window.parent.postMessage(Object.assign({ source: 'ars-sync-test' }, msg), '*');
  }
  let cameraEl = null;
  let lookControls = null;
  let lastSentYaw = null, lastSentPitch = null;
  let lastReceivedYaw = null, lastReceivedPitch = null;
  let lastSentPos = null, lastReceivedPos = null;
  const EPS = 0.001;

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
    const yaw = lookControls.yawObject.rotation.y;
    const pitch = lookControls.pitchObject.rotation.x;
    const matchesReceivedRot = lastReceivedYaw !== null &&
      Math.abs(yaw - lastReceivedYaw) < EPS && Math.abs(pitch - lastReceivedPitch) < EPS;
    const changedRot = lastSentYaw === null ||
      Math.abs(yaw - lastSentYaw) > EPS || Math.abs(pitch - lastSentPitch) > EPS;
    if (!matchesReceivedRot && changedRot) {
      lastSentYaw = yaw; lastSentPitch = pitch;
      send({ action: 'camera-rotation', yaw, pitch });
    }
    const p = cameraEl.object3D.position;
    const matchesReceivedPos = lastReceivedPos !== null &&
      Math.abs(p.x - lastReceivedPos.x) < EPS && Math.abs(p.y - lastReceivedPos.y) < EPS && Math.abs(p.z - lastReceivedPos.z) < EPS;
    const changedPos = lastSentPos === null ||
      Math.abs(p.x - lastSentPos.x) > EPS || Math.abs(p.y - lastSentPos.y) > EPS || Math.abs(p.z - lastSentPos.z) > EPS;
    if (!matchesReceivedPos && changedPos) {
      lastSentPos = { x: p.x, y: p.y, z: p.z };
      send({ action: 'camera-position', x: p.x, y: p.y, z: p.z });
    }
  }

  window.addEventListener('message', function (ev) {
    const msg = ev.data;
    if (!msg || msg.source !== 'ars-sync-test') return;
    if (msg.action === 'camera-rotation' && lookControls) {
      lastReceivedYaw = msg.yaw;
      lastReceivedPitch = msg.pitch;
      lookControls.yawObject.rotation.y = msg.yaw;
      lookControls.pitchObject.rotation.x = msg.pitch;
    } else if (msg.action === 'mouse-look-delta' && lookControls && lookControls.yawObject && lookControls.pitchObject) {
      const PI_2 = Math.PI / 2;
      lookControls.yawObject.rotation.y -= 0.002 * msg.dx;
      lookControls.pitchObject.rotation.x -= 0.002 * msg.dy;
      lookControls.pitchObject.rotation.x = Math.max(-PI_2, Math.min(PI_2, lookControls.pitchObject.rotation.x));
    } else if (msg.action === 'camera-position' && cameraEl) {
      lastReceivedPos = { x: msg.x, y: msg.y, z: msg.z };
      cameraEl.object3D.position.set(msg.x, msg.y, msg.z);
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

// Panel de video: input de URL + botón "PEGAR URL DEL PORTAPAPELES" (mismo patrón que
// VRNewSongAf.js) + recuadro del tamaño/ubicación donde se muestra el video — SIEMPRE visible
// (antes este overlay no mostraba nada si no había una URL ya puesta desde el panel New Song;
// pedido del usuario: mostrar al menos el input+botón+recuadro para poder usarlo self-contenido).
// El recuadro sigue en pantalla al ancla 3D "#youtube-video-anchor" (proyección con
// Vector3.project(camera) en cada frame, mismo truco "billboard" que el panel de previsualización
// de VRNewSongAf.js) — así reacciona al giroscopio/mouse-drag igual que el resto de la escena, y
// es la misma ancla que mueve el widget de posición (vrPositionControl.js, clave "youtubeVideo").
(function () {
  function extractVideoId(url) {
    const m = String(url || '').match(
      /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
    );
    return m ? m[1] : null;
  }

  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.transform = 'translate(-50%, -50%)';
  panel.style.width = '360px';
  panel.style.maxWidth = '90vw';
  panel.style.zIndex = '99999';
  panel.style.background = 'rgba(20, 20, 20, 0.92)';
  panel.style.border = '2px solid #454545';
  panel.style.borderRadius = '6px';
  panel.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.6)';
  panel.style.padding = '8px';
  panel.style.fontFamily = 'sans-serif';
  panel.style.boxSizing = 'border-box';

  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.gap = '6px';
  row.style.marginBottom = '8px';

  const urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.placeholder = 'YouTube URL';
  Object.assign(urlInput.style, {
    flex: '1',
    minWidth: '0',
    padding: '6px',
    fontSize: '13px',
    border: '1px solid #555',
    borderRadius: '4px',
    background: '#1a1a1a',
    color: '#ffffff',
  });
  // Evita que escribir acá dispare el raycast manual de la escena (que interpreta cualquier
  // pointerdown sobre la pantalla como un intento de click en un elemento 3D) — mismo criterio que
  // el input numérico de vrPositionControl.js.
  ['pointerdown', 'mousedown', 'click'].forEach((evt) => urlInput.addEventListener(evt, (e) => e.stopPropagation()));

  const pasteBtn = document.createElement('button');
  pasteBtn.textContent = 'PEGAR URL';
  Object.assign(pasteBtn.style, {
    padding: '6px 10px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '4px',
    background: '#454545',
    color: '#ffffff',
    cursor: 'pointer',
  });

  row.appendChild(urlInput);
  row.appendChild(pasteBtn);
  panel.appendChild(row);

  const status = document.createElement('div');
  Object.assign(status.style, { color: '#ffcc66', fontSize: '11px', marginBottom: '6px', minHeight: '14px' });
  panel.appendChild(status);

  // Recuadro del tamaño/ubicación donde se muestra el video (pedido del usuario) — placeholder con
  // borde punteado mientras no hay video, reemplazado por el iframe embebido real cuando sí hay.
  const videoBox = document.createElement('div');
  Object.assign(videoBox.style, {
    width: '100%',
    aspectRatio: '16 / 9',
    background: '#000000',
    border: '2px dashed #666666',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#888888',
    fontSize: '12px',
    textAlign: 'center',
    boxSizing: 'border-box',
  });
  videoBox.textContent = 'El video aparecerá acá';
  panel.appendChild(videoBox);

  document.body.appendChild(panel);

  let currentVideoId = null;

  function showPlaceholder() {
    currentVideoId = null;
    videoBox.style.border = '2px dashed #666666';
    videoBox.style.padding = '0';
    videoBox.textContent = 'El video aparecerá acá';
  }

  function showVideo(videoId) {
    currentVideoId = videoId;
    videoBox.textContent = '';
    videoBox.style.border = 'none';
    const iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube.com/embed/' + encodeURIComponent(videoId) + '?autoplay=1';
    iframe.style.display = 'block';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
    iframe.setAttribute('allowfullscreen', '');
    videoBox.appendChild(iframe);
  }

  function applyUrl(url, opts) {
    const persist = !opts || opts.persist !== false;
    const videoId = extractVideoId(url);
    if (videoId === currentVideoId) return;
    if (videoId) {
      showVideo(videoId);
      status.textContent = '';
    } else {
      showPlaceholder();
      if (url) status.textContent = 'No se reconoce el formato de esa URL de YouTube.';
      else status.textContent = '';
    }
    if (persist) {
      try { localStorage.setItem(YOUTUBE_URL_STORAGE_KEY, url || ''); } catch (e) { /* ignore */ }
    }
  }

  urlInput.addEventListener('input', () => applyUrl(urlInput.value));

  pasteBtn.addEventListener('click', () => {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      status.textContent = 'Este navegador no permite leer el portapapeles aqui.';
      return;
    }
    // Hallazgo real (VRNewSongAf.js, mismo problema): el foco del documento nunca pasa a este
    // iframe en mirror-fix (la brújula 3D es la que recibe el mousedown/keydown real), y
    // `navigator.clipboard.readText()` exige que ESTE documento tenga el foco real del navegador.
    // `window.focus()` alcanza para pedirlo antes de leer.
    try { window.focus(); } catch (e) { /* ignore */ }
    navigator.clipboard.readText().then((text) => {
      const clip = (text || '').trim();
      if (!clip) {
        status.textContent = 'Portapapeles vacio (sin texto copiado).';
        return;
      }
      urlInput.value = clip;
      applyUrl(clip);
    }).catch((err) => {
      const detail = (err && err.name === 'NotAllowedError') ? ' (el navegador nego el permiso de portapapeles)' : '';
      status.textContent = 'No se pudo leer el portapapeles' + detail + '.';
    });
  });

  function refreshFromStorage() {
    let url = '';
    try { url = localStorage.getItem(YOUTUBE_URL_STORAGE_KEY) || ''; } catch (e) { /* ignore */ }
    // No pisar lo que el usuario está escribiendo ahora mismo en ESTE overlay.
    if (document.activeElement === urlInput) return;
    if (url === urlInput.value) return;
    urlInput.value = url;
    applyUrl(url, { persist: false });
  }
  refreshFromStorage();
  window.addEventListener('storage', (ev) => {
    if (ev.key === YOUTUBE_URL_STORAGE_KEY) refreshFromStorage();
  });

  // Sigue al ancla 3D en pantalla — mismo truco "billboard" que el panel de previsualización de
  // VRNewSongAf.js (Vector3.project(camera) en cada frame, updateMatrixWorld(true) explícito antes
  // para no leer una matriz de un tick viejo).
  function trackAnchor() {
    const sceneEl = document.querySelector('a-scene');
    const anchorEl = document.querySelector('#youtube-video-anchor');
    const worldPos = new AFRAME.THREE.Vector3();
    function update() {
      const camera = sceneEl && sceneEl.camera;
      const canvas = sceneEl && sceneEl.canvas;
      if (camera && canvas && anchorEl && anchorEl.object3D) {
        sceneEl.object3D.updateMatrixWorld(true);
        anchorEl.object3D.getWorldPosition(worldPos);
        const projected = worldPos.clone().project(camera);
        const rect = canvas.getBoundingClientRect();
        const behind = projected.z > 1;
        panel.style.display = behind ? 'none' : 'block';
        if (!behind) {
          panel.style.left = (rect.left + (projected.x * 0.5 + 0.5) * rect.width) + 'px';
          panel.style.top = (rect.top + (-projected.y * 0.5 + 0.5) * rect.height) + 'px';
        }
      }
      requestAnimationFrame(update);
    }
    update();
  }
  trackAnchor();
})();
