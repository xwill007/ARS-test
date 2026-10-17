// Entrada de explore-youtube.html (overlay "Explore Youtube AR" de AR-SYNC, Requerimiento 017).
// Ver el comentario grande de ese archivo para por qué es una página Vite real y no un srcDoc.
import { initPositionControl } from '../../../../../../../../A-frame/vrPositionControl.js';
import { searchYoutube, searchYoutubeInvidious } from '../../../../../../../../A-frame/vrYoutubeSearchApi.util.js';

// Clave compartida con el panel "New Song" (VRNewSongAf.js): como todos los iframes de mirror-fix
// son del mismo origen, comparten `localStorage`. El botón "BUSCAR EN YOUTUBE" deja acá la
// consulta (artista + canción) ANTES de activar este overlay, para que este lo lea al montar y
// busque automáticamente — un `postMessage` enviado antes del mount se perdería (mismo motivo por
// el que la URL de `youtubeVideo` viaja por `localStorage['apprendevr_youtube_preview_url']`).
const SEARCH_QUERY_STORAGE_KEY = 'apprendevr_youtube_search_query';

(function () {
  const sceneEl = document.querySelector('a-scene');
  if (sceneEl.hasLoaded) {
    initPositionControl({ external: true });
  } else {
    sceneEl.addEventListener('loaded', () => initPositionControl({ external: true }));
  }
})();

// Puente de sincronización de cámara por postMessage — copia exacta del patrón ya usado en
// youtube-video-modules.js (rotación + posición + drag de mouse desde la brújula).
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

