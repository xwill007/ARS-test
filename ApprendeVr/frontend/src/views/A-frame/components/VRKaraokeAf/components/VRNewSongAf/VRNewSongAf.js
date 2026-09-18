// Componente New Song: panel 3D (dentro de la escena, al lado izquierdo del karaoke) para
// agregar canciones nuevas al catálogo VR.
// Puerto de A-frame/english-vr/VR/componentes/new-song/new-song.js (ver Requerimiento 009).
//
// A-Frame no tiene entrada de texto nativa, así que este panel incluye su propio teclado
// virtual (botones clickeables, con teclas ñ/á/é/í/ó/ú además del QWERTY) para escribir
// Título/Autor/Archivo/URL de YouTube, siguiendo el mismo patrón de botones que usan
// VRKaraokeAf.js y VREvaluacionAf.js. También acepta el teclado físico: al seleccionar un campo
// entra en "modo escritura" y captura keydown hasta que se presiona ESC (la cámara se mueve con
// las flechas, no con WASD — ver arrow-controls en index.js — así que W/A/S/D llegan siempre al
// formulario). Los acentos/ñ se ven correctamente gracias a la fuente MSDF ya usada en esta vista
// (ver `public/fonts/Ultra-msdf/`, cargada como fuente por defecto de <a-text> en index.html).
import { addLocalSong } from '../../../../vrSongCatalog.util.js';
import { getPointerNDC } from '../../../../vrPointerRaycast.util.js';
import { createSong } from '../../../../vrSongsApi.util.js';
import { extractYoutubeVideoId } from '../../../../vrYoutube.util.js';
import { openYoutubePlayer, closeYoutubePlayer, isYoutubePlayerOpen } from '../../../../vrYoutubePlayer.util.js';
import { saveLocalVideo } from '../../../../vrLocalVideoStore.util.js';

// Prefijo que marca `this._values.archivo` como una referencia a un video guardado en el
// IndexedDB de ESTE dispositivo (ver vrLocalVideoStore.util.js/pickLocalVideoFile), en vez de un
// nombre de archivo en `public/videos/karaoke/` del servidor. `_saveSong` lo usa para decidir la
// `source` ('local' en vez de 'server') y para separar el `fileId` real del prefijo antes de
// mandarlo al backend.
const DEVICE_FILE_PREFIX = 'device:';

const KEY_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'BKSP'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', '_', '.', 'CAPS'],
];

// Fila extra de caracteres propios del español, que no están en el QWERTY normal.
const ACCENT_KEYS = ['ñ', 'á', 'é', 'í', 'ó', 'ú'];

const FIELDS = [
  { name: 'titulo', label: 'Titulo' },
  { name: 'autor', label: 'Autor' },
  { name: 'archivo', label: 'Archivo local (click "P" para elegir un video del dispositivo)' },
  { name: 'youtubeUrl', label: 'YouTube URL (dejar vacio si usas Archivo local)' },
];

