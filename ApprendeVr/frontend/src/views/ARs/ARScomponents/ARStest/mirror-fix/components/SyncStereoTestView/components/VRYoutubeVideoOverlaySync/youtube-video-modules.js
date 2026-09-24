// Entrada de youtube-video.html (overlay "Youtube Video" de AR-SYNC). Ver el comentario grande de
// ese archivo para por qué es una página Vite real y no un srcDoc.
import { initPositionControl } from '../../../../../../../../A-frame/vrPositionControl.js';

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

  function send(msg) {
    window.parent.postMessage(Object.assign({ source: 'ars-sync-test' }, msg), '*');
  }

  // Pedido del usuario: volumen por panel para evitar eco — mismo criterio que
  // aframe-overlay-modules.js/VRLocalVideoOverlaySync.jsx (ambos paneles de AR-SYNC suenan por el
  // mismo dispositivo físico). isPrimaryPanel/isRightPanel/singlePanel llegan como query string
  // desde VRYoutubeVideoOverlaySync.jsx (esta página no puede recibir props de React).
  const params = new URLSearchParams(window.location.search);
  const isPrimaryPanel = params.get('isPrimaryPanel') !== 'false';
  const isRightPanel = params.get('isRightPanel') === 'true';
  const isSinglePanel = params.get('singlePanel') === 'true';

  // Pedido del usuario: la fila "Scale" del menú de Interfaz (vrPositionControl.js) agranda/
  // achica el elemento seleccionado escribiendo `object3D.scale` de #youtube-video-anchor — como
  // esa entidad no tiene geometría propia (el panel real es DOM, no un plano 3D), el ancho base
  // del panel se multiplica por esa escala en cada frame (ver trackAnchor() más abajo) en vez de
  // depender de un render 3D que no existe acá.
  const BASE_PANEL_WIDTH = 360;
  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.transform = 'translate(-50%, -50%)';
  panel.style.width = BASE_PANEL_WIDTH + 'px';
  panel.style.maxWidth = '90vw';
  panel.style.zIndex = '99999';
  panel.style.background = 'rgba(20, 20, 20, 0.92)';
  panel.style.border = '2px solid #454545';
  panel.style.borderRadius = '6px';
  panel.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.6)';
  panel.style.padding = '8px';
  panel.style.fontFamily = 'sans-serif';
  panel.style.boxSizing = 'border-box';

  // Botón "X" (pedido del usuario) para cerrar la vista del video — desactiva el overlay completo
  // reenviando el mismo mensaje que ya dispara el checkbox real del menú ⚙️ → "Overlays"
  // (`compass-toggle-overlay`, ver SyncStereoTestView.jsx): como este panel solo existe mientras
  // el overlay está seleccionado, el toggle siempre lo apaga acá (nunca lo prende de nuevo por
  // error). Mismo estilo/posición ("esquina superior derecha, un poco afuera del panel") que el
  // botón "X CERRAR" del panel de previsualización de VRNewSongAf.js.
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    position: 'absolute',
    top: '-12px',
    right: '-12px',
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    border: '2px solid #ffffff',
    background: '#772222',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 'bold',
    lineHeight: '1',
    padding: '0',
    cursor: 'pointer',
    boxShadow: '0 0 4px rgba(0, 0, 0, 0.6)',
  });
  ['pointerdown', 'mousedown'].forEach((evt) => closeBtn.addEventListener(evt, (e) => e.stopPropagation()));
  closeBtn.addEventListener('click', () => {
    try {
      window.parent.postMessage({ source: 'ars-sync-test', action: 'compass-toggle-overlay', key: 'youtubeVideo' }, '*');
    } catch (e) { /* ignore */ }
  });
  panel.appendChild(closeBtn);

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

  // Controles de reproducción (pedido del usuario: pause/play/adelantar/atrasar) — ocultos
  // mientras no hay video cargado (ver showPlaceholder/showVideo). Usan la YouTube IFrame Player
  // API (no un `<iframe src="...">` plano) porque `seekTo()`/`playVideo()`/`pauseVideo()` solo
  // existen ahí — necesarios además para sincronizar entre los dos paneles estéreo (ver el
  // listener de `message` más abajo), cosa que dos iframes independientes no podrían hacer solos.
  const SEEK_STEP_SECONDS = 10;
  function makeControlBtn(label) {
    const btn = document.createElement('button');
    btn.textContent = label;
    Object.assign(btn.style, {
      flex: '1',
      padding: '6px 0',
      fontSize: '12px',
      border: 'none',
      borderRadius: '4px',
      background: '#333333',
      color: '#ffffff',
      cursor: 'pointer',
    });
    ['pointerdown', 'mousedown', 'click'].forEach((evt) => btn.addEventListener(evt, (e) => e.stopPropagation()));
    return btn;
  }
  const controls = document.createElement('div');
  Object.assign(controls.style, { display: 'none', marginTop: '8px', gap: '6px' });
  const rewindBtn = makeControlBtn('<< ' + SEEK_STEP_SECONDS + 's');
  const playPauseBtn = makeControlBtn('PLAY');
  const forwardBtn = makeControlBtn(SEEK_STEP_SECONDS + 's >>');
  controls.appendChild(rewindBtn);
  controls.appendChild(playPauseBtn);
  controls.appendChild(forwardBtn);
  panel.appendChild(controls);

  document.body.appendChild(panel);

  let currentVideoId = null;
  let player = null;
  let playerContainerEl = null;
  let ytApiPromise = null;

  function loadYoutubeApi() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (ytApiPromise) return ytApiPromise;
    ytApiPromise = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof previous === 'function') previous();
        resolve(window.YT);
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    });
    return ytApiPromise;
  }

  function applyVolume() {
    if (!player) return;
    if (isSinglePanel) { player.setVolume(100); return; }
    if (isPrimaryPanel && !isRightPanel) player.setVolume(1);
    else if (isRightPanel) player.setVolume(100);
    else player.setVolume(5);
  }

  function updatePlayPauseLabel(isPlaying) {
    playPauseBtn.textContent = isPlaying ? 'PAUSE' : 'PLAY';
  }

  // Mantiene el label del botón en sincronía con el estado REAL del player (sin esto, al terminar
  // el video el botón seguía diciendo "PAUSE" aunque ya no sonaba) y reinicia la reproducción al
  // terminar (el problema "se reproduce una vez y ya no se puede volver a reproducir": un
  // `playVideo()` sobre un player en estado ENDED no arranca de forma fiable sin un `seekTo(0)`
  // previo — acá se resetea y se sincroniza el panel hermano).
  function handlePlayerStateChange(event) {
    if (!event || typeof event.data !== 'number' || !window.YT || !window.YT.PlayerState) return;
    const P = window.YT.PlayerState;
    if (event.data === P.ENDED) {
      updatePlayPauseLabel(false);
      send({ action: 'youtube-video-pause' });
    } else if (event.data === P.PLAYING) {
      updatePlayPauseLabel(true);
    } else if (event.data === P.PAUSED) {
      updatePlayPauseLabel(false);
    }
  }

  // Mensaje claro cuando YouTube rechaza el video: los códigos 101/150 son "el dueño deshabilitó la
  // reproducción embebida" (el caso típico de los videos musicales VEVO/disqueras, que es justo el
  // contenido de "ingesta de canciones") — es lo que muestra el iframe como "Este video no está
  // disponible" a secas. 100 es video eliminado/privado.
  function handlePlayerError(event) {
    if (!event || typeof event.data !== 'number') return;
    if (event.data === 101 || event.data === 150) {
      status.textContent = 'Este video no permite reproducción embebida (bloqueado por su dueño).';
    } else if (event.data === 100) {
      status.textContent = 'Este video no esta disponible (eliminado o privado).';
    } else {
      status.textContent = 'No se pudo reproducir el video (error ' + event.data + ').';
    }
  }

  function showPlaceholder() {
    currentVideoId = null;
    controls.style.display = 'none';
    if (player) {
      try { player.destroy(); } catch (e) { /* ignore */ }
      player = null;
    }
    playerContainerEl = null;
    videoBox.textContent = '';
    videoBox.style.border = '2px dashed #666666';
    videoBox.style.padding = '0';
    videoBox.textContent = 'El video aparecerá acá';
  }

  function showVideo(videoId) {
    currentVideoId = videoId;
    controls.style.display = 'flex';
    updatePlayPauseLabel(false);
    if (player) {
      player.loadVideoById(videoId);
      applyVolume();
      return;
    }
    videoBox.textContent = '';
    videoBox.style.border = 'none';
    videoBox.style.padding = '0';
    playerContainerEl = document.createElement('div');
    playerContainerEl.style.width = '100%';
    playerContainerEl.style.height = '100%';
    videoBox.appendChild(playerContainerEl);
    loadYoutubeApi().then((YT) => {
      // La URL puede haber cambiado mientras cargaba la API (async) — usar la última conocida en
      // vez de la que disparó esta llamada en particular.
      if (!currentVideoId || !playerContainerEl) return;
      player = new YT.Player(playerContainerEl, {
        width: '100%',
        height: '100%',
        videoId: currentVideoId,
        playerVars: { autoplay: 0, controls: 0, rel: 0, origin: window.location.origin, playsinline: 1 },
        events: { onReady: applyVolume, onStateChange: handlePlayerStateChange, onError: handlePlayerError },
      });
    });
  }

  playPauseBtn.addEventListener('click', () => {
    if (!player) return;
    const state = player.getPlayerState();
    const isPlaying = state === window.YT.PlayerState.PLAYING;
    if (isPlaying) {
      player.pauseVideo();
      updatePlayPauseLabel(false);
      send({ action: 'youtube-video-pause' });
    } else {
      if (state === window.YT.PlayerState.ENDED) {
        player.seekTo(0, true);
      }
      player.playVideo();
      updatePlayPauseLabel(true);
      send({ action: 'youtube-video-play' });
    }
  });

  rewindBtn.addEventListener('click', () => {
    if (!player) return;
    const time = Math.max(0, player.getCurrentTime() - SEEK_STEP_SECONDS);
    player.seekTo(time, true);
    send({ action: 'youtube-video-seek', time });
  });

  forwardBtn.addEventListener('click', () => {
    if (!player) return;
    const time = player.getCurrentTime() + SEEK_STEP_SECONDS;
    player.seekTo(time, true);
    send({ action: 'youtube-video-seek', time });
  });

  // Sincronización con el panel hermano: a diferencia del puente de video de
  // aframe-overlay-modules.js (que escucha eventos NATIVOS del `<video>`, disparados por
  // cualquier fuente, y necesita banderas de supresión para no reenviar en loop lo que acaba de
  // aplicar de forma remota), acá el único disparador posible es un click de ESTE panel en sus
  // propios botones (arriba) — se manda el mensaje directo desde ahí, así que no hace falta
  // instrumentar `onStateChange` ni sufrir el problema de eco.
  window.addEventListener('message', (ev) => {
    const msg = ev.data;
    if (!msg || msg.source !== 'ars-sync-test' || !player) return;
    if (msg.action === 'youtube-video-play') {
      // Un play() remoto sin gesto real en ESTE panel puede ser bloqueado por el navegador salvo
      // que esté muted — mismo workaround que el puente de video de aframe-overlay-modules.js.
      const wasMuted = player.isMuted();
      player.mute();
      if (player.getPlayerState() === window.YT.PlayerState.ENDED) {
        player.seekTo(0, true);
      }
      player.playVideo();
      setTimeout(() => { if (!wasMuted) player.unMute(); }, 800);
      updatePlayPauseLabel(true);
    } else if (msg.action === 'youtube-video-pause') {
      player.pauseVideo();
      updatePlayPauseLabel(false);
    } else if (msg.action === 'youtube-video-seek') {
      player.seekTo(msg.time, true);
    }
  });

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

  // Marcador de ubicación (pedido del usuario: "el circulo rojo se ubica detras del plano del
  // video youtube, debe ser en la esquina superior izquierda como en los demas componentes"). El
  // marcador 3D real que ya crea `vrPositionControl.js` (`<a-circle>` hijo de
  // `#youtube-video-anchor`) sigue existiendo y sigue siendo la fuente de verdad de click/
  // selección/color — pero al ser un objeto WebGL, nunca puede dibujarse ENCIMA de este panel de
  // DOM: el canvas de A-Frame es el fondo de TODA la página, y cualquier `<div>` normal (aunque
  // tenga menor z-index "lógico") siempre lo tapa visualmente. Se agrega acá un botón de DOM
  // equivalente, anclado a la esquina superior izquierda REAL del panel (en píxeles, igual
  // convención "un poco por encima del borde" que usa `vrPositionControl.js` para karaoke/
  // newSong), que solo reenvía su click al marcador 3D real (`.click()` dispara el mismo
  // `onClick`/`onSelect` ya registrado ahí) y refleja su color/visibilidad — así se ve donde el
  // usuario espera verlo sin duplicar el mecanismo de selección/guardado.
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
    const realMarker = document.querySelector('#youtube-video-anchor > a-circle.clickable');
    if (realMarker) realMarker.click();
  });
  document.body.appendChild(positionMarker);

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
      const realMarker = document.querySelector('#youtube-video-anchor > a-circle.clickable');
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
  trackAnchor();

  // Pedido del usuario: el reticle circular de la brújula (giroscopio en mobile, mirar con la
  // cabeza) no detectaba ni activaba estos botones. Mismo patrón que el sistema de gaze/dwell de
  // aframe-overlay-modules.js (FUSE_MS/COOLDOWN_MS/REACTIVATION_GRACE_MS idénticos, mismo mensaje
  // `gaze-hover` que la brújula ya sabe pintar en rojo — ver SyncConfigCompassMenu.jsx), pero acá
  // el "objetivo" no es un mesh 3D intersectado por un THREE.Raycaster: los botones de este panel
  // son `<button>` de DOM normal (input de URL + recuadro de video, no A-Frame), así que se usa
  // `document.elementFromPoint()` en el CENTRO del canvas (la misma posición que apunta el
  // reticle) para saber sobre qué botón está la mirada.
  // Requerimiento 016: tiempo de activación configurable desde la fila "Cursor" del menú brújula
  // (SyncConfigCompassMenu.jsx) — mismo mecanismo de localStorage que aframe-overlay-modules.js
  // (ver ese archivo), leído una sola vez al iniciar.
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
      send({ action: 'gaze-hover', hovering: false, progress: 0 });
      requestAnimationFrame(gazeTick);
      return;
    }

    const progress = Math.min(1, (Date.now() - fuseStart) / FUSE_MS);
    send({ action: 'gaze-hover', hovering: true, progress });

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
