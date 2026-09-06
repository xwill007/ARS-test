// Componente de karaoke: lista de canciones + reproductor con controles, dentro de la escena VR.
// Puerto de A-frame/english-vr/VR/componentes/karaoke-vr/karaoke-vr.js (ver Requerimiento 009).
import './components/VRNewSongAf/VRNewSongAf.js';
import { fetchCurrentUser } from '../../vrAuth.util.js';
import { getLocalSongs } from '../../vrSongCatalog.util.js';
import { getPointerNDC } from '../../vrPointerRaycast.util.js';

// Control de logs: usar Logs(true|false) para activar/desactivar
let showLogs = true; // cambiar a false para silenciar logs por defecto
function Logs(val) {
  if (typeof val === 'boolean') showLogs = val;
  else showLogs = !showLogs;
  console.log('vr-karaoke-af: logs ' + (showLogs ? 'enabled' : 'disabled'));
}
function L() { if (showLogs) console.log.apply(console, arguments); }
function W() { if (showLogs) console.warn.apply(console, arguments); }
function E() { if (showLogs) console.error.apply(console, arguments); }

// Componente vr-karaoke-af
// Requiere aframe-htmlembed-component para mostrar iframes de YouTube (no usado por ahora en
// esta vista; se deja documentado igual que en el proyecto de origen).
AFRAME.registerComponent('vr-karaoke-af', {
  schema: {
    videoPath: { type: 'string', default: '/videos/gangstas.mp4' },
    videoWidth: { type: 'number', default: 9 },
    videoHeight: { type: 'number', default: 6 },
    videoList: { type: 'string', default: 'GangstasParadise_Coolio.mp4|Coolio,ItsMyLife_BonJovi.mp4|Bon Jovi,StandByMe_BenEKing.mp4|Ben E. King' },
    textColor: { type: 'string', default: '#FFFFFF' },
    buttonColor: { type: 'string', default: '#4CAF50' },
    // Usar hex de 6 dígitos para evitar warnings de THREE.Color
    backgroundColor: { type: 'string', default: '#454545' },
    videoPosition: { type: 'string', default: '0 2.5 3' },
    listPosition: { type: 'string', default: '6 2.5 -3' },
    // Escala global aplicada al contenedor de la lista de canciones
    escalaLista: { type: 'number', default: 1.0 },
    // Escala (multiplicador) para la fuente del título "LISTA CANCIONES"
    tituloFontScale: { type: 'number', default: 1.0 },
    // Escala (multiplicador) para la fuente de los items (título de canción y artista)
    itemFontScale: { type: 'number', default: 1.0 },
  },
  init: function () {
    L('Inicializando componente vr-karaoke-af');

    // Preferir colores globales si existen (window.karaokeColors)
    const globalColors = (typeof window !== 'undefined' && window.karaokeColors) ? window.karaokeColors : {};

    const buttonColorRaw = globalColors.button || this.data.buttonColor || '#4CAF50';
    const backgroundColorRaw = globalColors.background || this.data.backgroundColor || '#454545';
    const textColorRaw = globalColors.text || this.data.textColor || '#FFFFFF';

    const buttonColor = ('' + buttonColorRaw).slice(0, 7);
    const backgroundColor = ('' + backgroundColorRaw).slice(0, 7);
    const textColor = ('' + textColorRaw).slice(0, 7);

    const palette = {
      primary: (globalColors.primary || '#121093').slice(0, 7),
      controlBg: (globalColors.controlBg || '#101010').slice(0, 7),
      progressLine: (globalColors.progressLine || '#bbbbbb').slice(0, 7),
      thumb: (globalColors.thumb || '#ffffff').slice(0, 7),
      controlBtn: (globalColors.controlBtn || '#333333').slice(0, 7),
      danger: (globalColors.danger || '#d21919').slice(0, 7),
    };

    this._textColor = textColor;
    this._buttonColor = buttonColor;
    this._backgroundColor = backgroundColor;
    this._palette = palette;

    L('Color del botón (normalizado):', buttonColor);
    L('Color del fondo (normalizado):', backgroundColor);
    L('Color del texto (normalizado):', textColor);

    // Construir la lista de canciones a mostrar (videoList del schema + catálogo local agregado
    // desde VRNewSongAf) y la UI del panel karaoke completa.
    this._initSongList();

    // Refrescar la lista cuando VRNewSongAf agrega una canción, para que aparezca sin recargar
    // la página.
    this._onCancionAgregada = () => { L('vr-karaoke-af: cancion-agregada recibido, refrescando lista'); this._initSongList(); };
    window.addEventListener('cancion-agregada', this._onCancionAgregada);

    // Configurar raycasting manual para clicks del mouse/touch si no hay cursor con rayOrigin: mouse
    const setupPointerRaycast = () => {
      L('setting up pointer raycast for vr-karaoke-af');
      const sceneEl = this.el.sceneEl;
      if (!sceneEl || !sceneEl.camera) return;

      const canvas = sceneEl.canvas;
      if (!canvas) return;

      const three = AFRAME && AFRAME.THREE ? AFRAME.THREE : window.THREE;
      if (!three) return;
      const raycaster = new three.Raycaster();

      const buildMeshMap = () => {
        const meshList = [];
        const meshToEl = new Map();
        (this._karaokeButtons || []).forEach((btnEl) => {
          btnEl.object3D.traverse((obj) => {
            if (obj.isMesh) {
              meshList.push(obj);
              meshToEl.set(obj, btnEl);
            }
          });
        });
        L('buildMeshMap: mapped', meshList.length, 'meshes for', (this._karaokeButtons || []).length, 'elements');
        return { meshList, meshToEl };
      };

      let meshData = buildMeshMap();
      this._lastHovered = null;

      const getScaleArr = (el) => {
        try {
          const s = el.getAttribute('scale');
          if (!s) return [1, 1, 1];
          if (typeof s === 'string') return s.split(' ').map((v) => parseFloat(v) || 0);
          if (Array.isArray(s)) return s.map((v) => parseFloat(v) || 0);
          if (s.x !== undefined) return [s.x, s.y, s.z];
        } catch (e) {}
        return [1, 1, 1];
      };

      const applyHover = (el) => {
        try {
          if (!el) return;
          if (!el._originalScale) {
            const orig = el.getAttribute('scale');
            el._originalScale = (typeof orig === 'string' && orig) ? orig : (Array.isArray(orig) ? orig.join(' ') : '1 1 1');
          }
          const sc = getScaleArr(el);
          const scaled = sc.map((v) => (v || 1) * 1.20);
          el.setAttribute('scale', `${scaled[0]} ${scaled[1]} ${scaled[2]}`);
        } catch (e) { /* ignore */ }
      };

      const clearHover = (el) => {
        try {
          if (!el) return;
          if (el._originalScale) {
            el.setAttribute('scale', el._originalScale);
            delete el._originalScale;
          } else {
            el.setAttribute('scale', '1 1 1');
          }
        } catch (e) { /* ignore */ }
      };

      const handleHover = (ev) => {
        try {
          let clientX, clientY;
          if (ev.touches && ev.touches.length) {
            clientX = ev.touches[0].clientX; clientY = ev.touches[0].clientY;
          } else {
            clientX = ev.clientX; clientY = ev.clientY;
          }
          const ndc = getPointerNDC(canvas, clientX, clientY);
          raycaster.setFromCamera(ndc, sceneEl.camera);
          if (!meshData || meshData.meshList.length === 0) meshData = buildMeshMap();
          const intersects = raycaster.intersectObjects(meshData.meshList, true);
          if (intersects && intersects.length > 0) {
            const mesh = intersects[0].object;
            const btnEl = meshData.meshToEl.get(mesh);
            if (btnEl && btnEl !== this._lastHovered) {
              try { clearHover(this._lastHovered); } catch (e) {}
              this._lastHovered = btnEl;
              try { applyHover(btnEl); } catch (e) {}
            }
          } else {
            try { clearHover(this._lastHovered); } catch (e) {}
            this._lastHovered = null;
          }
        } catch (e) { /* ignore hover errors */ }
      };

      const handlePointer = (ev) => {
        let clientX, clientY;
        if (ev.touches && ev.touches.length) {
          clientX = ev.touches[0].clientX;
          clientY = ev.touches[0].clientY;
        } else {
          clientX = ev.clientX;
          clientY = ev.clientY;
        }

        const ndc = getPointerNDC(canvas, clientX, clientY);
        L('handlePointer: NDC', ndc);
        raycaster.setFromCamera(ndc, sceneEl.camera);

        if (!meshData || meshData.meshList.length === 0) meshData = buildMeshMap();

        const intersects = raycaster.intersectObjects(meshData.meshList, true);
        if (intersects && intersects.length > 0) {
          const mesh = intersects[0].object;
          const btnEl = meshData.meshToEl.get(mesh);
          L('handlePointer: intersects length', intersects.length, 'mesh', mesh && mesh.name, 'mappedEl', btnEl && (btnEl.id || btnEl.className || btnEl.tagName));
          if (btnEl) {
            const intersection = intersects[0];
            if (typeof btnEl._activateSelection === 'function') {
              try { btnEl._activateSelection({ type: 'pointerdown', defaultPrevented: false, detail: { intersection } }); } catch (err) { W('Error al ejecutar _activateSelection:', err); }
            } else {
              try { btnEl.dispatchEvent(new CustomEvent('click', { bubbles: true, cancelable: true, detail: { intersection } })); } catch (err) { W('Error al despachar click:', err); }
            }
            try { ev.preventDefault(); } catch (e) {}
          }
        }
      };

      canvas.addEventListener('mousedown', handlePointer, { passive: false });
      canvas.addEventListener('touchstart', handlePointer, { passive: false });
      canvas.addEventListener('mousemove', handleHover, { passive: true });
      canvas.addEventListener('touchmove', handleHover, { passive: true });

      this.el.addEventListener('object3dset', () => { meshData = buildMeshMap(); });
    };

    if (this.el.sceneEl && this.el.sceneEl.camera && this.el.sceneEl.canvas) {
      setupPointerRaycast();
    } else if (this.el.sceneEl) {
      this.el.sceneEl.addEventListener('renderstart', setupPointerRaycast);
    }
  },

  // Construye el panel de la lista de canciones (fondo, título, botones) a partir de un array de
  // entradas "archivo|autor[|duracion]" y selecciona la primera por defecto. Se llama tanto con
  // `videoList` (schema) como con el catálogo local agregado desde VRNewSongAf. Ver `_initSongList`.
  _buildSongListUI: function (videos) {
    const textColor = this._textColor;

    if (this._videoListContainer) {
      try { if (this._videoListContainer.parentNode) this._videoListContainer.parentNode.removeChild(this._videoListContainer); } catch (e) {}
      const oldSongButtons = this._songButtons || [];
      this._karaokeButtons = (this._karaokeButtons || []).filter((b) => oldSongButtons.indexOf(b) === -1);
    }
    this._songButtons = [];

    const videoListContainer = document.createElement('a-entity');
    videoListContainer.setAttribute('position', this.data.listPosition);
    try {
      const listaScale = parseFloat(this.data.escalaLista) || 1.0;
      videoListContainer.setAttribute('scale', `${listaScale} ${listaScale} ${listaScale}`);
      this._listaScale = listaScale;
      L('vr-karaoke-af: lista scale set to', listaScale);
    } catch (e) {
      L('vr-karaoke-af: failed to apply lista scale, using default 1.0', e);
    }

    const background = document.createElement('a-plane');
    const buttonCount = videos.length;
    const backgroundHeight = buttonCount * 0.8 + 1.0;
    background.setAttribute('width', 4);
    background.setAttribute('height', backgroundHeight);
    background.setAttribute('color', this._backgroundColor);
    background.setAttribute('position', `0 ${-backgroundHeight / 2 + 0.4} -0.01`);

    const title = document.createElement('a-text');
    title.setAttribute('value', 'SONGS LIST');
    title.setAttribute('align', 'center');
    title.setAttribute('color', textColor);
    title.setAttribute('width', 4);
    title.setAttribute('position', '0 1.35 0.1');
    try {
      const tScale = parseFloat(this.data.tituloFontScale) || 1.0;
      title.setAttribute('scale', `${tScale} ${tScale} ${tScale}`);
    } catch (e) { /* ignore */ }
    background.appendChild(title);

    // Nombre del usuario actual, centrado debajo del título
    const userInfo = document.createElement('a-text');
    userInfo.setAttribute('value', 'User: Guest (id: 0)');
    userInfo.setAttribute('align', 'center');
    userInfo.setAttribute('color', textColor);
    userInfo.setAttribute('width', 3.6);
    userInfo.setAttribute('position', '0 1.6 0.1');
    userInfo.setAttribute('wrap-count', '24');
    userInfo.setAttribute('scale', '0.75 0.75 1');
    background.appendChild(userInfo);
    this._userInfoText = userInfo;

    fetchCurrentUser((user) => {
      const name = user.name || user.email || 'User';
      try { this._userInfoText.setAttribute('value', `User: ${name} (id: ${user.id})`); } catch (e) {}
    });

    videoListContainer.appendChild(background);

    videos.forEach((video, index) => {
      const [fileName, artist, duration] = video.split('|');

      const artistName = artist ? artist : 'Artista desconocido';
      const videoDuration = duration ? duration : 'Duración desconocida';

      const button = document.createElement('a-plane');
      button.setAttribute('width', 3.5);
      button.setAttribute('height', 0.7);
      button.setAttribute('color', this._buttonColor);
      button.setAttribute('position', `0 ${-index * 0.8 - 0.5} 0`);
      button.setAttribute('class', 'clickable');

      const topText = document.createElement('a-text');
      topText.setAttribute('value', `${index + 1}. ${fileName}`);
      topText.setAttribute('align', 'left');
      topText.setAttribute('color', textColor);
      topText.setAttribute('width', 2.6);
      topText.setAttribute('position', `-1.5 0.1 0.1`);
      topText.setAttribute('wrap-count', '30');
      let iScale = 1.0;
      try {
        iScale = parseFloat(this.data.itemFontScale) || 1.0;
        topText.setAttribute('scale', `${iScale} ${iScale} ${iScale}`);
      } catch (e) { /* ignore */ }

      const bottomText = document.createElement('a-text');
      bottomText.setAttribute('value', `${artistName} (${videoDuration})`);
      bottomText.setAttribute('align', 'left');
      bottomText.setAttribute('color', textColor);
      bottomText.setAttribute('width', 2.6);
      bottomText.setAttribute('position', `-1.5 -0.18 0.1`);
      bottomText.setAttribute('wrap-count', '40');
      try {
        bottomText.setAttribute('scale', `${iScale} ${iScale} ${iScale}`);
      } catch (e) { /* ignore */ }

      button.setAttribute('tabindex', '0');

      const activateSelection = (evt) => {
        if (evt && evt.defaultPrevented) return;
        L(`Cancion Seleccionada: ${fileName} - ${artistName}`, evt && evt.type);
        try { this._selectSongButton(button); } catch (e) {}
        try {
          this.loadVideo(`/videos/karaoke/${fileName}`, { fileName, artistName }, { countdown: true });
        } catch (e) {
          this.loadVideo(`/videos/karaoke/${fileName}`, { fileName, artistName });
        }
      };

      const inputEvents = [
        'click',
        'mousedown',
        'touchstart',
        'triggerdown',
        'gripdown',
        'abuttondown',
        'xbuttondown',
        'ybuttondown',
      ];
      inputEvents.forEach((ev) => button.addEventListener(ev, activateSelection));

      button.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activateSelection(e);
        }
      });
      button._activateSelection = activateSelection;

      button.appendChild(topText);
      button.appendChild(bottomText);
      videoListContainer.appendChild(button);

      if (!this._karaokeButtons) this._karaokeButtons = [];
      this._karaokeButtons.push(button);
      if (!this._songButtons) this._songButtons = [];
      this._songButtons.push(button);
    });

    this.el.appendChild(videoListContainer);
    this._videoListContainer = videoListContainer;

    // Al iniciar (o refrescar tras agregar una canción), seleccionar por defecto la primera
    // canción de la lista en vez del video genérico de `videoPath`.
    if (this.el.getAttribute('visible')) {
      if (videos.length) {
        const [firstFileName, firstArtist] = videos[0].split('|');
        const firstArtistName = firstArtist ? firstArtist : 'Artista desconocido';
        try { this._selectSongButton(this._songButtons[0]); } catch (e) {}
        this.loadVideo(`/videos/karaoke/${firstFileName}`, { fileName: firstFileName, artistName: firstArtistName });
      } else {
        this.loadVideo(this.data.videoPath);
      }
    }
  },

  // Construye la lista de canciones a mostrar combinando `videoList` (schema, canciones por
  // defecto) con el catálogo local agregado desde VRNewSongAf (ver vrSongCatalog.util.js).
  // ApprendeVr no tiene todavía un backend de canciones (Requerimiento 009, "No incluido"), así
  // que a diferencia del proyecto de origen esto no consulta ningún servidor.
  _initSongList: function () {
    const fallbackVideos = this.data.videoList.split(',').map((v) => v.trim()).filter(Boolean);
    const localSongs = getLocalSongs().map((s) => `${s.archivo}|${s.autor || 'Artista desconocido'}`);

    // Las canciones locales van primero (más recientes arriba), sin duplicar por archivo.
    const seen = new Set();
    const merged = [];
    localSongs.concat(fallbackVideos).forEach((entry) => {
      const fileName = entry.split('|')[0];
      if (seen.has(fileName)) return;
      seen.add(fileName);
      merged.push(entry);
    });

    this._buildSongListUI(merged);
  },

  // Resalta en negro el botón de la canción actualmente seleccionada y devuelve el resto de
  // botones de la lista a su color base.
  _selectSongButton: function (button) {
    (this._songButtons || []).forEach((b) => {
      try { b.setAttribute('color', (b === button) ? '#000000' : this._buttonColor); } catch (e) {}
    });
    this._selectedSongButton = button;
  },

  loadVideo: function (videoPath, meta, options) {
    L(`Cargando video: ${videoPath}`);

    const fileName = (meta && meta.fileName) ? meta.fileName : null;
    const artistName = (meta && meta.artistName) ? meta.artistName : null;
    this._currentSong = { path: videoPath, fileName: fileName, artist: artistName };

    const existingVideo = this.el.querySelector('a-video');
    if (existingVideo) {
      this.el.removeChild(existingVideo);
    }

    if (this._evaluateButton) {
      try { this.el.removeChild(this._evaluateButton); } catch (e) { /* ignore */ }
      if (this._karaokeButtons) {
        const idx = this._karaokeButtons.indexOf(this._evaluateButton);
        if (idx !== -1) this._karaokeButtons.splice(idx, 1);
      }
      this._evaluateButton = null;
    }

    try {
      if (this._htmlVideo && this._htmlVideo.parentNode) {
        try { this._htmlVideo.pause(); } catch (e) {}
        this._htmlVideo.parentNode.removeChild(this._htmlVideo);
      }
    } catch (e) { /* ignore */ }

    const vidId = 'karaoke-video-' + Math.floor(Math.random() * 1000000);
    const htmlVideo = document.createElement('video');
    htmlVideo.setAttribute('id', vidId);
    htmlVideo.setAttribute('crossorigin', 'anonymous');
    htmlVideo.setAttribute('preload', 'metadata');
    htmlVideo.style.display = 'none';
    htmlVideo.src = videoPath;
    document.body.appendChild(htmlVideo);
    this._htmlVideo = htmlVideo;

    const aVideoEl = document.createElement('a-video');
    aVideoEl.setAttribute('src', `#${vidId}`);
    aVideoEl.setAttribute('width', this.data.videoWidth);
    aVideoEl.setAttribute('height', this.data.videoHeight);
    aVideoEl.setAttribute('position', this.data.videoPosition);
    this.el.appendChild(aVideoEl);
    this._aVideo = aVideoEl;

    try {
      const opts = options || {};
      const countdownRequested = !!opts.countdown;
      if (countdownRequested) {
        L('Countdown solicitado para:', videoPath);
        const countdownEl = document.createElement('a-text');
        countdownEl.setAttribute('id', 'karaoke-countdown');
        countdownEl.setAttribute('value', '');
        countdownEl.setAttribute('align', 'center');
        countdownEl.setAttribute('color', '#ffffff');
        try { countdownEl.setAttribute('width', (this.data.videoWidth * 0.8).toString()); } catch (e) {}
        countdownEl.setAttribute('position', '0 0 0.06');
        countdownEl.setAttribute('scale', '6 6 6');
        countdownEl.setAttribute('visible', 'false');
        aVideoEl.appendChild(countdownEl);

        let sec = 3;
        try { countdownEl.setAttribute('visible', 'true'); countdownEl.setAttribute('value', sec.toString()); } catch (e) {}
        const intervalId = setInterval(() => {
          try {
            sec -= 1;
            L('countdown tick:', sec);
            if (sec > 0) {
              countdownEl.setAttribute('value', sec.toString());
            } else {
              clearInterval(intervalId);
              try { if (countdownEl.parentNode) countdownEl.parentNode.removeChild(countdownEl); } catch (e) {}
              try {
                L('Intentando autoplay sin silenciar tras countdown');
                const doUnmutedThenFallback = () => {
                  htmlVideo.muted = false;
                  const tryUnmuted = () => {
                    htmlVideo.play().then(() => {
                      L('Autoplay NO-silenciado iniciado tras countdown.');
                    }).catch((err) => {
                      W('Autoplay sin silenciar falló, intentando fallback silenciado:', err);
                      try {
                        htmlVideo.muted = true;
                        this._autoplayMuted = true;
                        const tryMuted = () => {
                          htmlVideo.play().then(() => {
                            L('Autoplay silenciado iniciado tras fallback.');
                          }).catch((err2) => {
                            W('No se pudo autoplay ni sin silenciar ni silenciado:', err2);
                            try {
                              if (!aVideoEl.querySelector('#karaoke-autoplay-hint')) {
                                const hintEl = document.createElement('a-text');
                                hintEl.setAttribute('id', 'karaoke-autoplay-hint');
                                hintEl.setAttribute('value', 'Click Play to start');
                                hintEl.setAttribute('align', 'center');
                                hintEl.setAttribute('color', '#ffffff');
                                try { hintEl.setAttribute('width', (this.data.videoWidth * 0.6).toString()); } catch (e) {}
                                hintEl.setAttribute('position', '0 -0.5 0.06');
                                hintEl.setAttribute('scale', '2 2 2');
                                aVideoEl.appendChild(hintEl);
                                this._autoplayHintEl = hintEl;
                                setTimeout(() => {
                                  try { if (this._autoplayHintEl && this._autoplayHintEl.parentNode) this._autoplayHintEl.parentNode.removeChild(this._autoplayHintEl); } catch (e) {}
                                  this._autoplayHintEl = null;
                                }, 10000);
                              }
                            } catch (e) { W('Error mostrando autoplay hint:', e); }
                          });
                        };
                        if (htmlVideo.readyState >= 2) tryMuted(); else htmlVideo.addEventListener('canplay', tryMuted, { once: true });
                      } catch (e) { W('Error during muted fallback:', e); }
                    });
                  };
                  if (htmlVideo.readyState >= 2) {
                    tryUnmuted();
                  } else {
                    htmlVideo.addEventListener('canplay', tryUnmuted, { once: true });
                    try { htmlVideo.load(); } catch (e) {}
                  }
                };
                doUnmutedThenFallback();
              } catch (err) { W('Error al iniciar play tras countdown:', err); }
            }
          } catch (e) { clearInterval(intervalId); }
        }, 1000);
      }
    } catch (e) { W('Error creando overlay de countdown:', e); }

    const posParts = (this.data.videoPosition || '0 0 0').split(' ').map(parseFloat);
    const vx = isNaN(posParts[0]) ? 0 : posParts[0];
    const vy = isNaN(posParts[1]) ? 0 : posParts[1];
    const vz = isNaN(posParts[2]) ? 0 : posParts[2];

    if (this._controlsEntity) {
      try { this.el.removeChild(this._controlsEntity); } catch (e) {}
      this._controlsEntity = null;
    }

    const controls = document.createElement('a-entity');
    const controlOffset = 0.6;
    const controlsY = vy - (this.data.videoHeight / 2) - controlOffset;
    controls.setAttribute('position', `${vx} ${controlsY} ${vz}`);
    controls.setAttribute('id', 'karaoke-controls');

    const progressBg = document.createElement('a-plane');
    progressBg.setAttribute('id', 'karaoke-progress-bg');
    progressBg.setAttribute('width', Math.max(1.8, this.data.videoWidth));
    progressBg.setAttribute('height', 1.0);
    progressBg.setAttribute('color', this._palette.controlBg || '#101010');
    progressBg.setAttribute('opacity', '0.6');
    progressBg.setAttribute('position', `0 -0.05 -0.02`);

    const progressLine = document.createElement('a-plane');
    progressLine.setAttribute('id', 'karaoke-progress-line');
    progressLine.setAttribute('width', (this.data.videoWidth * 0.9).toString());
    progressLine.setAttribute('height', 0.04);
    progressLine.setAttribute('color', this._palette.progressLine || '#bbbbbb');
    progressLine.setAttribute('position', `0 -0.1 0.01`);
    progressLine.setAttribute('class', 'clickable');

    const thumb = document.createElement('a-circle');
    thumb.setAttribute('id', 'karaoke-progress-thumb');
    thumb.setAttribute('radius', 0.09);
    thumb.setAttribute('color', this._palette.thumb || '#ffffff');
    const initialX = -(parseFloat(progressLine.getAttribute('width')) / 2) || -(this.data.videoWidth * 0.9 / 2);
    thumb.setAttribute('position', `${initialX} -0.1 0.02`);
    thumb.setAttribute('class', 'clickable');

    const elapsedBtn = document.createElement('a-plane');
    elapsedBtn.setAttribute('id', 'karaoke-elapsed-btn');
    elapsedBtn.setAttribute('width', 0.9);
    elapsedBtn.setAttribute('height', 0.32);
    elapsedBtn.setAttribute('color', this._palette.controlBg || '#222222');
    elapsedBtn.setAttribute('class', 'clickable');
    const elapsedX = -(this.data.videoWidth * 0.5) - 0.15;
    elapsedBtn.setAttribute('position', `${elapsedX} 0.06 0.02`);

    const elapsedText = document.createElement('a-text');
    elapsedText.setAttribute('id', 'karaoke-elapsed-display');
    elapsedText.setAttribute('value', '0:00');
    elapsedText.setAttribute('align', 'center');
    elapsedText.setAttribute('color', '#ffffff');
    elapsedText.setAttribute('width', '1.0');
    elapsedText.setAttribute('position', '0.6 0.3 0.01');
    elapsedText.setAttribute('scale', '9.0 9.0 9.0');
    elapsedBtn.appendChild(elapsedText);

    controls.appendChild(elapsedBtn);

    const btnBack = document.createElement('a-circle');
    btnBack.setAttribute('id', 'karaoke-btn-back');
    btnBack.setAttribute('class', 'clickable');
    btnBack.setAttribute('radius', 0.2);
    btnBack.setAttribute('color', this._palette.controlBtn || '#333333');
    btnBack.setAttribute('position', `-${this.data.videoWidth * 0.24} 0.3 0.02`);
    const backText = document.createElement('a-text');
    backText.setAttribute('value', '<<');
    backText.setAttribute('align', 'center');
    backText.setAttribute('color', '#ffffff');
    backText.setAttribute('position', '0 0 0.01');
    backText.setAttribute('width', '1.0');
    backText.setAttribute('scale', '9.0 9.0 9.0');
    btnBack.appendChild(backText);

    const btnPlay = document.createElement('a-circle');
    btnPlay.setAttribute('id', 'karaoke-btn-play');
    btnPlay.setAttribute('class', 'clickable');
    btnPlay.setAttribute('radius', 0.4);
    btnPlay.setAttribute('color', this._palette.controlBtn || '#121093');
    btnPlay.setAttribute('position', `0 0.3 0.02`);
    const playText = document.createElement('a-text');
    playText.setAttribute('id', 'karaoke-play-text');
    playText.setAttribute('value', 'Play');
    playText.setAttribute('align', 'center');
    playText.setAttribute('color', '#ffffff');
    playText.setAttribute('position', '0 0 0.01');
    playText.setAttribute('width', '9.0');
    btnPlay.appendChild(playText);

    const btnForward = document.createElement('a-circle');
    btnForward.setAttribute('id', 'karaoke-btn-forward');
    btnForward.setAttribute('class', 'clickable');
    btnForward.setAttribute('radius', 0.2);
    btnForward.setAttribute('color', this._palette.controlBtn || '#333333');
    btnForward.setAttribute('position', `${this.data.videoWidth * 0.24} 0.3 0.02`);
    const fwdText = document.createElement('a-text');
    fwdText.setAttribute('value', '>>');
    fwdText.setAttribute('align', 'center');
    fwdText.setAttribute('color', '#ffffff');
    fwdText.setAttribute('position', '0 0 0.01');
    fwdText.setAttribute('width', '1.0');
    fwdText.setAttribute('scale', '9.0 9.0 9.0');
    btnForward.appendChild(fwdText);
    const fwdTime = document.createElement('a-text');
    fwdTime.setAttribute('id', 'karaoke-forward-duration');
    fwdTime.setAttribute('value', '0:00');
    fwdTime.setAttribute('align', 'left');
    fwdTime.setAttribute('color', '#ffffff');
    fwdTime.setAttribute('width', '1.4');
    fwdTime.setAttribute('position', '3.0 0 0.01');
    fwdTime.setAttribute('scale', '6.0 6.0 6.0');
    btnForward.appendChild(fwdTime);

    controls.appendChild(progressBg);
    controls.appendChild(progressLine);
    controls.appendChild(thumb);
    controls.appendChild(btnBack);
    controls.appendChild(btnPlay);
    controls.appendChild(btnForward);

    this.el.appendChild(controls);
    this._controlsEntity = controls;

    try {
      this.el.dispatchEvent(new Event('object3dset'));
      L('vr-karaoke-af: forced object3dset to rebuild mesh map after creating controls');
    } catch (e) { /* ignore */ }

    try {
      if (!this._karaokeButtons) this._karaokeButtons = [];
      const controlsToRegister = [progressLine, thumb, btnBack, btnPlay, btnForward, elapsedBtn];
      controlsToRegister.forEach((el) => {
        try {
          if (this._karaokeButtons.indexOf(el) === -1) this._karaokeButtons.push(el);
          el._activateSelection = (evt) => {
            try {
              const intersection = evt && evt.detail && evt.detail.intersection;
              if (intersection) {
                el.dispatchEvent(new CustomEvent('click', { bubbles: true, cancelable: true, detail: { intersection } }));
              } else {
                el.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
              }
            } catch (e) { try { if (typeof el.click === 'function') el.click(); } catch (e) {} }
          };
        } catch (e) { /* ignore individual failures */ }
      });
      L('vr-karaoke-af: registered controls for manual raycast:', controlsToRegister.map((x) => x && (x.id || x.tagName)).join(', '));
      try { this.el.dispatchEvent(new Event('object3dset')); } catch (e) {}
    } catch (e) { W('Error registrando controles para raycast manual:', e); }

    const video = htmlVideo;

    const formatTime = (sec) => {
      if (isNaN(sec)) return '0:00';
      const s = Math.floor(sec % 60).toString().padStart(2, '0');
      const m = Math.floor(sec / 60);
      return `${m}:${s}`;
    };

    let isDragging = false;

    const updateUI = () => {
      const current = video.currentTime || 0;
      const duration = video.duration || 0;
      try { if (typeof fwdTime !== 'undefined') fwdTime.setAttribute('value', formatTime(duration)); } catch (e) {}
      try { if (typeof elapsedText !== 'undefined') elapsedText.setAttribute('value', formatTime(current)); } catch (e) {}

      const lineW = parseFloat(progressLine.getAttribute('width')) || (this.data.videoWidth * 0.9);
      const half = lineW / 2;
      const ratio = duration ? Math.max(0, Math.min(1, current / duration)) : 0;
      const x = -half + ratio * lineW;
      if (!isDragging) {
        try { thumb.setAttribute('position', `${x} -0.1 0.02`); } catch (e) {}
      }
    };

    video.addEventListener('timeupdate', updateUI);
    video.addEventListener('loadedmetadata', updateUI);
    video.addEventListener('play', () => { try { playText.setAttribute('value', 'Pause'); } catch (e) {} });
    video.addEventListener('pause', () => { try { playText.setAttribute('value', 'Play'); } catch (e) {} });

    btnPlay.addEventListener('click', () => {
      try {
        if (video.paused) {
          try { if (this._autoplayHintEl && this._autoplayHintEl.parentNode) this._autoplayHintEl.parentNode.removeChild(this._autoplayHintEl); } catch (e) {}
          this._autoplayHintEl = null;
          if (this._autoplayMuted) {
            try { video.muted = false; } catch (e) {}
            this._autoplayMuted = false;
            L('Usuario activó reproducción: desmuteando video');
          }
          video.play();
        } else {
          video.pause();
        }
      } catch (e) { W('Error en btnPlay click:', e); }
    });
    btnBack.addEventListener('click', () => { video.currentTime = Math.max(0, (video.currentTime || 0) - 10); });
    btnForward.addEventListener('click', () => {
      try {
        const cur = (video.currentTime || 0);
        const dur = (typeof video.duration === 'number' && !isNaN(video.duration) && isFinite(video.duration)) ? video.duration : Infinity;
        const target = Math.min(dur, cur + 10);
        video.currentTime = target;
      } catch (e) { /* ignore */ }
    });

    progressLine.addEventListener('click', (evt) => {
      try {
        const inter = evt.detail && evt.detail.intersection && evt.detail.intersection.point;
        if (!inter) return;
        const point = inter.clone();
        progressLine.object3D.worldToLocal(point);
        const lineWidth = parseFloat(progressLine.getAttribute('width')) || (this.data.videoWidth * 0.9);
        const half = lineWidth / 2;
        const ratio = Math.max(0, Math.min(1, (point.x + half) / lineWidth));
        const seekTime = (video.duration || 0) * ratio;
        if (!isNaN(seekTime)) video.currentTime = seekTime;
      } catch (err) { E('Error al seekear desde controles del componente:', err); }
    });

    try {
      const three = (AFRAME && AFRAME.THREE) ? AFRAME.THREE : window.THREE;
      const rr = three ? new three.Raycaster() : null;

      const pointerToRatio = (clientX, clientY) => {
        try {
          const sceneEl = this.el.sceneEl;
          if (!sceneEl || !sceneEl.camera || !sceneEl.canvas || !rr) return null;
          const ndc = getPointerNDC(sceneEl.canvas, clientX, clientY);
          rr.setFromCamera(ndc, sceneEl.camera);
          const intersects = rr.intersectObject(progressLine.object3D, true);
          if (intersects && intersects.length > 0) {
            const p = intersects[0].point.clone();
            progressLine.object3D.worldToLocal(p);
            const lineWidth = parseFloat(progressLine.getAttribute('width')) || (this.data.videoWidth * 0.9);
            const half = lineWidth / 2;
            const ratio = Math.max(0, Math.min(1, (p.x + half) / lineWidth));
            return ratio;
          }
        } catch (e) { /* ignore */ }
        return null;
      };

      const onPointerMove = (ev) => {
        ev.preventDefault && ev.preventDefault();
        let clientX, clientY;
        if (ev.touches && ev.touches.length) {
          clientX = ev.touches[0].clientX; clientY = ev.touches[0].clientY;
        } else {
          clientX = ev.clientX; clientY = ev.clientY;
        }
        const r = pointerToRatio(clientX, clientY);
        if (r === null) return;
        const t = (video.duration || 0) * r;
        if (!isNaN(t)) {
          try { video.currentTime = t; } catch (e) {}
          updateUI();
        }
      };

      const stopDrag = () => {
        isDragging = false;
        document.removeEventListener('mousemove', onPointerMove);
        document.removeEventListener('touchmove', onPointerMove);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchend', stopDrag);
      };

      const startDrag = (ev) => {
        ev && ev.preventDefault && ev.preventDefault();
        isDragging = true;
        if (ev.touches && ev.touches.length) onPointerMove(ev);
        else if (ev.clientX !== undefined) onPointerMove(ev);
        document.addEventListener('mousemove', onPointerMove, { passive: false });
        document.addEventListener('touchmove', onPointerMove, { passive: false });
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);
      };

      thumb.addEventListener('mousedown', startDrag);
      thumb.addEventListener('touchstart', startDrag, { passive: false });
      ['triggerdown', 'gripdown', 'abuttondown', 'xbuttondown'].forEach((evName) => thumb.addEventListener(evName, startDrag));
      ['triggerup', 'gripup', 'abuttonup', 'xbuttonup'].forEach((evName) => thumb.addEventListener(evName, stopDrag));
    } catch (e) {
      W('Drag-to-seek no disponible (raycaster o escena faltante):', e);
    }

    try { video.load(); } catch (e) {}

    setTimeout(updateUI, 200);

    this._video = video;
    this._aVideo = aVideoEl;

    // Botón "EVALUATE SONG" debajo del video: abre/actualiza el panel de evaluación
    // (vr-evaluacion-af) para la canción actualmente cargada.
    try {
      const posParts2 = (this.data.videoPosition || '0 0 0').split(' ').map(parseFloat);
      const vx2 = isNaN(posParts2[0]) ? 0 : posParts2[0];
      const vy2 = isNaN(posParts2[1]) ? 0 : posParts2[1];
      const vz2 = isNaN(posParts2[2]) ? 0 : posParts2[2];

      const evalBtn = document.createElement('a-plane');
      let btnWidth = Math.min(this.data.videoWidth, 4);
      const btnHeight = 1.2;
      const btnY = vy2 + (this.data.videoHeight / 2) + (btnHeight / 2) + 0.15;
      const tmpTextValue = 'EVALUATE SONG';
      const charFactor = 0.12;
      const scaleFactor = 1.0;
      const desiredWidth = Math.min(btnWidth, Math.max(1.8, tmpTextValue.length * charFactor * scaleFactor + 0.6));
      btnWidth = Math.max(btnWidth * 0.6, desiredWidth);

      evalBtn.setAttribute('width', btnWidth + 1);
      evalBtn.setAttribute('height', btnHeight);
      evalBtn.setAttribute('color', this._palette.danger || '#d21919');
      try { evalBtn.setAttribute('material', 'shader: flat; side: double;'); } catch (e) {}
      evalBtn.setAttribute('position', `${vx2} ${btnY} ${vz2}`);
      evalBtn.setAttribute('class', 'clickable evaluate-button');
      evalBtn.setAttribute('tabindex', '0');

      const evalText = document.createElement('a-text');
      evalText.setAttribute('value', 'EVALUATE SONG');
      evalText.setAttribute('align', 'center');
      evalText.setAttribute('color', this._textColor || '#ffffff');
      evalText.setAttribute('width', (btnWidth - 0.2) * 1.8);
      evalText.setAttribute('scale', '2 2 2');
      try {
        evalText.setAttribute('baseline', 'center');
        evalText.setAttribute('anchor', 'center');
      } catch (e) { /* ignore if not supported */ }
      evalText.setAttribute('position', `0 0 0.06`);
      try {
        evalText.setAttribute('material', 'shader: flat; side: double; depthTest: false;');
      } catch (e) { /* ignore */ }

      try {
        const radius = btnHeight / 2;
        const offsetX = (btnWidth / 2) - radius + 1;
        const leftCircle = document.createElement('a-circle');
        leftCircle.setAttribute('radius', radius);
        leftCircle.setAttribute('segments', 32);
        leftCircle.setAttribute('color', this._palette.danger || '#d21919');
        leftCircle.setAttribute('position', `${-offsetX} 0 0.003`);
        leftCircle.setAttribute('rotation', '0 0 0');

        const rightCircle = document.createElement('a-circle');
        rightCircle.setAttribute('radius', radius);
        rightCircle.setAttribute('segments', 32);
        rightCircle.setAttribute('color', this._palette.danger || '#d21919');
        rightCircle.setAttribute('position', `${offsetX} 0 0.003`);
        rightCircle.setAttribute('rotation', '0 0 0');

        evalBtn.appendChild(leftCircle);
        evalBtn.appendChild(rightCircle);
      } catch (e) {
        // si no se soportan a-circle, ignorar
      }

      evalBtn.appendChild(evalText);

      const onEvaluate = (e) => {
        e && e.preventDefault && e.preventDefault();
        this.evaluateSong(videoPath);
      };

      ['click', 'mousedown', 'touchstart', 'triggerdown', 'gripdown'].forEach((ev) => evalBtn.addEventListener(ev, onEvaluate));
      evalBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEvaluate(e); } });

      this.el.appendChild(evalBtn);
      this._evaluateButton = evalBtn;
      if (!this._karaokeButtons) this._karaokeButtons = [];
      this._karaokeButtons.push(evalBtn);
      evalBtn._activateSelection = onEvaluate;
      try {
        this.el.dispatchEvent(new Event('object3dset'));
        L('vr-karaoke-af: forced object3dset to rebuild mesh map after adding evaluate button');
      } catch (e) { /* ignore */ }
    } catch (e) {
      W('No se pudo crear el botón EVALUATE SONG:', e);
    }
  },

  evaluateSong: function (videoPath) {
    const current = this._currentSong || { path: videoPath, fileName: null, artist: null };
    const fileName = current.fileName || (videoPath ? videoPath.split('/').pop() : 'unknown');
    const artist = current.artist || 'Artista desconocido';
    L('Evaluate song requested for:', videoPath, '-', fileName, '-', artist);
    try {
      this.el.emit('evaluate-song', { path: videoPath, fileName: fileName, artist: artist });
    } catch (e) {
      // fallback: nada
    }

    try {
      let evalPosX = -2, evalPosY = 1.6, evalPosZ = -1.5;
      try {
        // Usar la posición y dirección MUNDIALES de la cámara (getWorldPosition/getWorldDirection)
        // en vez de camEl.getAttribute('position'): en ApprendeVr la cámara vive anidada dentro
        // del rig `vr-user` (modo tercera persona), así que su posición LOCAL no corresponde a su
        // posición real en la escena — usar la local dejaba el panel siempre cerca del origen del
        // mundo en vez de frente a la cámara.
        const sceneEl = this.el.sceneEl;
        const three = (AFRAME && AFRAME.THREE) ? AFRAME.THREE : window.THREE;
        if (sceneEl && sceneEl.camera && three) {
          const camObj = sceneEl.camera;
          const worldPos = new three.Vector3();
          camObj.getWorldPosition(worldPos);
          const worldDir = new three.Vector3();
          camObj.getWorldDirection(worldDir);
          evalPosX = worldPos.x + worldDir.x * 1.5;
          evalPosY = worldPos.y;
          evalPosZ = worldPos.z + worldDir.z * 1.5;
        }
      } catch (e) {
        // fallback: usar valores por defecto
      }

      if (this._evaluationPanel && this._evaluationPanel.parentNode) {
        try {
          this._evaluationPanel.setAttribute('vr-evaluacion-af', { songTitle: fileName, artist: artist, position: `${evalPosX} ${evalPosY} ${evalPosZ}`, visible: true });
        } catch (e) {
          this._evaluationPanel.setAttribute('vr-evaluacion-af', `songTitle: ${fileName}; artist: ${artist}; position: ${evalPosX} ${evalPosY} ${evalPosZ}; visible: true`);
        }
      } else {
        const evalEl = document.createElement('a-entity');
        evalEl.setAttribute('id', 'evaluacion-panel');
        try {
          evalEl.setAttribute('vr-evaluacion-af', { songTitle: fileName, artist: artist, position: `${evalPosX} ${evalPosY} ${evalPosZ}`, visible: true });
        } catch (e) {
          evalEl.setAttribute('vr-evaluacion-af', `songTitle: ${fileName}; artist: ${artist}; position: ${evalPosX} ${evalPosY} ${evalPosZ}; visible: true`);
        }
        try {
          if (this.el.parentNode) this.el.parentNode.appendChild(evalEl);
          else if (this.el.sceneEl) this.el.sceneEl.appendChild(evalEl);
        } catch (e) {
          if (this.el.sceneEl) this.el.sceneEl.appendChild(evalEl);
        }
        try {
          evalEl.addEventListener('submit-evaluation', (ev) => {
            L('Received evaluation:', ev.detail);
          });
        } catch (e) { /* ignore */ }
        this._evaluationPanel = evalEl;
      }
    } catch (e) {
      W('No se pudo mostrar el panel de evaluación:', e);
    }
  },
});
