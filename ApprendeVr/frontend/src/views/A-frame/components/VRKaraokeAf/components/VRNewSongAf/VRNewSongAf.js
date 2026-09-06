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
  { name: 'archivo', label: 'Archivo (en videos/karaoke/)' },
  { name: 'youtubeUrl', label: 'YouTube URL (opcional, Opcion B)' },
];

AFRAME.registerComponent('vr-new-song-af', {
  schema: {
    position: { type: 'string', default: '-9 5 0' },
    width: { type: 'number', default: 3.2 },
    height: { type: 'number', default: 5.15 },
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
    hint.setAttribute('value', 'Click en un campo y escribe con el teclado fisico o los botones. ESC suelta el teclado (camara con flechas).');
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
      plane.setAttribute('width', fieldRowW);
      plane.setAttribute('height', 0.22);
      plane.setAttribute('color', '#1a1a1a');
      plane.setAttribute('class', 'clickable');
      plane.setAttribute('position', `0 ${y - 0.05} 0.01`);
      el.appendChild(plane);

      const valueTxt = document.createElement('a-text');
      valueTxt.setAttribute('value', '');
      valueTxt.setAttribute('align', 'left');
      valueTxt.setAttribute('color', '#ffffff');
      valueTxt.setAttribute('width', fieldRowW - 0.1);
      valueTxt.setAttribute('wrap-count', '36');
      valueTxt.setAttribute('position', `-${fieldRowW / 2 - 0.05} ${y - 0.05} 0.02`);
      el.appendChild(valueTxt);

      const onClick = () => this._setActiveField(f.name);
      plane.addEventListener('click', onClick);
      this._clickableEls.push({ el: plane, onClick: onClick });

      this._fieldEls[f.name] = { plane: plane, text: valueTxt };
      y -= 0.32;
    });

    // Botón para previsualizar el YouTube URL (Opción B del Requerimiento 003 legacy, sección 4)
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
      try {
        window.open(url, '_blank', 'noopener');
      } catch (e) { /* ignore */ }
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

  // ApprendeVr no tiene todavía un backend de canciones (ver Requerimiento 009, "No incluido"):
  // la canción se guarda en el catálogo local (localStorage, ver vrSongCatalog.util.js) en vez de
  // enviarse a un endpoint. VRKaraokeAf escucha `cancion-agregada` y refresca su lista.
  _saveSong: function () {
    const titulo = (this._values.titulo || '').trim();
    const autor = (this._values.autor || '').trim();
    const archivo = (this._values.archivo || '').trim();

    if (!titulo || !archivo) {
      this._statusText.setAttribute('color', '#ff8888');
      this._statusText.setAttribute('value', 'Titulo y archivo son obligatorios.');
      return;
    }

    const song = { titulo, autor, archivo };
    addLocalSong(song);

    this._statusText.setAttribute('color', '#aaffaa');
    this._statusText.setAttribute('value', 'Cancion "' + titulo + '" guardada.');

    this._values = { titulo: '', autor: '', archivo: '', youtubeUrl: '' };
    Object.keys(this._fieldEls).forEach((n) => this._refreshFieldText(n));

    try { window.dispatchEvent(new CustomEvent('cancion-agregada', { detail: song })); } catch (e) { /* ignore */ }

    // Aviso no bloqueante si el archivo de video no parece existir en disco (public/videos/karaoke/)
    fetch('/videos/karaoke/' + encodeURIComponent(archivo), { method: 'HEAD' })
      .then((res) => {
        if (!res.ok) {
          this._statusText.setAttribute('value', this._statusText.getAttribute('value') + ' Aviso: no se encontro el archivo en public/videos/karaoke/.');
        }
      })
      .catch(() => { /* verificacion opcional */ });
  },
});
