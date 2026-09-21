// Entrada de song-text.html (overlay "Song Text" de AR-SYNC). Muestra la letra de la canción
// seleccionada en el overlay "karaoke" — tres renglones (frase anterior, actual y futura)
// sincronizados con la reproducción vía `tiempo_frase` de `frases_vr` (ver
// phrases/entities/phrase.entity.ts + GET /api/frases).
import { initPositionControl } from '../../../../../../../../A-frame/vrPositionControl.js';

// Clave de localStorage donde SyncStereoTestView.jsx publica el estado de reproducción del karaoke
// (canción seleccionada, tiempo actual y si está reproduciendo). Como todos los iframes de
// mirror-fix comparten origen, este overlay solo necesita leerla al montar y escuchar el evento
// `storage` (que el navegador dispara en cualquier OTRO documento del mismo origen, nunca en el que
// escribió) — no hace falta un puente de postMessage propio para este dato.
const KARAOKE_STATE_KEY = 'apprendevr_karaoke_state';

// Componente POSITION (Requerimiento 010, skill overlay-ar-sync-aframe): arma el marcador 📍 +
// d-pad de `#song-text-anchor` (ver vrPositionControl.js → `ELEMENTS`, clave `songText`) y, sobre
// todo, el ÚNICO listener que procesa los mensajes `position-*` de la brújula para mover/guardar la
// ubicación del panel. Mismo patrón que youtube-video-modules.js / aframe-overlay-modules.js.
(function () {
  const sceneEl = document.querySelector('a-scene');
  if (sceneEl.hasLoaded) {
    initPositionControl({ external: true });
  } else {
    sceneEl.addEventListener('loaded', () => initPositionControl({ external: true }));
  }
})();

// Puente de sincronización de cámara por postMessage — copia exacta del patrón ya usado en
// youtube-video-modules.js/aframe-overlay-modules.js (rotación + posición + drag de mouse desde la
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