// Panel de búsqueda: input + botón "BUSCAR" + lista de resultados (miniatura + título) +
// reproductor embebido al seleccionar. El panel real es un <div> de DOM que sigue en pantalla al
// ancla 3D "#explore-youtube-anchor" (mismo truco "billboard" que youtube-video-modules.js).
(function () {
  function send(msg) {
    window.parent.postMessage(Object.assign({ source: 'ars-sync-test' }, msg), '*');
  }

  // URL completa de reproducción a partir del videoId — el panel "New Song" espera una URL de
  // YouTube completa (que `extractYoutubeVideoId`/`extractVideoId` sepan parsear), no el id solo.
  function videoUrl(videoId) {
    return 'https://www.youtube.com/watch?v=' + videoId;
  }

  // Parámetros de panel (volumen por panel para evitar eco) — llegan como query string desde
  // VRYoutubeExploreOverlaySync.jsx, mismo patrón que VRYoutubeVideoOverlaySync.jsx.
  const params = new URLSearchParams(window.location.search);
  const isPrimaryPanel = params.get('isPrimaryPanel') !== 'false';
  const isRightPanel = params.get('isRightPanel') === 'true';
  const isSinglePanel = params.get('singlePanel') === 'true';

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
      window.parent.postMessage({ source: 'ars-sync-test', action: 'compass-toggle-overlay', key: 'exploreYoutube' }, '*');
    } catch (e) { /* ignore */ }
  });
  panel.appendChild(closeBtn);

  // Fila de búsqueda: input + botón BUSCAR.
  const searchRow = document.createElement('div');
  searchRow.style.display = 'flex';
  searchRow.style.gap = '6px';
  searchRow.style.marginBottom = '8px';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Artista o canción...';
  Object.assign(searchInput.style, {
    flex: '1',
    minWidth: '0',
    padding: '6px',
    fontSize: '13px',
    border: '1px solid #555',
    borderRadius: '4px',
    background: '#1a1a1a',
    color: '#ffffff',
  });
  ['pointerdown', 'mousedown', 'click'].forEach((evt) => searchInput.addEventListener(evt, (e) => e.stopPropagation()));

  const searchBtn = document.createElement('button');
  searchBtn.textContent = 'BUSCAR';
  Object.assign(searchBtn.style, {
    padding: '6px 10px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '4px',
    background: '#121093',
    color: '#ffffff',
    cursor: 'pointer',
  });
  ['pointerdown', 'mousedown', 'click'].forEach((evt) => searchBtn.addEventListener(evt, (e) => e.stopPropagation()));

  searchRow.appendChild(searchInput);
  searchRow.appendChild(searchBtn);
  panel.appendChild(searchRow);

  // Botón de fallback "BUSCAR CON INVIDIOUS": solo aparece cuando el backend devuelve
  // `NOT_CONFIGURED` (falta `YOUTUBE_API_KEY`), y permite buscar igual usando la API pública de
  // Invidious (sin key). Es un <button> normal, así que el gaze/dwell de abajo lo activa igual que
  // el resto de controles.
  const invidiousBtn = document.createElement('button');
  invidiousBtn.textContent = 'BUSCAR CON INVIDIOUS';
  Object.assign(invidiousBtn.style, {
    display: 'none',
    width: '100%',
    padding: '6px 10px',
    marginBottom: '8px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '4px',
    background: '#1a7a1a',
    color: '#ffffff',
    cursor: 'pointer',
  });
  ['pointerdown', 'mousedown', 'click'].forEach((evt) => invidiousBtn.addEventListener(evt, (e) => e.stopPropagation()));
  panel.appendChild(invidiousBtn);

  const status = document.createElement('div');
  Object.assign(status.style, { color: '#ffcc66', fontSize: '11px', marginBottom: '6px', minHeight: '14px' });
  panel.appendChild(status);

  // Lista de resultados: una fila <button> por video (miniatura + título + canal).
  const resultsList = document.createElement('div');
  Object.assign(resultsList.style, { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto' });
  panel.appendChild(resultsList);

  // Recuadro del reproductor (oculto mientras no se seleccionó un resultado).
  const videoBox = document.createElement('div');
  Object.assign(videoBox.style, {
    width: '100%',
    aspectRatio: '16 / 9',
    background: '#000000',
    border: '2px dashed #666666',
    borderRadius: '4px',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#888888',
    fontSize: '12px',
    textAlign: 'center',
    boxSizing: 'border-box',
  });
  panel.appendChild(videoBox);

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

  // Botón "NUEVA BÚSQUEDA" — vuelve a mostrar la lista sin perder el texto buscado.
  const newSearchBtn = document.createElement('button');
  newSearchBtn.textContent = 'NUEVA BÚSQUEDA';
  Object.assign(newSearchBtn.style, {
    display: 'none',
    marginTop: '8px',
    padding: '6px 10px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '4px',
    background: '#454545',
    color: '#ffffff',
    cursor: 'pointer',
  });
  ['pointerdown', 'mousedown', 'click'].forEach((evt) => newSearchBtn.addEventListener(evt, (e) => e.stopPropagation()));
  panel.appendChild(newSearchBtn);

  document.body.appendChild(panel);

  // ---- Reproductor embebido (YouTube IFrame Player API), copiado de youtube-video-modules.js ----
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

  function showVideo(videoId) {
    currentVideoId = videoId;
    videoBox.style.display = 'flex';
    controls.style.display = 'flex';
    updatePlayPauseLabel(false);
    if (player) {
      player.loadVideoById(videoId);
      applyVolume();
      return;
    }
    videoBox.textContent = '';
    videoBox.style.border = 'none';
    playerContainerEl = document.createElement('div');
    playerContainerEl.style.width = '100%';
    playerContainerEl.style.height = '100%';
    videoBox.appendChild(playerContainerEl);
    loadYoutubeApi().then((YT) => {
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
      if (state === window.YT.PlayerState.ENDED) player.seekTo(0, true);
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

  window.addEventListener('message', (ev) => {
    const msg = ev.data;
    if (!msg || msg.source !== 'ars-sync-test' || !player) return;
    if (msg.action === 'youtube-video-play') {
      const wasMuted = player.isMuted();
      player.mute();
      if (player.getPlayerState() === window.YT.PlayerState.ENDED) player.seekTo(0, true);
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

  // ---- Lógica de búsqueda y resultados ----

  function showList() {
    videoBox.style.display = 'none';
    controls.style.display = 'none';
    newSearchBtn.style.display = 'none';
    resultsList.style.display = 'flex';
    searchRow.style.display = 'flex';
  }

  function showPlayerView() {
    searchRow.style.display = 'none';
    resultsList.style.display = 'none';
    newSearchBtn.style.display = 'block';
  }

  function renderResults(results) {
    resultsList.innerHTML = '';
    if (!results.length) {
      const empty = document.createElement('div');
      empty.textContent = 'Sin resultados para esa búsqueda.';
      Object.assign(empty.style, { color: '#888888', fontSize: '12px', padding: '8px', textAlign: 'center' });
      resultsList.appendChild(empty);
      return;
    }
    results.forEach((r) => {
      const row = document.createElement('button');
      Object.assign(row.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px',
        border: '1px solid #444',
        borderRadius: '4px',
        background: '#1a1a1a',
        color: '#ffffff',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
      });
      ['pointerdown', 'mousedown', 'click'].forEach((evt) => row.addEventListener(evt, (e) => e.stopPropagation()));

      const thumb = document.createElement('img');
      thumb.src = r.thumbnailUrl || '';
      thumb.alt = '';
      Object.assign(thumb.style, {
        width: '88px',
        height: '50px',
        objectFit: 'cover',
        borderRadius: '3px',
        background: '#000',
        flexShrink: '0',
      });

      const textCol = document.createElement('div');
      Object.assign(textCol.style, { display: 'flex', flexDirection: 'column', minWidth: '0' });
      const title = document.createElement('div');
      title.textContent = r.title || '';
      Object.assign(title.style, { fontSize: '12px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
      const channel = document.createElement('div');
      channel.textContent = r.channelTitle || '';
      Object.assign(channel.style, { fontSize: '10px', color: '#999999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
      textCol.appendChild(title);
      textCol.appendChild(channel);

      row.appendChild(thumb);
      row.appendChild(textCol);

      row.addEventListener('click', () => {
        status.textContent = '';
        showPlayerView();
        showVideo(r.videoId);
        // Devolver la selección al panel "New Song" (url + título + autor): el padre
        // (SyncStereoTestView.jsx) hace fan-out a ambos overlays `newSong`.
        send({ action: 'explore-youtube-select', url: videoUrl(r.videoId), title: r.title || '', artist: r.channelTitle || '' });
      });

      resultsList.appendChild(row);
    });
  }

  // Última consulta buscada — la usa el botón "BUSCAR CON INVIDIOUS" para repetir la búsqueda por
  // la vía alternativa sin pedir al usuario que vuelva a escribir.
  let lastQuery = '';

  function doSearch(query) {
    const q = (query || '').trim();
    if (!q) {
      status.textContent = 'Escribe algo para buscar.';
      return;
    }
    lastQuery = q;
    invidiousBtn.style.display = 'none';
    status.textContent = 'Buscando...';
    searchYoutube(q).then((res) => {
      if (!res.ok) {
        if (res.error === 'NOT_CONFIGURED') {
          status.textContent = 'Búsqueda de YouTube no configurada (falta la API key en el backend).';
          invidiousBtn.style.display = 'block';
        } else if (res.error === 'NETWORK_ERROR') {
          status.textContent = 'No se pudo contactar el backend (¿red caída?).';
        } else {
          status.textContent = 'La búsqueda falló. Reintenta.';
        }
        renderResults([]);
        return;
      }
      if (!res.results.length) {
        status.textContent = 'Sin resultados para esa búsqueda.';
        renderResults([]);
        return;
      }
      status.textContent = '';
      renderResults(res.results);
    });
  }

  // Búsqueda alternativa por Invidious (sin API key): usada solo como fallback del botón
  // "BUSCAR CON INVIDIOUS" cuando el backend no tiene `YOUTUBE_API_KEY`. Rellena la misma lista y,
  // al seleccionar, reproduce y rellena "New Song" igual que la búsqueda normal (el videoId es el
  // mismo de YouTube).
  function doSearchInvidious(query) {
    const q = (query || '').trim();
    if (!q) {
      status.textContent = 'Escribe algo para buscar.';
      return;
    }
    invidiousBtn.style.display = 'none';
    status.textContent = 'Buscando con Invidious...';
    searchYoutubeInvidious(q).then((res) => {
      if (!res.ok) {
        status.textContent = 'No se pudo buscar con Invidious (instancias no disponibles). Reintenta.';
        invidiousBtn.style.display = 'block';
        renderResults([]);
        return;
      }
      if (!res.results.length) {
        status.textContent = 'Sin resultados para esa búsqueda.';
        renderResults([]);
        return;
      }
      status.textContent = '';
      renderResults(res.results);
    });
  }

  searchBtn.addEventListener('click', () => doSearch(searchInput.value));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch(searchInput.value);
  });
  invidiousBtn.addEventListener('click', () => doSearchInvidious(lastQuery));

  newSearchBtn.addEventListener('click', () => {
    showList();
    status.textContent = '';
  });

  showList();

  // Auto-búsqueda al abrirse desde "BUSCAR EN YOUTUBE": lee la consulta que dejó VRNewSongAf.js,
  // la precarga y la limpia para que un próximo abierto a mano arranque vacío.
  function tryAutoSearch() {
    let query = '';
    try { query = localStorage.getItem(SEARCH_QUERY_STORAGE_KEY) || ''; } catch (e) { /* ignore */ }
    if (!query) return;
    try { localStorage.removeItem(SEARCH_QUERY_STORAGE_KEY); } catch (e) { /* ignore */ }
    searchInput.value = query;
    doSearch(query);
  }
  tryAutoSearch();

  // Marcador de ubicación (DOM equivalente al marcador 3D de vrPositionControl.js), copiado de
  // youtube-video-modules.js: reenvía su click al marcador 3D real y refleja su color/visibilidad.
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
    const realMarker = document.querySelector('#explore-youtube-anchor > a-circle.clickable');
    if (realMarker) realMarker.click();
  });
  document.body.appendChild(positionMarker);

  // Sigue al ancla 3D en pantalla — mismo truco "billboard" que youtube-video-modules.js.
  function trackAnchor() {
    const sceneEl = document.querySelector('a-scene');
    const anchorEl = document.querySelector('#explore-youtube-anchor');
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
      const realMarker = document.querySelector('#explore-youtube-anchor > a-circle.clickable');
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

  // Gaze/dwell sobre los botones de DOM (mismo patrón que youtube-video-modules.js): los botones
  // de este panel (BUSCAR, filas de resultados, controles, NUEVA BÚSQUEDA) son <button> normales,
  // así que se usa document.elementFromPoint() en el centro del canvas para saber sobre cuál está
  // la mirada y se activa tras FUSE_MS.
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