AFRAME.registerComponent('vr-new-song-af', {
  schema: {
    position: { type: 'string', default: '-9 5 0' },
    width: { type: 'number', default: 3.2 },
    height: { type: 'number', default: 5.5 },
    textColor: { type: 'string', default: '#ffffff' },
    buttonColor: { type: 'string', default: '#0008ff' },
    backgroundColor: { type: 'string', default: '#2a2a2a' },
  },

  init: function () {
    const el = this.el;
    const data = this.data;

    el.setAttribute('position', data.position);

    this._values = { titulo: '', autor: '', archivo: '', youtubeUrl: '' };
    this._activeField = 'titulo';
    this._caps = false;
    this._typingMode = false; // true mientras se captura el teclado físico
    this._clickableEls = []; // { el, onClick } para el raycast manual de mouse

    const planeW = data.width;
    const planeH = data.height;

    // Fondo del panel
    const bg = document.createElement('a-plane');
    bg.setAttribute('width', planeW);
    bg.setAttribute('height', planeH);
    bg.setAttribute('color', data.backgroundColor);
    bg.setAttribute('material', 'shader: flat; side: double;');
    el.appendChild(bg);

    let y = planeH / 2 - 0.22;

    const title = document.createElement('a-text');
    title.setAttribute('value', 'NEW SONG');
    title.setAttribute('align', 'center');
    title.setAttribute('color', data.textColor);
    title.setAttribute('width', planeW);
    title.setAttribute('position', `0 ${y} 0.01`);
    el.appendChild(title);
    y -= 0.28;

    const hint = document.createElement('a-text');
    hint.setAttribute('value', 'Click en un campo y escribe con el teclado fisico o los botones, o click en el icono "P" para pegar el portapapeles ahi (en "Archivo local", abre el selector de archivos del dispositivo). ESC suelta el teclado (camara con flechas).');
    hint.setAttribute('align', 'center');
    hint.setAttribute('color', '#888888');
    hint.setAttribute('width', planeW - 0.3);
    hint.setAttribute('wrap-count', '44');
    hint.setAttribute('scale', '0.55 0.55 1');
    hint.setAttribute('position', `0 ${y} 0.01`);
    el.appendChild(hint);
    y -= 0.24;

    // --- Campos de texto (clickeables para seleccionarlos, se escriben con el teclado de abajo) ---
    this._fieldEls = {};
    const fieldRowW = planeW - 0.3;

    // Icono "P" de pegar-portapapeles a la derecha de cada campo (pedido del usuario: poder pegar
    // título/autor/archivo/URL directo en su respectivo campo, no solo la URL de YouTube como
    // antes con el botón dedicado que este icono reemplaza). Reemplaza el valor actual del campo
    // en vez de agregarse al final, mismo criterio que ya usaba ese botón. Requiere el permiso
    // `clipboard-read` en el `allow` del `<iframe>` que monta este panel dentro de mirror-fix (ver
    // VRKaraokeOverlaySync.jsx) y foco real del documento — `navigator.clipboard.readText()`
    // rechaza con `NotAllowedError` sin `window.focus()` primero (ver hallazgo real documentado en
    // el Requerimiento 015, sección 5, sobre foco de iframes en mirror-fix).
    const pasteIconW = 0.26;
    const pasteIconGap = 0.04;
    const inputW = fieldRowW - pasteIconW - pasteIconGap;
    const inputCenterX = -(pasteIconW + pasteIconGap) / 2;
    const pasteIconX = fieldRowW / 2 - pasteIconW / 2;

    const pasteIntoField = (fieldName) => {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        this._statusText.setAttribute('color', '#ff8888');
        this._statusText.setAttribute('value', 'Este navegador no permite leer el portapapeles aqui.');
        return;
      }
      try { window.focus(); } catch (e) { /* ignore */ }
      navigator.clipboard.readText().then((text) => {
        const clip = (text || '').trim();
        if (!clip) {
          this._statusText.setAttribute('color', '#ffcc66');
          this._statusText.setAttribute('value', 'Portapapeles vacio (sin texto copiado).');
          return;
        }
        this._values[fieldName] = clip;
        this._refreshFieldText(fieldName);
        this._setActiveField(fieldName);
        this._statusText.setAttribute('color', '#aaffaa');
        this._statusText.setAttribute('value', 'Valor pegado desde el portapapeles.');
      }).catch((err) => {
        this._statusText.setAttribute('color', '#ff8888');
        const detail = (err && err.name === 'NotAllowedError')
          ? ' (el navegador nego el permiso de portapapeles)'
          : '';
        this._statusText.setAttribute('value', 'No se pudo leer el portapapeles' + detail + '.');
      });
    };

    // Pedido del usuario: en vez de escribir a mano el nombre de un archivo ya copiado manualmente
    // a `public/videos/karaoke/` (flujo original, ahora `source: 'server'`), el icono "P" del
    // campo "archivo" abre el selector de archivos nativo del sistema operativo (funciona igual en
    // desktop y en mobile, donde normalmente abre en "Descargas" o la última carpeta usada por el
    // navegador — no hay forma estándar de forzar esa carpeta por defecto desde la web). El video
    // elegido NO se sube a ningún servidor (pedido explícito del usuario): el contenido binario se
    // guarda en el `IndexedDB` de este mismo dispositivo (ver vrLocalVideoStore.util.js) — sigue
    // funcionando en mobile porque IndexedDB está disponible ahí, a diferencia de rutas de archivo
    // reales del sistema operativo, a las que la web nunca tiene acceso directo. Los METADATOS
    // (título/autor/`fileId`) sí se registran en el backend con `source: 'local'` (ver
    // `_saveSong`), para que la canción aparezca de forma persistente en la lista de quien la
    // agregó (`GET /songs/mine`) — pero solo se reproduce en el dispositivo que tiene el video en
    // su `IndexedDB`.
    const sanitizeFileName = (name) => (name || 'video').replace(/[^a-zA-Z0-9._-]/g, '_');

    // Pedido del usuario: si el nombre del archivo elegido trae un "-" (ej. "Stand By Me - Ben E
    // King.mp4"), la parte antes del primer "-" es el título de la canción y la parte después es
    // el autor — se usan para completar esos campos automáticamente, ahorrando escribirlos a mano.
    // Se parsea del nombre ORIGINAL (`file.name`, con espacios/acentos), no del `fileId` saneado
    // (que reemplaza espacios por "_" para guardarlo en IndexedDB) — el nombre mostrado en
    // "Título"/"Autor" debe quedar legible.
    const parseTitleArtistFromFileName = (originalName) => {
      const base = (originalName || '').replace(/\.[^./]+$/, ''); // quita la extensión
      const dashIndex = base.indexOf('-');
      if (dashIndex === -1) return { title: base.trim(), artist: '' };
      return { title: base.slice(0, dashIndex).trim(), artist: base.slice(dashIndex + 1).trim() };
    };

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'video/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    this._fileInput = fileInput;

    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = ''; // permite volver a elegir el mismo archivo más adelante
      if (!file) return;
      if (file.type && !file.type.startsWith('video/')) {
        this._statusText.setAttribute('color', '#ff8888');
        this._statusText.setAttribute('value', 'El archivo elegido no parece ser un video.');
        return;
      }

      // Autocompleta Título/Autor desde el nombre del archivo, sin pisar lo que el usuario ya
      // haya escrito a mano en esos campos.
      const parsed = parseTitleArtistFromFileName(file.name);
      if (parsed.title && !(this._values.titulo || '').trim()) {
        this._values.titulo = parsed.title;
        this._refreshFieldText('titulo');
      }
      if (parsed.artist && !(this._values.autor || '').trim()) {
        this._values.autor = parsed.artist;
        this._refreshFieldText('autor');
      }

      const fileId = sanitizeFileName(file.name);
      this._statusText.setAttribute('color', '#ffcc66');
      this._statusText.setAttribute('value', 'Guardando video local (' + file.name + ')...');
      saveLocalVideo(fileId, file).then(() => {
        this._values.archivo = DEVICE_FILE_PREFIX + fileId;
        this._refreshFieldText('archivo');
        this._setActiveField('archivo');
        this._statusText.setAttribute('color', '#aaffaa');
        this._statusText.setAttribute('value', 'Video local listo: ' + file.name + '.');
      }).catch((err) => {
        this._statusText.setAttribute('color', '#ff8888');
        this._statusText.setAttribute('value', 'No se pudo guardar el video local (' + (err && err.message ? err.message : 'error desconocido') + ').');
      });
    });

    const pickLocalVideoFile = () => {
      try { fileInput.click(); } catch (e) { /* ignore */ }
    };

    FIELDS.forEach((f) => {
      const label = document.createElement('a-text');
      label.setAttribute('value', f.label);
      label.setAttribute('align', 'left');
      label.setAttribute('color', '#999999');
      label.setAttribute('width', planeW - 0.4);
      label.setAttribute('wrap-count', '40');
      label.setAttribute('scale', '0.6 0.6 1');
      label.setAttribute('position', `-${fieldRowW / 2} ${y + 0.12} 0.01`);
      el.appendChild(label);

      const plane = document.createElement('a-plane');
      plane.setAttribute('width', inputW);
      plane.setAttribute('height', 0.22);
      plane.setAttribute('color', '#1a1a1a');
      plane.setAttribute('class', 'clickable');
      plane.setAttribute('position', `${inputCenterX} ${y - 0.05} 0.01`);
      el.appendChild(plane);

      const valueTxt = document.createElement('a-text');
      valueTxt.setAttribute('value', '');
      valueTxt.setAttribute('align', 'left');
      valueTxt.setAttribute('color', '#ffffff');
      valueTxt.setAttribute('width', inputW - 0.1);
      valueTxt.setAttribute('wrap-count', '30');
      valueTxt.setAttribute('position', `${inputCenterX - inputW / 2 + 0.05} ${y - 0.05} 0.02`);
      el.appendChild(valueTxt);

      const onClick = () => this._setActiveField(f.name);
      plane.addEventListener('click', onClick);
      this._clickableEls.push({ el: plane, onClick: onClick });

      const pasteIcon = document.createElement('a-plane');
      pasteIcon.setAttribute('width', pasteIconW);
      pasteIcon.setAttribute('height', 0.22);
      pasteIcon.setAttribute('color', '#334455');
      pasteIcon.setAttribute('class', 'clickable');
      pasteIcon.setAttribute('position', `${pasteIconX} ${y - 0.05} 0.01`);
      const pasteIconTxt = document.createElement('a-text');
      pasteIconTxt.setAttribute('value', 'P');
      pasteIconTxt.setAttribute('align', 'center');
      pasteIconTxt.setAttribute('color', '#ffffff');
      pasteIconTxt.setAttribute('width', 1.4);
      pasteIconTxt.setAttribute('position', '0 0 0.01');
      pasteIcon.appendChild(pasteIconTxt);
      const onPasteIconClick = () => (f.name === 'archivo' ? pickLocalVideoFile() : pasteIntoField(f.name));
      pasteIcon.addEventListener('click', onPasteIconClick);
      this._clickableEls.push({ el: pasteIcon, onClick: onPasteIconClick });
      el.appendChild(pasteIcon);

      this._fieldEls[f.name] = { plane: plane, text: valueTxt };
      y -= 0.32;
    });

    // Botón para buscar en YouTube con la sesión real del navegador del usuario (Requerimiento
    // 015, sección 5): pestaña nueva, no un iframe embebido, porque YouTube bloquea embeber el
    // sitio completo con X-Frame-Options. Sirve para encontrar el video antes de tener la URL;
    // el usuario la copia luego al campo "YouTube URL" de abajo.
    const searchBtn = document.createElement('a-plane');
    searchBtn.setAttribute('width', fieldRowW);
    searchBtn.setAttribute('height', 0.24);
    searchBtn.setAttribute('color', '#454545');
    searchBtn.setAttribute('class', 'clickable');
    searchBtn.setAttribute('position', `0 ${y - 0.02} 0.01`);
    const searchTxt = document.createElement('a-text');
    searchTxt.setAttribute('value', 'BUSCAR EN YOUTUBE');
    searchTxt.setAttribute('align', 'center');
    searchTxt.setAttribute('color', '#ffffff');
    searchTxt.setAttribute('width', 3.0);
    searchTxt.setAttribute('position', '0 0 0.01');
    searchBtn.appendChild(searchTxt);
    const onSearchClick = () => {
      const titulo = (this._values.titulo || '').trim();
      const autor = (this._values.autor || '').trim();
      const query = [titulo, autor].filter(Boolean).join(' ').trim();
      const url = query
        ? 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query)
        : 'https://www.youtube.com';
      try {
        window.open(url, '_blank', 'noopener');
      } catch (e) { /* ignore */ }
    };
    searchBtn.addEventListener('click', onSearchClick);
    this._clickableEls.push({ el: searchBtn, onClick: onSearchClick });
    el.appendChild(searchBtn);
    y -= 0.32;

    // Botón para previsualizar el YouTube URL (Opción B del Requerimiento 003 legacy, sección 4).
    //
    // Pedido del usuario (ampliación): dentro de AR-SYNC (mirror-fix), en vez de abrir su propio
    // panel flotante, activa el overlay real "Youtube Video" (mismo que aparece en el menú ⚙️ →
    // "Overlays") mandándole la URL — la URL ya viaja sola por `localStorage` (mismo puente de
    // campos de aframe-overlay-modules.js que sincroniza este panel entre los dos paneles
    // estéreo), así que acá solo hace falta pedirle al padre (`SyncStereoTestView.jsx`) que lo
    // seleccione si todavía no lo está (`activate-overlay`, ver ese archivo). `window.parent !==
    // window` detecta si este panel está embebido en un iframe (mirror-fix) o es la vista de
    // producción (`src/views/A-frame/index.html`, sin AR-SYNC) — ahí no existe ese overlay, así
    // que se mantiene el panel flotante propio de siempre (`_openPreviewOverlay`).
    const previewBtn = document.createElement('a-plane');
    previewBtn.setAttribute('width', fieldRowW);
    previewBtn.setAttribute('height', 0.24);
    previewBtn.setAttribute('color', '#454545');
    previewBtn.setAttribute('class', 'clickable');
    previewBtn.setAttribute('position', `0 ${y - 0.02} 0.01`);
    const previewTxt = document.createElement('a-text');
    previewTxt.setAttribute('value', 'PREVIEW ON YOUTUBE');
    previewTxt.setAttribute('align', 'center');
    previewTxt.setAttribute('color', '#ffffff');
    previewTxt.setAttribute('width', 3.0);
    previewTxt.setAttribute('position', '0 0 0.01');
    previewBtn.appendChild(previewTxt);
    const onPreviewClick = () => {
      const url = (this._values.youtubeUrl || '').trim();
      if (!url) return;
      const videoId = extractYoutubeVideoId(url);
      if (!videoId) {
        this._statusText.setAttribute('color', '#ff8888');
        this._statusText.setAttribute('value', 'No se reconoce el formato de esa URL de YouTube.');
        return;
      }
      if (window.parent && window.parent !== window) {
        try {
          window.parent.postMessage({ source: 'ars-sync-test', action: 'activate-overlay', key: 'youtubeVideo' }, '*');
        } catch (e) { /* ignore */ }
        this._statusText.setAttribute('color', '#aaffaa');
        this._statusText.setAttribute('value', 'Mostrando en el overlay "Youtube Video".');
        return;
      }
      if (isYoutubePlayerOpen()) {
        closeYoutubePlayer();
        return;
      }
      openYoutubePlayer(videoId, { object3D: this.el.object3D, sceneEl: this.el.sceneEl });
    };
    previewBtn.addEventListener('click', onPreviewClick);
    this._clickableEls.push({ el: previewBtn, onClick: onPreviewClick });
    el.appendChild(previewBtn);
    y -= 0.32;

    // Advertencia de derechos de autor (Requerimiento 003 legacy, sección 4.4)
    const warning = document.createElement('a-text');
    warning.setAttribute('value', 'Verifica que tienes derecho a usar este contenido antes de copiarlo a public/videos/karaoke/.');
    warning.setAttribute('align', 'left');
    warning.setAttribute('color', '#ffcc66');
    warning.setAttribute('width', planeW - 0.4);
    warning.setAttribute('wrap-count', '46');
    warning.setAttribute('scale', '0.55 0.55 1');
    warning.setAttribute('position', `-${fieldRowW / 2} ${y} 0.01`);
    el.appendChild(warning);
    y -= 0.32;

    // --- Teclado virtual ---
    const keyW = 0.27;
    const keyH = 0.22;
    const keyGap = 0.03;
    const keysPerRow = 10;
    const kbRowW = keysPerRow * keyW + (keysPerRow - 1) * keyGap;
    const kbStartX = -(kbRowW / 2) + (keyW / 2);

    // Crea un botón de tecla en (kx, ky) y lo registra para click nativo + raycast manual.
    const createKeyButton = (key, kx, ky, bgColor) => {
      const keyBtn = document.createElement('a-plane');
      keyBtn.setAttribute('width', keyW);
      keyBtn.setAttribute('height', keyH);
      keyBtn.setAttribute('color', bgColor || (key === 'CAPS' ? '#225577' : '#454545'));
      keyBtn.setAttribute('class', 'clickable');
      keyBtn.setAttribute('position', `${kx} ${ky} 0.01`);
      const keyTxt = document.createElement('a-text');
      keyTxt.setAttribute('value', key === 'CAPS' ? 'CAPS' : key.toUpperCase());
      keyTxt.setAttribute('align', 'center');
      keyTxt.setAttribute('color', '#ffffff');
      keyTxt.setAttribute('width', 3.2);
      keyTxt.setAttribute('position', '0 0 0.01');
      keyBtn.appendChild(keyTxt);
      const onKeyClick = () => this._handleKey(key, keyBtn);
      keyBtn.addEventListener('click', onKeyClick);
      this._clickableEls.push({ el: keyBtn, onClick: onKeyClick });
      el.appendChild(keyBtn);
      if (key === 'CAPS') this._capsKeyEl = keyBtn;
      return keyBtn;
    };

    KEY_ROWS.forEach((row) => {
      row.forEach((key, i) => {
        createKeyButton(key, kbStartX + i * (keyW + keyGap), y);
      });
      y -= (keyH + keyGap);
    });

    // Fila extra: ñ/á/é/í/ó/ú, centrada (son menos teclas que una fila completa)
    const accentRowW = ACCENT_KEYS.length * keyW + (ACCENT_KEYS.length - 1) * keyGap;
    const accentStartX = -(accentRowW / 2) + (keyW / 2);
    ACCENT_KEYS.forEach((key, i) => {
      createKeyButton(key, accentStartX + i * (keyW + keyGap), y, '#334455');
    });
    y -= (keyH + keyGap + 0.06);

    // Fila final: SPACE (ancha) + CLEAR
    const spaceW = kbRowW * 0.7;
    const clearW = kbRowW * 0.3 - keyGap;
    const spaceBtn = document.createElement('a-plane');
    spaceBtn.setAttribute('width', spaceW);
    spaceBtn.setAttribute('height', keyH);
    spaceBtn.setAttribute('color', '#454545');
    spaceBtn.setAttribute('class', 'clickable');
    spaceBtn.setAttribute('position', `${kbStartX - keyW / 2 + spaceW / 2} ${y} 0.01`);
    const spaceTxt = document.createElement('a-text');
    spaceTxt.setAttribute('value', 'SPACE');
    spaceTxt.setAttribute('align', 'center');
    spaceTxt.setAttribute('color', '#ffffff');
    spaceTxt.setAttribute('width', 3.0);
    spaceTxt.setAttribute('position', '0 0 0.01');
    spaceBtn.appendChild(spaceTxt);
    const onSpaceClick = () => this._handleKey('SPACE', spaceBtn);
    spaceBtn.addEventListener('click', onSpaceClick);
    this._clickableEls.push({ el: spaceBtn, onClick: onSpaceClick });
    el.appendChild(spaceBtn);

    const clearBtn = document.createElement('a-plane');
    clearBtn.setAttribute('width', clearW);
    clearBtn.setAttribute('height', keyH);
    clearBtn.setAttribute('color', '#772222');
    clearBtn.setAttribute('class', 'clickable');
    clearBtn.setAttribute('position', `${kbStartX - keyW / 2 + spaceW + keyGap + clearW / 2} ${y} 0.01`);
    const clearTxt = document.createElement('a-text');
    clearTxt.setAttribute('value', 'CLEAR');
    clearTxt.setAttribute('align', 'center');
    clearTxt.setAttribute('color', '#ffffff');
    clearTxt.setAttribute('width', 3.0);
    clearTxt.setAttribute('position', '0 0 0.01');
    clearBtn.appendChild(clearTxt);
    const onClearClick = () => this._handleKey('CLEAR', clearBtn);
    clearBtn.addEventListener('click', onClearClick);
    this._clickableEls.push({ el: clearBtn, onClick: onClearClick });
    el.appendChild(clearBtn);
    y -= (keyH + 0.1);

    // --- Botón Guardar y estado ---
    const submitBtn = document.createElement('a-plane');
    submitBtn.setAttribute('width', fieldRowW);
    submitBtn.setAttribute('height', 0.28);
    submitBtn.setAttribute('color', data.buttonColor);
    submitBtn.setAttribute('class', 'clickable');
    submitBtn.setAttribute('position', `0 ${y} 0.01`);
    const submitTxt = document.createElement('a-text');
    submitTxt.setAttribute('value', 'GUARDAR CANCION');
    submitTxt.setAttribute('align', 'center');
    submitTxt.setAttribute('color', '#ffffff');
    submitTxt.setAttribute('width', 3.0);
    submitTxt.setAttribute('position', '0 0 0.01');
    submitBtn.appendChild(submitTxt);
    const onSubmitClick = () => this._saveSong();
    submitBtn.addEventListener('click', onSubmitClick);
    this._clickableEls.push({ el: submitBtn, onClick: onSubmitClick });
    el.appendChild(submitBtn);
    this._submitBtn = submitBtn;
    y -= 0.26;

    const status = document.createElement('a-text');
    status.setAttribute('value', '');
    status.setAttribute('align', 'left');
    status.setAttribute('color', '#aaffaa');
    status.setAttribute('width', planeW - 0.4);
    status.setAttribute('wrap-count', '46');
    status.setAttribute('scale', '0.6 0.6 1');
    status.setAttribute('position', `-${fieldRowW / 2} ${y} 0.01`);
    el.appendChild(status);
    this._statusText = status;

    this._refreshFieldHighlight();

    // Raycast manual de mouse (clic exacto bajo el puntero), igual que VRKaraokeAf/VREvaluacionAf:
    // el <a-cursor> por defecto de index.html apunta al centro de la pantalla (gaze), no al mouse.
    try {
      const THREE = AFRAME.THREE;
      this._mouse = new THREE.Vector2();
      this._raycaster = new THREE.Raycaster();
      this._onPointerDown = (evt) => {
        try {
          const sceneEl = this.el.sceneEl;
          const canvas = sceneEl && sceneEl.canvas ? sceneEl.canvas : document.querySelector('canvas');
          if (!canvas || !sceneEl.camera) return;
          const ndc = getPointerNDC(canvas, evt.clientX, evt.clientY);
          this._mouse.set(ndc.x, ndc.y);
          this._raycaster.setFromCamera(this._mouse, sceneEl.camera);

          const meshes = [];
          const meshMap = new Map();
          (this._clickableEls || []).forEach((entry) => {
            if (!entry.el || !entry.el.object3D) return;
            entry.el.object3D.traverse((o) => {
              if (o.isMesh) { meshes.push(o); meshMap.set(o, entry); }
            });
          });
          if (!meshes.length) return;
          const intersects = this._raycaster.intersectObjects(meshes, true);
          if (intersects && intersects.length) {
            const entry = meshMap.get(intersects[0].object);
            if (entry) entry.onClick();
          }
        } catch (e) { /* ignore */ }
      };
      window.addEventListener('pointerdown', this._onPointerDown);
    } catch (e) { /* ignore */ }

    // Teclado físico: solo se captura mientras this._typingMode es true (ver
    // _setActiveField / _exitTypingMode). La cámara de la escena se mueve con las flechas
    // (componente `arrow-controls` en index.js), no con WASD, así que letras como W/A/S/D
    // llegan siempre al formulario sin mover nada.
    this._onKeyDown = (evt) => this._handlePhysicalKeyDown(evt);
    window.addEventListener('keydown', this._onKeyDown);
  },

  remove: function () {
    try { if (this._onPointerDown) window.removeEventListener('pointerdown', this._onPointerDown); } catch (e) {}
    try { if (this._onKeyDown) window.removeEventListener('keydown', this._onKeyDown); } catch (e) {}
    try { closeYoutubePlayer(); } catch (e) {}
    try { if (this._fileInput && this._fileInput.parentNode) this._fileInput.parentNode.removeChild(this._fileInput); } catch (e) {}
  },

  _handlePhysicalKeyDown: function (evt) {
    // Ignorar si el foco real del navegador está en un input/textarea de otra parte de la
    // página (no debería ocurrir en esta app, pero es una guarda barata).
    const activeTag = document.activeElement && document.activeElement.tagName;
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

    if (!this._typingMode) return;

    if (evt.key === 'Escape') {
      evt.preventDefault();
      this._exitTypingMode();
      return;
    }
    if (evt.key === 'Enter') {
      evt.preventDefault();
      this._saveSong();
      return;
    }
    if (evt.key === 'Tab') {
      evt.preventDefault();
      this._cycleField(evt.shiftKey ? -1 : 1);
      return;
    }
    if (evt.key === 'Backspace') {
      evt.preventDefault();
      this._handleKey('BKSP');
      return;
    }
    if (evt.key === ' ') {
      evt.preventDefault();
      this._handleKey('SPACE');
      return;
    }
    // Cualquier otra tecla imprimible de un solo carácter (letras, dígitos, ñ, acentos,
    // puntuación...). evt.key ya trae mayúsculas/minúsculas correctas según Shift.
    if (evt.key.length === 1) {
      evt.preventDefault();
      this._insertChar(evt.key);
    }
  },

  _cycleField: function (delta) {
    const names = FIELDS.map((f) => f.name);
    const idx = names.indexOf(this._activeField);
    const next = names[(idx + delta + names.length) % names.length];
    this._setActiveField(next);
  },

  _setActiveField: function (name) {
    this._activeField = name;
    this._typingMode = true;
    this._refreshFieldHighlight();
  },

  _exitTypingMode: function () {
    this._typingMode = false;
  },

  _refreshFieldHighlight: function () {
    Object.keys(this._fieldEls || {}).forEach((name) => {
      const active = (name === this._activeField);
      try { this._fieldEls[name].plane.setAttribute('color', active ? '#0008ff' : '#1a1a1a'); } catch (e) {}
    });
  },

  _refreshFieldText: function (name) {
    const entry = this._fieldEls[name];
    if (!entry) return;
    const v = this._values[name] || '';
    try { entry.text.setAttribute('value', v.length ? v : '...'); } catch (e) {}
  },

  _handleKey: function (key, keyEl) {
    const field = this._activeField;
    if (key === 'CAPS') {
      this._caps = !this._caps;
      try { keyEl.setAttribute('color', this._caps ? '#0008ff' : '#225577'); } catch (e) {}
      return;
    }
    if (key === 'CLEAR') {
      this._values[field] = '';
      this._refreshFieldText(field);
      return;
    }
    if (key === 'BKSP') {
      this._values[field] = (this._values[field] || '').slice(0, -1);
      this._refreshFieldText(field);
      return;
    }
    if (key === 'SPACE') {
      this._values[field] = (this._values[field] || '') + ' ';
      this._refreshFieldText(field);
      return;
    }
    const ch = this._caps ? key.toUpperCase() : key;
    this._values[field] = (this._values[field] || '') + ch;
    this._refreshFieldText(field);
  },

  // Inserta un carácter tal cual (usado por el teclado físico, que ya trae la mayúscula o
  // minúscula correcta según Shift, sin aplicar el CAPS del teclado virtual encima).
  _insertChar: function (ch) {
    const field = this._activeField;
    this._values[field] = (this._values[field] || '') + ch;
    this._refreshFieldText(field);
  },

  // Requerimiento 014: intenta persistir la canción en el backend NestJS (`POST /api/songs`); si
  // falla (sin sesión, red caída, backend apagado) cae al catálogo local (localStorage, ver
  // vrSongCatalog.util.js) para no perder lo que el usuario escribió. Si el backend rechaza por
  // duplicado (mismo título+autor ya registrado), NO cae al catálogo local — guardarla ahí también
  // volvería a chocar la próxima vez que el backend esté disponible. VRKaraokeAf escucha
  // `cancion-agregada` y refresca su lista en cualquiera de los dos casos.
  //
  // `archivo` (archivo local) y `youtubeUrl` son mutuamente excluyentes en cuanto a cuál llena
  // `fileName`. Tres fuentes posibles (Requerimiento 014, ampliación — antes eran solo dos):
  // - 'server': `archivo` es el nombre de un archivo ya copiado a mano a `public/videos/karaoke/`
  //   del servidor (significado ORIGINAL de lo que este mismo campo llamaba 'local').
  // - 'local': `archivo` empieza con `DEVICE_FILE_PREFIX` — es la clave bajo la que
  //   `pickLocalVideoFile` guardó el video en el `IndexedDB` de ESTE dispositivo (nunca sube al
  //   servidor); el backend igual se entera (guarda título/autor/`fileName`+`source:'local'` en
  //   `canciones_vr`, ligados a `id_usuario_cancion`) para que la canción aparezca en la lista de quien la
  //   agregó incluso si recarga la página — ver `GET /songs/mine`.
  // - 'youtube': `fileName` pasa a ser la URL completa (ver `fuente_cancion` en el backend).
  // El archivo local deja de ser obligatorio cuando ya hay una URL de YouTube cargada.
  _saveSong: function () {
    const titulo = (this._values.titulo || '').trim();
    const autor = (this._values.autor || '').trim();
    const archivo = (this._values.archivo || '').trim();
    const youtubeUrl = (this._values.youtubeUrl || '').trim();

    if (!titulo || (!archivo && !youtubeUrl)) {
      this._statusText.setAttribute('color', '#ff8888');
      this._statusText.setAttribute('value', 'Titulo y (Archivo local o YouTube URL) son obligatorios.');
      return;
    }

    const isDeviceFile = archivo.startsWith(DEVICE_FILE_PREFIX);
    const source = isDeviceFile ? 'local' : (archivo ? 'server' : 'youtube');
    const fileName = isDeviceFile ? archivo.slice(DEVICE_FILE_PREFIX.length) : (archivo || youtubeUrl);
    const song = { titulo, autor, archivo: fileName, source };

    this._statusText.setAttribute('color', '#aaffaa');
    this._statusText.setAttribute('value', 'Guardando...');

    createSong({ title: titulo, author: autor, fileName, source }).then((result) => {
      if (result.ok) {
        this._statusText.setAttribute('color', '#aaffaa');
        this._statusText.setAttribute('value', source === 'local'
          ? 'Cancion "' + titulo + '" guardada en este dispositivo.'
          : 'Cancion "' + titulo + '" guardada.');
      } else if (result.error === 'SONG_ALREADY_EXISTS') {
        this._statusText.setAttribute('color', '#ff8888');
        this._statusText.setAttribute('value', 'Ya existe una cancion con ese titulo y autor.');
        return;
      } else {
        addLocalSong(song);
        this._statusText.setAttribute('color', '#ffcc66');
        this._statusText.setAttribute('value', 'Cancion "' + titulo + '" guardada localmente (no se pudo sincronizar con el servidor).');
      }

      this._values = { titulo: '', autor: '', archivo: '', youtubeUrl: '' };
      Object.keys(this._fieldEls).forEach((n) => this._refreshFieldText(n));

      try { window.dispatchEvent(new CustomEvent('cancion-agregada', { detail: song })); } catch (e) { /* ignore */ }

      // Aviso no bloqueante si el archivo de video no parece existir en disco
      // (public/videos/karaoke/) — solo aplica a 'server' (un archivo 'local' vive en el
      // IndexedDB de este dispositivo, no ahí; una URL de YouTube tampoco vive ahí).
      if (source === 'server') {
        fetch('/videos/karaoke/' + encodeURIComponent(fileName), { method: 'HEAD' })
          .then((res) => {
            if (!res.ok) {
              this._statusText.setAttribute('value', this._statusText.getAttribute('value') + ' Aviso: no se encontro el archivo en public/videos/karaoke/.');
            }
          })
          .catch(() => { /* verificacion opcional */ });
      }
    });
  },
});