// Panel de letra: tres renglones (frase anterior / actual / futura) que siguen al ancla 3D
// "#song-text-anchor" (proyección con Vector3.project(camera) en cada frame, mismo truco
// "billboard" que el overlay "Youtube Video") — así reacciona al giroscopio/mouse-drag igual que
// el resto de la escena. El texto visible es la letra en inglés (`ingles_frase`), que es lo que se
// canta; la frase actual se resalta y las laterales quedan atenuadas.
(function () {
  // Pedido del usuario: la fila "Scale" del menú de Interfaz (vrPositionControl.js) agranda/achica
  // el elemento seleccionado escribiendo `object3D.scale` de `#song-text-anchor` — como esa entidad
  // no tiene geometría propia (el panel real es DOM, no un plano 3D), el ancho base del panel se
  // multiplica por esa escala en cada frame (ver trackAnchor() más abajo), mismo criterio que
  // youtube-video-modules.js.
  const BASE_PANEL_WIDTH = 520;
  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.transform = 'translate(-50%, -50%)';
  panel.style.width = BASE_PANEL_WIDTH + 'px';
  panel.style.maxWidth = '92vw';
  panel.style.zIndex = '99999';
  panel.style.background = 'rgba(0, 0, 0, 0.55)';
  panel.style.border = '1px solid rgba(255, 255, 255, 0.18)';
  panel.style.borderRadius = '8px';
  panel.style.padding = '12px 16px';
  panel.style.fontFamily = 'sans-serif';
  panel.style.boxSizing = 'border-box';
  panel.style.textAlign = 'center';
  panel.style.pointerEvents = 'none';

  function makeLine() {
    const line = document.createElement('div');
    line.style.minHeight = '1.4em';
    line.style.lineHeight = '1.4';
    line.style.fontSize = '20px';
    line.style.fontWeight = '600';
    line.style.color = '#ffffff';
    line.style.whiteSpace = 'normal';
    line.style.wordBreak = 'break-word';
    panel.appendChild(line);
    return line;
  }
  const prevLine = makeLine();
  const currentLine = makeLine();
  const nextLine = makeLine();
  // Estilos base: anterior/futura atenuadas y más chicas, la actual grande y blanca.
  Object.assign(prevLine.style, { color: '#9e9e9e', fontSize: '15px', fontWeight: '400' });
  Object.assign(currentLine.style, { color: '#ffffff', fontSize: '24px', fontWeight: '700' });
  Object.assign(nextLine.style, { color: '#9e9e9e', fontSize: '15px', fontWeight: '400' });

  document.body.appendChild(panel);

  // Marcador de ubicación (componente POSITION, ver el comentario en youtube-video-modules.js): el
  // marcador 3D real que crea `vrPositionControl.js` (`<a-circle>` hijo de `#song-text-anchor`)
  // existe y es la fuente de verdad de click/color, pero al ser un objeto WebGL nunca puede
  // dibujarse ENCIMA de este panel de DOM (el canvas de A-Frame es el fondo de toda la página). Se
  // agrega un botón de DOM equivalente que reenvía su click al marcador 3D real y refleja su
  // color/visibilidad — así el usuario puede apuntar/mover la ubicación de la letra como en los
  // demás overlays.
  const positionMarker = document.createElement('button');
  Object.assign(positionMarker.style, {
    position: 'fixed',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    border: '2px solid #ffffff',
    background: '#d21919',
    padding: '0',
    cursor: 'pointer',
    zIndex: '100000',
    display: 'none',
    boxShadow: '0 0 4px rgba(0, 0, 0, 0.6)',
  });
  ['pointerdown', 'mousedown'].forEach((evt) => positionMarker.addEventListener(evt, (e) => e.stopPropagation()));
  positionMarker.addEventListener('click', () => {
    const realMarker = document.querySelector('#song-text-anchor > a-circle.clickable');
    if (realMarker) realMarker.click();
  });
  document.body.appendChild(positionMarker);

  // Estado de reproducción publicado por el padre. Se guarda el snapshot + cuándo se recibió para
  // interpolar suavemente el tiempo entre escrituras (el padre publica ~4x/seg; la frase cambia
  // cada ~2-4s, así que interpolar alcanza para que el resaltado no salte).
  let state = { fileName: '', time: 0, playing: false, receivedAt: 0 };

  function readState() {
    let raw = '';
    try { raw = localStorage.getItem(KARAOKE_STATE_KEY) || ''; } catch (e) { /* ignore */ }
    if (!raw) {
      state = { fileName: '', time: 0, playing: false, receivedAt: Date.now() };
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      state = {
        fileName: (parsed && parsed.fileName) || '',
        time: Number(parsed && parsed.time) || 0,
        playing: !!(parsed && parsed.playing),
        receivedAt: Date.now(),
      };
    } catch (e) { /* ignore */ }
  }

  function effectiveTime() {
    if (!state.playing) return state.time;
    return state.time + (Date.now() - state.receivedAt) / 1000;
  }

  // Convierte "HH:MM:SS" (columna TIME de MySQL) a segundos. Acepta también "MM:SS" y fracción.
  function parseTime(s) {
    if (!s) return NaN;
    const parts = String(s).trim().split(':');
    if (parts.length < 2) return NaN;
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    const secPart = parts[2] != null ? parseFloat(parts[2]) : 0;
    if (isNaN(h) || isNaN(m) || isNaN(secPart)) return NaN;
    return h * 3600 + m * 60 + secPart;
  }

  let phrasesCache = { fileName: null, phrases: [] };
  // Evita refetchear la misma canción en cada frame mientras la petición está en vuelo (el fetch
  // es async y `phrasesCache.fileName` recién se actualiza cuando resuelve).
  let loadingFileName = null;

  function setLines(prev, current, next) {
    prevLine.textContent = prev || '';
    currentLine.textContent = current || '';
    nextLine.textContent = next || '';
  }

  function computeLines(time) {
    const phrases = phrasesCache.phrases;
    if (!phrases.length) {
      setLines('', '', '');
      return;
    }
    // Frase actual = la última cuyo `tiempo_frase` es <= al tiempo de reproducción.
    let idx = -1;
    for (let i = 0; i < phrases.length; i++) {
      if (phrases[i].t <= time) idx = i;
      else break;
    }
    if (idx === -1) {
      // Todavía no arrancó la primera frase: mostrar la primera como "futura".
      setLines('', '', phrases[0].en);
      return;
    }
    const prev = idx > 0 ? phrases[idx - 1].en : '';
    const current = phrases[idx].en;
    const next = idx + 1 < phrases.length ? phrases[idx + 1].en : '';
    setLines(prev, current, next);
  }

  async function loadPhrases(fileName) {
    if (phrasesCache.fileName === fileName) return phrasesCache.phrases;
    if (loadingFileName === fileName) return phrasesCache.phrases;
    if (!fileName) {
      phrasesCache = { fileName: null, phrases: [] };
      loadingFileName = null;
      return [];
    }
    loadingFileName = fileName;
    try {
      const res = await fetch('/api/frases?archivo=' + encodeURIComponent(fileName));
      const json = await res.json();
      const list = (json && json.phrases) || [];
      const parsed = list
        .map((p) => ({ en: (p && p.ingles_frase) || '', t: parseTime(p && p.tiempo_frase) }))
        .filter((p) => Number.isFinite(p.t));
      parsed.sort((a, b) => a.t - b.t);
      phrasesCache = { fileName, phrases: parsed };
      loadingFileName = null;
      return parsed;
    } catch (e) {
      phrasesCache = { fileName: null, phrases: [] };
      loadingFileName = null;
      return [];
    }
  }

  // Loop por frame: re-lee el estado (snapshot de localStorage) y actualiza (a) la posición del
  // panel siguiendo al ancla, y (b) los tres renglones según el tiempo efectivo. También detecta
  // cambios de canción (comparando contra el cache) para recargar las frases cuando el usuario
  // selecciona otra en el overlay "karaoke".
  function track() {
    const sceneEl = document.querySelector('a-scene');
    const anchorEl = document.querySelector('#song-text-anchor');
    const worldPos = new AFRAME.THREE.Vector3();

    readState();

    function update() {
      if (phrasesCache.fileName !== state.fileName && loadingFileName !== state.fileName) {
        loadPhrases(state.fileName);
      }
      computeLines(effectiveTime());

      const camera = sceneEl && sceneEl.camera;
      const canvas = sceneEl && sceneEl.canvas;
      let behind = true;
      if (camera && canvas && anchorEl && anchorEl.object3D) {
        sceneEl.object3D.updateMatrixWorld(true);
        anchorEl.object3D.getWorldPosition(worldPos);
        const projected = worldPos.clone().project(camera);
        const rect = canvas.getBoundingClientRect();
        behind = projected.z > 1;
        panel.style.display = behind ? 'none' : 'block';
        if (!behind) {
          panel.style.left = (rect.left + (projected.x * 0.5 + 0.5) * rect.width) + 'px';
          panel.style.top = (rect.top + (-projected.y * 0.5 + 0.5) * rect.height) + 'px';
          const scale = anchorEl.object3D.scale.x;
          if (Number.isFinite(scale) && scale > 0) {
            panel.style.width = (BASE_PANEL_WIDTH * scale) + 'px';
          }
        }
      }
      // El botón de marcador de DOM solo se muestra cuando el marcador 3D real está visible (modo
      // "Position" activo en la brújula) y el ancla está delante de la cámara — refleja su color
      // (rojo/azul) y queda anclado a la esquina superior-izquierda del panel, misma convención
      // "un poco por encima del borde" que vrPositionControl.js.
      const realMarker = document.querySelector('#song-text-anchor > a-circle.clickable');
      const markerShouldShow = !behind && realMarker && realMarker.getAttribute('visible') !== false;
      if (markerShouldShow) {
        const panelRect = panel.getBoundingClientRect();
        positionMarker.style.display = 'block';
        positionMarker.style.left = (panelRect.left - 11) + 'px';
        positionMarker.style.top = (panelRect.top - 11) + 'px';
        positionMarker.style.background = realMarker.getAttribute('color') || '#d21919';
      } else {
        positionMarker.style.display = 'none';
      }
      requestAnimationFrame(update);
    }
    update();
  }
  track();

  // React al evento `storage` (el padre publica el estado por localStorage): re-lee el snapshot
  // para que la interpolación se reinicie desde el último valor real.
  window.addEventListener('storage', function (ev) {
    if (ev.key === KARAOKE_STATE_KEY) readState();
  });

  // Gaze/dwell para activar el botón de marcador de DOM (componente POSITION): mismo patrón que
  // youtube-video-modules.js — la brújula 3D (capa superior) es la única que recibe el
  // mousedown/mousemove real, así que el único camino para clickear este `<button>` de DOM es el
  // gaze/dwell propio de ESTE iframe (`document.elementFromPoint` en el centro del canvas + FUSE).
  // Requerimiento 016: tiempo de activación configurable desde la fila "Cursor" del menú brújula,
  // compartido por localStorage (mismo mecanismo que aframe-overlay-modules.js).
  const storedFuseMs = Number(localStorage.getItem('apprendevr_cursor_fuse_timeout'));
  const FUSE_MS = Number.isFinite(storedFuseMs) && storedFuseMs > 0 ? storedFuseMs : 2500;
  const COOLDOWN_MS = 600;
  const REACTIVATION_GRACE_MS = 2000;
  let hoveredBtn = null;
  let fuseStart = null;
  let lockedBtn = null;
  let lastActivationAt = 0;
  let lastActivatedBtn = null;

  function findGazeButton() {
    const sceneEl = document.querySelector('a-scene');
    const canvas = sceneEl && sceneEl.canvas;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const el = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return el ? el.closest('button') : null;
  }

  function gazeTick() {
    const btn = findGazeButton();
    if (btn !== lockedBtn) lockedBtn = null;
    const inGrace = btn && btn === lastActivatedBtn && (Date.now() - lastActivationAt) < REACTIVATION_GRACE_MS;

    if (btn !== hoveredBtn) {
      hoveredBtn = btn;
      fuseStart = (btn && btn !== lockedBtn && !inGrace) ? Date.now() : null;
    }

    if (!btn || btn === lockedBtn || inGrace) {
      requestAnimationFrame(gazeTick);
      return;
    }

    const progress = Math.min(1, (Date.now() - fuseStart) / FUSE_MS);
    if (progress >= 1) {
      const now = Date.now();
      if (now - lastActivationAt >= COOLDOWN_MS) {
        btn.click();
        lastActivationAt = now;
        lastActivatedBtn = btn;
      }
      lockedBtn = btn;
      fuseStart = null;
    }
    requestAnimationFrame(gazeTick);
  }
  requestAnimationFrame(gazeTick);
})();
