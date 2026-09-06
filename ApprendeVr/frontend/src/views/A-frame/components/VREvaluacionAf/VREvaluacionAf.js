// Componente de evaluación de pronunciación/vocabulario para VR.
// Puerto de A-frame/english-vr/VR/componentes/evaluacion-vr/evaluacion-vr.js (Requerimiento 009).
//
// No se declara como entidad estática en index.html: VRKaraokeAf.js crea (o actualiza) este panel
// dinámicamente cuando el usuario pulsa "EVALUATE SONG" (ver evaluateSong() en VRKaraokeAf.js),
// igual que en el proyecto de origen.
import { fetchCurrentUser } from '../../vrAuth.util.js';
import { saveLocalEvaluation, getLocalEvaluations } from '../../vrEvaluationLog.util.js';
import { getPointerNDC } from '../../vrPointerRaycast.util.js';
import { createWidget, registerPositionWidgetClickables, registerNumericInput } from '../../vrPositionControl.js';
import { getUserSetting, saveUserSetting } from '../../vrUserSettingsApi.util.js';

const POSITION_VIEW = 'evaluation-panel';

AFRAME.registerComponent('vr-evaluacion-af', {
  schema: {
    songTitle: { type: 'string', default: '' },
    artist: { type: 'string', default: '' },
    phraseId: { type: 'int', default: 1 },
    width: { type: 'number', default: 3.2 },
    height: { type: 'number', default: 2.2 },
    position: { type: 'string', default: '-2 2.5 3' },
    visible: { type: 'boolean', default: true },
    // Fracción de respuestas correctas requerida para pasar el Nivel 2 (Pronunciación), ej. 0.8 = 80%
    passingThreshold: { type: 'number', default: 0.8 },
    // Intentos permitidos por palabra (Nivel 2 - Pronunciación) antes de avanzar a la siguiente
    pronMaxAttempts: { type: 'int', default: 2 },
  },

  init: function () {
    const el = this.el;
    const data = this.data;

    // El ajuste real de posición de spawn vive en `update()` (AFRAME la llama inmediatamente
    // después de `init()` en el primer attach — ver comentario en `update()`), así que acá solo
    // dejamos la posición cruda como punto de partida para evitar tener dos fórmulas
    // inconsistentes (hallazgo tardío: antes esta también ajustaba y+1/z-1, pero quedaba pisada
    // por la de `update()` sin que sus valores calzaran, ver problems_solutions.md).
    this._origPosition = data.position;
    this._adjustedPosition = data.position;
    el.setAttribute('position', data.position);
    el.setAttribute('visible', data.visible);

    // Fondo
    const bg = document.createElement('a-plane');
    bg.setAttribute('width', data.width);
    bg.setAttribute('height', data.height);
    bg.setAttribute('color', '#1e1e2f');
    bg.setAttribute('material', 'shader: flat; side: double;');
    bg.setAttribute('position', '0 0 0');
    el.appendChild(bg);

    // Título de la evaluación
    const title = document.createElement('a-text');
    title.setAttribute('value', 'EVALUATION');
    title.setAttribute('align', 'center');
    title.setAttribute('color', '#ffffff');
    title.setAttribute('width', data.width);
    title.setAttribute('position', `0 ${data.height / 2 - 0.25} 0.01`);
    title.setAttribute('wrap-count', '20');
    el.appendChild(title);

    // Nombre del usuario actual, centrado arriba del título
    const userTxt = document.createElement('a-text');
    userTxt.setAttribute('value', 'User: Guest (id: 0)');
    userTxt.setAttribute('align', 'center');
    userTxt.setAttribute('color', '#ccccff');
    userTxt.setAttribute('width', data.width - 0.4);
    userTxt.setAttribute('position', `0 ${data.height / 2 - 0.05} 0.01`);
    userTxt.setAttribute('wrap-count', '24');
    userTxt.setAttribute('scale', '0.75 0.75 1');
    el.appendChild(userTxt);
    this._userText = userTxt;

    fetchCurrentUser((user) => {
      const name = user.name || user.email || 'User';
      try { this._userText.setAttribute('value', `User: ${name} (id: ${user.id})`); } catch (e) {}
    });

    // Song title
    const st = document.createElement('a-text');
    st.setAttribute('value', data.songTitle || 'Sin título');
    st.setAttribute('align', 'left');
    st.setAttribute('color', '#ffd');
    st.setAttribute('width', data.width - 0.2);
    st.setAttribute('position', `-${data.width / 2 - 0.12} ${0.6} 0.01`);
    st.setAttribute('wrap-count', '30');
    el.appendChild(st);

    // Artist
    const ar = document.createElement('a-text');
    ar.setAttribute('value', data.artist || 'Artista desconocido');
    ar.setAttribute('align', 'left');
    ar.setAttribute('color', '#cfcfcf');
    ar.setAttribute('width', data.width - 0.2);
    ar.setAttribute('position', `-${data.width / 2 - 0.12} ${0.4} 0.01`);
    ar.setAttribute('wrap-count', '30');
    el.appendChild(ar);

    // Nivel de evaluación: se deriva del botón circular elegido (ver _selectNumber).
    // Botón 2 = Nivel 2 (Pronunciación); botones 1 y 3 = Nivel 1 (Vocabulario).
    this._selectedLevel = 1;

    // mensaje de instrucción
    const instr = document.createElement('a-text');
    instr.setAttribute('value', 'Select a Difficulty Rating (1-3):');
    instr.setAttribute('align', 'center');
    instr.setAttribute('color', '#ffffff');
    instr.setAttribute('width', data.width - 0.9);
    instr.setAttribute('position', `0 ${0.1} 0.01`);
    instr.setAttribute('wrap-count', '30');
    el.appendChild(instr);

    this._instr = instr;

    // Input numérico 1..3: tres botones horizontales
    const inputContainer = document.createElement('a-entity');
    inputContainer.setAttribute('position', `0 -0.25 0.01`);
    el.appendChild(inputContainer);

    this._inputContainer = inputContainer;

    this._numButtons = [];
    this._selected = null;
    for (let n = 1; n <= 3; n++) {
      const btn = document.createElement('a-circle');
      btn.setAttribute('radius', 0.18);
      btn.setAttribute('segments', 32);
      btn.setAttribute('color', '#666666');
      btn.setAttribute('class', 'clickable');
      btn.setAttribute('position', `${(n - 2) * 0.7} -0.2 0`);
      const txt = document.createElement('a-text');
      txt.setAttribute('value', String(n));
      txt.setAttribute('align', 'center');
      txt.setAttribute('color', '#ffffff');
      txt.setAttribute('width', 3.0);
      txt.setAttribute('position', '0 -0.0 0.02');
      btn.appendChild(txt);
      btn.addEventListener('click', () => {
        this._selectNumber(n);
      });
      inputContainer.appendChild(btn);
      this._numButtons.push(btn);
    }

    const inputLabel = document.createElement('a-text');
    inputLabel.setAttribute('value', '1:VOCAB, 2:WORDS, 3:PHRASES');
    inputLabel.setAttribute('align', 'center');
    inputLabel.setAttribute('color', '#ffffff');
    inputLabel.setAttribute('width', data.width - 0.9);
    inputLabel.setAttribute('position', `0 -0.10 0.01`);
    inputLabel.setAttribute('wrap-count', '30');
    el.appendChild(inputLabel);

    this._inputLabel = inputLabel;

    // Botón EVALUATE (confirmar)
    const evalBtn = document.createElement('a-plane');
    evalBtn.setAttribute('width', 1.0);
    evalBtn.setAttribute('height', 0.36);
    evalBtn.setAttribute('color', '#117711');
    evalBtn.setAttribute('class', 'clickable');
    evalBtn.setAttribute('position', `0 ${-data.height / 2 + 0.35} 0.01`);
    const evalText = document.createElement('a-text');
    evalText.setAttribute('value', 'EVALUATE');
    evalText.setAttribute('align', 'center');
    evalText.setAttribute('color', '#ffffff');
    evalText.setAttribute('width', 3.0);
    evalText.setAttribute('position', '0 0 0.02');
    evalBtn.appendChild(evalText);
    evalBtn.addEventListener('click', () => {
      // Requiere haber elegido uno de los botones circulares (1, 2 o 3)
      if (!this._selected) {
        const prev = evalBtn.getAttribute('color');
        evalBtn.setAttribute('color', '#aa2222');
        setTimeout(() => evalBtn.setAttribute('color', prev), 300);
        return;
      }
      // ApprendeVr no tiene todavía un backend de palabras/frases (Requerimiento 009, "No
      // incluido"): no hay `/api/palabras` ni `/api/frases`, así que esta llamada siempre falla
      // y se muestra "No words/phrases found" — comportamiento explícito, no un error silencioso.
      const payload = { rating: this._selected, level: this._selectedLevel, songTitle: data.songTitle, artist: data.artist };
      const authorParam = encodeURIComponent(data.artist || '');
      const archivoParam = encodeURIComponent(data.songTitle || '');
      const isPhraseLevel = (this._selectedLevel === 3);
      const endpoint = isPhraseLevel ? '/api/frases' : '/api/palabras';
      const url = `${endpoint}?archivo=${archivoParam}&author=${authorParam}`;
      const itemLabel = isPhraseLevel ? 'phrases' : 'words';

      this._clearWords();
      const loading = document.createElement('a-text');
      loading.setAttribute('value', `Loading ${itemLabel}...`);
      loading.setAttribute('align', 'left');
      loading.setAttribute('color', '#ffffcc');
      loading.setAttribute('width', data.width - 0.9);
      loading.setAttribute('position', `-${data.width / 2 - 0.12} ${-0.75} 0.01`);
      this._wordsContainer.appendChild(loading);
      console.log('Evaluate song requested for:', data.songTitle, data.artist, 'level:', this._selectedLevel);
      console.log('Fetching', itemLabel, 'from URL:', url);

      fetch(url)
        .then((r) => {
          console.log('Fetch response:', r.status, r.statusText);
          return r.json().then((json) => ({ status: r.status, ok: r.ok, json }));
        })
        .then(({ json }) => {
          console.log('Parsed API JSON:', json);
          if (this._wordsContainer && loading.parentNode === this._wordsContainer) {
            try { this._wordsContainer.removeChild(loading); } catch (e) {}
          }

          const items = json && (json.status === 'success' || !json.status)
            ? (isPhraseLevel ? (json.phrases || []) : (json.words || []))
            : [];

          if (!json || (json.status && json.status !== 'success') || !items.length) {
            console.warn(`API returned no ${itemLabel} or error:`, json);
            const err = document.createElement('a-text');
            err.setAttribute('value', `No ${itemLabel} found`);
            err.setAttribute('align', 'left');
            err.setAttribute('color', '#ffcccc');
            err.setAttribute('width', data.width - 0.9);
            err.setAttribute('position', `-${data.width / 2 - 0.12} ${-0.75} 0.01`);
            this._wordsContainer.appendChild(err);
            try { el.emit('submit-evaluation', payload); } catch (e) {}
            return;
          }

          const quizWords = isPhraseLevel
            ? items.map((p) => ({ esp: p.espanol_frase || '', ing: p.ingles_frase || '' }))
            : items.map((w) => ({ esp: w.esp_palabra || '', ing: w.ing_palabra || '' }));

          if (this._selectedLevel === 2 || this._selectedLevel === 3) {
            this._startPronunciation(quizWords, payload);
          } else {
            this._startQuiz(quizWords, payload);
          }
        })
        .catch((err) => {
          console.error(`Error fetching ${itemLabel}:`, err);
          if (this._wordsContainer && loading.parentNode === this._wordsContainer) {
            try { this._wordsContainer.removeChild(loading); } catch (e) {}
          }
          const eTxt = document.createElement('a-text');
          eTxt.setAttribute('value', `Error fetching ${itemLabel}`);
          eTxt.setAttribute('align', 'left');
          eTxt.setAttribute('color', '#ffaaaa');
          eTxt.setAttribute('width', data.width - 0.9);
          eTxt.setAttribute('position', `-${data.width / 2 - 0.12} ${-0.75} 0.01`);
          this._wordsContainer.appendChild(eTxt);
          try { el.emit('submit-evaluation', payload); } catch (e) {}
        });
    });
    el.appendChild(evalBtn);

    // Contenedor para mostrar evaluaciones previas (debajo del botón EVALUATE)
    this._evaluationsContainer = document.createElement('a-entity');
    this._evaluationsContainer.setAttribute('position', `0 ${-data.height / 2 - 0.5} 0.01`);
    el.appendChild(this._evaluationsContainer);

    this._loadPreviousEvaluations();

    // Close button
    const closeBtn = document.createElement('a-plane');
    closeBtn.setAttribute('width', 0.28);
    closeBtn.setAttribute('height', 0.18);
    closeBtn.setAttribute('color', '#aa2222');
    closeBtn.setAttribute('position', `${data.width / 2 - 0.18} ${data.height / 2 - 0.18} 0.01`);
    closeBtn.setAttribute('class', 'clickable');
    const closeText = document.createElement('a-text');
    closeText.setAttribute('value', 'X');
    closeText.setAttribute('align', 'center');
    closeText.setAttribute('color', '#fff');
    closeText.setAttribute('position', '0 0 0.02');
    closeBtn.appendChild(closeText);
    closeBtn.addEventListener('click', () => {
      try { if (el.parentNode) el.parentNode.removeChild(el); } catch (e) {}
    });
    el.appendChild(closeBtn);

    // Permitir clicks de mouse (sin cursor raycaster) en el botón de cerrar y demás controles,
    // haciendo un raycast manual desde la cámara usando las coordenadas del mouse.
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
          const meshMap = Object.create(null);

          if (this._closeBtn && this._closeBtn.object3D) {
            this._closeBtn.object3D.traverse((o) => {
              if (o.isMesh) {
                meshes.push(o);
                meshMap[o.uuid] = { type: 'close', el: this._closeBtn };
              }
            });
          }

          (this._numButtons || []).forEach((b, idx) => {
            try {
              if (b && b.object3D) {
                b.object3D.traverse((o) => {
                  if (o.isMesh) {
                    meshes.push(o);
                    meshMap[o.uuid] = { type: 'num', index: idx, el: b };
                  }
                });
              }
            } catch (e) {}
          });

          if (this._pronListenBtn && this._pronListenBtn.object3D) {
            this._pronListenBtn.object3D.traverse((o) => {
              if (o.isMesh) {
                meshes.push(o);
                meshMap[o.uuid] = { type: 'pron-listen', el: this._pronListenBtn };
              }
            });
          }

          if (this._scrollUpBtn && this._scrollUpBtn.object3D) {
            this._scrollUpBtn.object3D.traverse((o) => {
              if (o.isMesh) {
                meshes.push(o);
                meshMap[o.uuid] = { type: 'scroll-up', el: this._scrollUpBtn };
              }
            });
          }
          if (this._scrollDownBtn && this._scrollDownBtn.object3D) {
            this._scrollDownBtn.object3D.traverse((o) => {
              if (o.isMesh) {
                meshes.push(o);
                meshMap[o.uuid] = { type: 'scroll-down', el: this._scrollDownBtn };
              }
            });
          }

          (this._optionButtons || []).forEach((b, idx) => {
            try {
              if (b && b.object3D) {
                b.object3D.traverse((o) => {
                  if (o.isMesh) {
                    meshes.push(o);
                    meshMap[o.uuid] = { type: 'option', index: idx, el: b };
                  }
                });
              }
            } catch (e) {}
          });

          if (this._evalBtn && this._evalBtn.object3D) {
            this._evalBtn.object3D.traverse((o) => {
              if (o.isMesh) {
                meshes.push(o);
                meshMap[o.uuid] = { type: 'eval', el: this._evalBtn };
              }
            });
          }

          if (!meshes.length) return;
          const intersects = this._raycaster.intersectObjects(meshes, true);
          if (intersects && intersects.length) {
            const hit = intersects[0].object;
            const info = meshMap[hit.uuid];
            if (info) {
              if (info.type === 'close') {
                try { if (this.el.parentNode) this.el.parentNode.removeChild(this.el); } catch (e) {}
                return;
              }
              if (info.type === 'num') {
                try { this._selectNumber(info.index + 1); } catch (e) {}
                return;
              }
              if (info.type === 'pron-listen') {
                try { this._startListening(); } catch (e) {}
                return;
              }
              if (info.type === 'scroll-up') {
                try { this._scrollFailedList(-1); } catch (e) {}
                return;
              }
              if (info.type === 'scroll-down') {
                try { this._scrollFailedList(1); } catch (e) {}
                return;
              }
              if (info.type === 'option') {
                try {
                  info.el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                } catch (e) {
                  try { this._chooseOption && this._chooseOption(info.el && info.el.value, info.el); } catch (e) {}
                }
                return;
              }
              if (info.type === 'eval') {
                try {
                  info.el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                } catch (e) {
                  try { info.el.click && info.el.click(); } catch (e) {}
                }
                return;
              }
            }
          }
        } catch (e) { /* ignore */ }
      };
      window.addEventListener('pointerdown', this._onPointerDown);
    } catch (e) {}

    this._titleEl = title;
    this._songEl = st;
    this._artistEl = ar;
    this._bg = bg;
    this._closeBtn = closeBtn;
    this._evalBtn = evalBtn;
    this._inputLabel = this._inputLabel || null;
    this._inputContainer = this._inputContainer || null;
    this._instr = this._instr || null;
    this._wordsContainer = document.createElement('a-entity');
    this._wordsContainer.setAttribute('position', '0 0 0.01');
    el.appendChild(this._wordsContainer);

    // Control de posición (📍 + d-pad + GUARDAR), mismo mecanismo que video/karaoke/new-song
    // (Requerimiento 010) — anclado a la esquina superior izquierda del panel. Se crea una sola
    // vez acá en init(); el panel se reposiciona en cada `update()` (nueva canción evaluada), así
    // que la posición guardada se reaplica ahí también (ver `_applySavedPosition`).
    // Un poco más abajo que el borde superior del panel (no +0.3 como en video/karaoke/new-song):
    // acá arriba-izquierda queda cerca del botón "X" de cerrar (arriba-derecha, ver `closeBtn` más
    // abajo), y con el d-pad agrandado la flecha "^" llegaba a taparlo.
    const widgetOffset = [-(data.width / 2), data.height / 2 + 0.12, 0.05];
    const onMove = (dx, dy, dz) => {
      const pos = el.getAttribute('position');
      el.setAttribute('position', {
        x: +(pos.x + dx).toFixed(2),
        y: +(pos.y + dy).toFixed(2),
        z: +(pos.z + dz).toFixed(2),
      });
    };
    const onSave = () => {
      const pos = el.getAttribute('position');
      saveUserSetting(POSITION_VIEW, { position: [pos.x, pos.y, pos.z] });
    };
    this._positionWidget = createWidget(el, widgetOffset, onMove, onSave);
    registerPositionWidgetClickables(this._positionWidget.clickables);
    registerNumericInput(this._positionWidget.stepInput, this._positionWidget.dpad, this._positionWidget.inputAnchor);
    // No hace falta llamar `_applySavedPosition()` acá: A-Frame llama `update()` inmediatamente
    // después de `init()` en el primer attach, y `update()` ya la llama.
  },

  // Si el usuario ya guardó una posición para este panel, la aplica por encima de la calculada
  // en init()/update() (relativa a la cámara) — mismo criterio que video/karaoke/new-song: la
  // posición guardada gana sobre el default.
  _applySavedPosition: function () {
    getUserSetting(POSITION_VIEW).then((saved) => {
      if (saved && Array.isArray(saved.position) && saved.position.length === 3) {
        try {
          this.el.setAttribute('position', saved.position.join(' '));
          if (this._positionWidget) this._positionWidget.refreshCoordsLabel();
        } catch (e) {}
      }
    });
  },

  update: function () {
    try {
      if (this._songEl) this._songEl.setAttribute('value', this.data.songTitle || 'Sin título');
      if (this._artistEl) this._artistEl.setAttribute('value', this.data.artist || 'Artista desconocido');
      try {
        const posStr = this.data.position || this._origPosition || '0 0 0';
        const parts = ('' + posStr).trim().split(/\s+/);
        let adj = posStr;
        if (parts.length === 3) {
          const x = parseFloat(parts[0]) || 0;
          const y = parseFloat(parts[1]) || 0;
          const z = parseFloat(parts[2]) || 0;
          // y - 0.3 (además de z - 2, alejarlo un poco de la cámara): el panel spawnea a la
          // altura de los ojos de la cámara: sin este ajuste, el botón "X" de cerrar (arriba a la
          // derecha del panel) queda casi al límite superior del campo de visión y cuesta verlo.
          adj = `${x} ${y - 0.3} ${z - 2}`;
        }
        if (this.el) this.el.setAttribute('position', adj);
        this._adjustedPosition = adj;
      } catch (e) { /* ignore */ }
      if (this.el) this.el.setAttribute('visible', this.data.visible);
      this._applySavedPosition();
    } catch (e) {}
  },

  remove: function () {
    try {
      if (this._onPointerDown) window.removeEventListener('pointerdown', this._onPointerDown);
    } catch (e) {}
    try {
      if (this._recognition) { this._recognition.onresult = null; this._recognition.onerror = null; this._recognition.onend = null; this._recognition.abort(); }
    } catch (e) {}
    try { this._stopAudioMeter(); } catch (e) {}
  },

  // Maneja la selección del botón circular (1, 2 o 3). El botón 2 activa el Nivel 2
  // (pronunciación de palabras) y el 3 el Nivel 3 (pronunciación de frases); el botón 1
  // selecciona el Nivel 1 (Vocabulario).
  _selectNumber: function (n) {
    this._selected = n;
    (this._numButtons || []).forEach((btn, idx) => {
      try { btn.setAttribute('color', (idx === (n - 1)) ? '#ffcc00' : '#666666'); } catch (e) {}
    });
    this._selectLevel(n === 2 ? 2 : (n === 3 ? 3 : 1));
  },

  // Nivel de evaluación: 1 = Vocabulario (quiz de traducción), 2 = pronunciación de palabras,
  // 3 = pronunciación de frases.
  _selectLevel: function (n) {
    this._selectedLevel = n;
  },

  _startQuiz: function (words, payload) {
    this._quizWords = words || [];
    this._currentIndex = 0;
    this._payloadForSubmit = payload || {};
    this._awaitingAnswer = false;
    this._clearWords();
    try {
      const toHide = ['_titleEl', '_songEl', '_artistEl', '_instr', '_inputLabel', '_inputContainer', '_evalBtn'];
      toHide.forEach((k) => {
        try {
          const elRef = this[k];
          if (elRef) {
            if (Array.isArray(elRef)) {
              elRef.forEach((x) => { try { x.setAttribute('visible', false); } catch (e) {} });
            } else {
              try { elRef.setAttribute('visible', false); } catch (e) {}
            }
          }
        } catch (e) {}
      });
    } catch (e) {}

    this._renderQuestion();
  },

  _renderQuestion: function () {
    try {
      this._clearWords();
      if (!this._quizWords || !this._quizWords.length) {
        const noTxt = document.createElement('a-text');
        noTxt.setAttribute('value', 'No quiz words available');
        noTxt.setAttribute('align', 'left');
        noTxt.setAttribute('color', '#ffcccc');
        noTxt.setAttribute('width', this.data.width - 0.9);
        noTxt.setAttribute('position', `-${this.data.width / 2 - 0.12} ${-0.75} 0.01`);
        this._wordsContainer.appendChild(noTxt);
        return;
      }

      const idx = this._currentIndex || 0;
      const current = this._quizWords[idx];
      const eng = current.ing || '';
      const correctEsp = current.esp || '';

      const planeW = this.data.width;
      const planeH = this.data.height;
      const centerY = 0;
      const engY = centerY + (planeH * 0.18);
      const optionsY = centerY - (planeH * 0.06);
      const progY = centerY - (planeH * 0.22);

      const engTxt = document.createElement('a-text');
      engTxt.setAttribute('value', eng);
      engTxt.setAttribute('align', 'center');
      engTxt.setAttribute('color', '#ffffff');
      engTxt.setAttribute('width', Math.max(1.0, planeW - 0.6));
      engTxt.setAttribute('position', `0 ${engY} 0.01`);
      engTxt.setAttribute('wrap-count', '30');
      this._wordsContainer.appendChild(engTxt);

      const distractors = [];
      const pool = this._quizWords.map((w) => w.esp).filter((s, i) => i !== idx && s);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
      }
      if (pool.length >= 2) {
        distractors.push(pool[0], pool[1]);
      } else if (pool.length === 1) {
        distractors.push(pool[0]);
      }

      const options = [correctEsp].concat(distractors).slice(0, 3);
      while (options.length < 3) options.push('');

      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = options[i]; options[i] = options[j]; options[j] = tmp;
      }

      this._optionButtons = [];
      const optW = 1.0;
      const optGap = 0.12;
      const totalW = options.length * optW + (options.length - 1) * optGap;
      const startX = -(totalW / 2) + (optW / 2);
      options.forEach((opt, i) => {
        const btn = document.createElement('a-plane');
        btn.setAttribute('width', optW);
        btn.setAttribute('height', 0.32);
        btn.setAttribute('color', '#333333');
        btn.setAttribute('class', 'clickable');
        const x = startX + i * (optW + optGap);
        btn.setAttribute('position', `${x} ${optionsY} 0.01`);
        btn.setAttribute('material', 'shader: flat');

        const txt = document.createElement('a-text');
        txt.setAttribute('value', opt || '—');
        txt.setAttribute('align', 'center');
        txt.setAttribute('color', '#ffffff');
        txt.setAttribute('width', 2.2);
        txt.setAttribute('position', '0 0 0.02');
        btn.appendChild(txt);

        btn.addEventListener('click', (evt) => {
          if (this._awaitingAnswer) return;
          this._chooseOption(opt, evt.currentTarget);
        });

        this._wordsContainer.appendChild(btn);
        try { this._optionButtons.push(btn); } catch (e) {}
      });

      const prog = document.createElement('a-text');
      prog.setAttribute('value', `Word ${idx + 1} / ${this._quizWords.length}`);
      prog.setAttribute('align', 'center');
      prog.setAttribute('color', '#cfcfcf');
      prog.setAttribute('width', Math.max(1.0, planeW - 0.9));
      prog.setAttribute('position', `0 ${progY} 0.01`);
      this._wordsContainer.appendChild(prog);

      this._awaitingAnswer = false;
    } catch (e) { console.warn('Render question error', e); }
  },

  _chooseOption: function (option, btnEl) {
    try {
      if (this._awaitingAnswer) return;
      this._awaitingAnswer = true;
      const idx = this._currentIndex || 0;
      const correct = (this._quizWords && this._quizWords[idx]) ? this._quizWords[idx].esp : '';
      if (option === correct) {
        try { btnEl.setAttribute('color', '#118811'); } catch (e) {}
        setTimeout(() => {
          this._currentIndex = idx + 1;
          if (this._currentIndex >= this._quizWords.length) {
            const payload = this._payloadForSubmit || {};
            payload.words = this._quizWords;
            payload.archivo = this.data.songTitle || '';
            console.log('Quiz complete — emitting submit-evaluation with payload:', payload);
            try { this.el.emit('submit-evaluation', payload); } catch (e) {}

            try { this._saveEvaluation({ archivo: payload.archivo, total: this._quizWords.length, nota_evaluacion: '', terminado: 1, nivel: 1 }); } catch (e) {}

            this._clearWords();
            const done = document.createElement('a-text');
            done.setAttribute('value', 'All correct! Evaluation submitted.');
            done.setAttribute('align', 'center');
            done.setAttribute('color', '#aaffaa');
            done.setAttribute('width', this.data.width - 0.9);
            done.setAttribute('position', `0 ${-0.75} 0.01`);
            this._wordsContainer.appendChild(done);
            this._awaitingAnswer = false;
            return;
          }
          this._renderQuestion();
        }, 350);
      } else {
        try { btnEl.setAttribute('color', '#aa2222'); } catch (e) {}
        setTimeout(() => {
          this._currentIndex = 0;
          this._clearWords();
          const fail = document.createElement('a-text');
          fail.setAttribute('value', 'Incorrect — restarting from first word');
          fail.setAttribute('align', 'center');
          fail.setAttribute('color', '#ffaaaa');
          fail.setAttribute('width', this.data.width - 0.9);
          fail.setAttribute('position', `0 ${-0.75} 0.01`);
          this._wordsContainer.appendChild(fail);
          try { this._saveEvaluation({ archivo: this.data.songTitle || '', total: idx, nota_evaluacion: option, terminado: 0, nivel: 1 }); } catch (e) {}
          setTimeout(() => this._renderQuestion(), 800);
        }, 350);
      }
    } catch (e) { console.warn('Choose option error', e); this._awaitingAnswer = false; }
  },

  _clearWords: function () {
    try {
      while (this._wordsContainer && this._wordsContainer.firstChild) {
        this._wordsContainer.removeChild(this._wordsContainer.firstChild);
      }
      try { this._optionButtons = []; } catch (e) {}
      try { this._pronListenBtn = null; this._pronListenTxt = null; this._pronFeedback = null; } catch (e) {}
      try { this._stopAudioMeter(); this._meterBars = []; this._meterContainer = null; } catch (e) {}
    } catch (e) {}
  },

  // ---------------------------------------------------------------
  // Nivel 2/3: Evaluación de pronunciación
  // ---------------------------------------------------------------

  // Crea (o recrea) el panel lateral derecho que lista en vivo las palabras falladas del Nivel
  // 2/3 (la más reciente arriba) y su contador. Cada línea es una entidad <a-text> propia con una
  // posición Y fija (en vez de un único bloque multilínea): así ninguna línea se recalcula ni se
  // desplaza al cambiar el contenido. Cuando hay más palabras que espacios visibles, aparecen
  // botones de scroll (▲/▼) para recorrer la lista completa.
  _createFailedSidebar: function () {
    try { if (this._failedSidebar && this._failedSidebar.parentNode) this._failedSidebar.parentNode.removeChild(this._failedSidebar); } catch (e) {}

    const planeW = this.data.width;
    const planeH = this.data.height;
    const sidebarW = 1.6;
    const gap = 0.15;

    const sidebar = document.createElement('a-entity');
    sidebar.setAttribute('position', `${planeW / 2 + gap + sidebarW / 2} 0 0.01`);
    this.el.appendChild(sidebar);

    const bg = document.createElement('a-plane');
    bg.setAttribute('width', sidebarW);
    bg.setAttribute('height', planeH);
    bg.setAttribute('color', '#2a1620');
    bg.setAttribute('material', 'shader: flat; side: double;');
    sidebar.appendChild(bg);

    const counter = document.createElement('a-text');
    counter.setAttribute('align', 'center');
    counter.setAttribute('color', '#ff8888');
    counter.setAttribute('width', sidebarW - 0.1);
    counter.setAttribute('position', `0 ${planeH / 2 - 0.22} 0.01`);
    counter.setAttribute('wrap-count', '18');
    sidebar.appendChild(counter);
    this._failedCounterTxt = counter;

    const listTopY = planeH / 2 - 0.45;
    const listBottomY = -planeH / 2 + 0.42;
    const lineH = 0.2;
    const maxVisible = Math.max(1, Math.floor((listTopY - listBottomY) / lineH) + 1);
    this._failedMaxVisible = maxVisible;
    this._failedListScroll = 0;

    this._failedLineEls = [];
    for (let i = 0; i < maxVisible; i++) {
      const line = document.createElement('a-text');
      line.setAttribute('align', 'left');
      line.setAttribute('baseline', 'top');
      line.setAttribute('color', '#ffdddd');
      line.setAttribute('width', sidebarW - 0.1);
      line.setAttribute('position', `-${sidebarW / 2 - 0.1} ${listTopY - i * lineH} 0.02`);
      line.setAttribute('wrap-count', '20');
      line.setAttribute('scale', '0.65 0.65 1');
      sidebar.appendChild(line);
      this._failedLineEls.push(line);
    }

    const scrollY = -planeH / 2 + 0.18;
    const btnUp = document.createElement('a-plane');
    btnUp.setAttribute('width', 0.32);
    btnUp.setAttribute('height', 0.2);
    btnUp.setAttribute('color', '#553333');
    btnUp.setAttribute('class', 'clickable');
    btnUp.setAttribute('position', `-0.28 ${scrollY} 0.02`);
    btnUp.setAttribute('visible', false);
    const btnUpTxt = document.createElement('a-text');
    btnUpTxt.setAttribute('value', '^');
    btnUpTxt.setAttribute('align', 'center');
    btnUpTxt.setAttribute('color', '#ffffff');
    btnUpTxt.setAttribute('width', 3.0);
    btnUpTxt.setAttribute('position', '0 0 0.01');
    btnUp.appendChild(btnUpTxt);
    btnUp.addEventListener('click', () => this._scrollFailedList(-1));
    sidebar.appendChild(btnUp);
    this._scrollUpBtn = btnUp;

    const btnDown = document.createElement('a-plane');
    btnDown.setAttribute('width', 0.32);
    btnDown.setAttribute('height', 0.2);
    btnDown.setAttribute('color', '#553333');
    btnDown.setAttribute('class', 'clickable');
    btnDown.setAttribute('position', `0.28 ${scrollY} 0.02`);
    btnDown.setAttribute('visible', false);
    const btnDownTxt = document.createElement('a-text');
    btnDownTxt.setAttribute('value', 'v');
    btnDownTxt.setAttribute('align', 'center');
    btnDownTxt.setAttribute('color', '#ffffff');
    btnDownTxt.setAttribute('width', 3.0);
    btnDownTxt.setAttribute('position', '0 0 0.01');
    btnDown.appendChild(btnDownTxt);
    btnDown.addEventListener('click', () => this._scrollFailedList(1));
    sidebar.appendChild(btnDown);
    this._scrollDownBtn = btnDown;

    const scrollInd = document.createElement('a-text');
    scrollInd.setAttribute('align', 'center');
    scrollInd.setAttribute('color', '#cc9999');
    scrollInd.setAttribute('width', sidebarW - 0.1);
    scrollInd.setAttribute('position', `0 ${scrollY - 0.16} 0.02`);
    scrollInd.setAttribute('wrap-count', '20');
    scrollInd.setAttribute('scale', '0.6 0.6 1');
    sidebar.appendChild(scrollInd);
    this._failedScrollIndTxt = scrollInd;

    this._failedSidebar = sidebar;
    this._updateFailedSidebar();
  },

  _scrollFailedList: function (delta) {
    try {
      const total = (this._pronFailedList || []).length;
      const maxVisible = this._failedMaxVisible || 1;
      const maxScroll = Math.max(0, total - maxVisible);
      const next = Math.min(maxScroll, Math.max(0, (this._failedListScroll || 0) + delta));
      this._failedListScroll = next;
      this._updateFailedSidebar();
    } catch (e) {}
  },

  _updateFailedSidebar: function () {
    try {
      const words = this._pronFailedList || [];
      const maxVisible = this._failedMaxVisible || (this._failedLineEls || []).length || 1;
      if (this._failedCounterTxt) this._failedCounterTxt.setAttribute('value', `Errors: ${words.length}`);

      const maxScroll = Math.max(0, words.length - maxVisible);
      this._failedListScroll = Math.min(Math.max(0, this._failedListScroll || 0), maxScroll);
      const start = this._failedListScroll;

      (this._failedLineEls || []).forEach((lineEl, i) => {
        const w = words[start + i];
        try { lineEl.setAttribute('value', w ? `${start + i + 1}. ${w.ing} -> ${w.transcript || '?'}` : ''); } catch (e) {}
      });

      const canScroll = words.length > maxVisible;
      try { if (this._scrollUpBtn) this._scrollUpBtn.setAttribute('visible', canScroll); } catch (e) {}
      try { if (this._scrollDownBtn) this._scrollDownBtn.setAttribute('visible', canScroll); } catch (e) {}
      try {
        if (this._failedScrollIndTxt) {
          this._failedScrollIndTxt.setAttribute('value', canScroll ? `${start + 1}-${Math.min(start + maxVisible, words.length)} / ${words.length}` : '');
        }
      } catch (e) {}
    } catch (e) {}
  },

  _startPronunciation: function (words, payload) {
    this._pronWords = words || [];
    this._pronIndex = 0;
    this._pronResults = [];
    this._pronFailedList = [];
    this._payloadForSubmit = payload || {};
    this._awaitingPronResult = false;
    this._clearWords();
    this._createFailedSidebar();

    try {
      const toHide = ['_titleEl', '_songEl', '_artistEl', '_instr', '_inputLabel', '_inputContainer', '_evalBtn'];
      toHide.forEach((k) => {
        try {
          const elRef = this[k];
          if (elRef) {
            if (Array.isArray(elRef)) {
              elRef.forEach((x) => { try { x.setAttribute('visible', false); } catch (e) {} });
            } else {
              try { elRef.setAttribute('visible', false); } catch (e) {}
            }
          }
        } catch (e) {}
      });
    } catch (e) {}

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      const err = document.createElement('a-text');
      err.setAttribute('value', 'Speech recognition is not supported in this browser.\nPlease use Chrome or Edge.');
      err.setAttribute('align', 'center');
      err.setAttribute('color', '#ffaaaa');
      err.setAttribute('width', this.data.width - 0.6);
      err.setAttribute('position', '0 0 0.01');
      err.setAttribute('wrap-count', '26');
      this._wordsContainer.appendChild(err);
      return;
    }

    this._renderPronunciation();
  },

  _renderPronunciation: function () {
    try {
      this._clearWords();

      if (!this._pronWords || !this._pronWords.length) {
        const noTxt = document.createElement('a-text');
        noTxt.setAttribute('value', 'No content available for pronunciation');
        noTxt.setAttribute('align', 'left');
        noTxt.setAttribute('color', '#ffcccc');
        noTxt.setAttribute('width', this.data.width - 0.9);
        noTxt.setAttribute('position', `-${this.data.width / 2 - 0.12} ${-0.75} 0.01`);
        this._wordsContainer.appendChild(noTxt);
        return;
      }

      const idx = this._pronIndex || 0;
      if (idx >= this._pronWords.length) {
        this._finishPronunciation();
        return;
      }

      this._pronAttempts = 0;

      const current = this._pronWords[idx];
      const planeW = this.data.width;
      const planeH = this.data.height;
      const isPhrase = (this._selectedLevel === 3);
      const phraseGap = isPhrase ? planeH * 0.12 : 0;
      const engY = planeH * 0.18;
      const instrY = planeH * 0.03 - phraseGap;
      const listenY = -planeH * 0.05 - phraseGap;
      const meterY = -planeH * 0.20 - phraseGap;
      const feedbackY = -planeH * 0.30 - phraseGap;
      const progY = -planeH * 0.37 - phraseGap;

      const engTxt = document.createElement('a-text');
      engTxt.setAttribute('value', current.ing || '');
      engTxt.setAttribute('align', 'center');
      if (isPhrase) engTxt.setAttribute('baseline', 'top');
      engTxt.setAttribute('color', '#ffffff');
      engTxt.setAttribute('width', Math.max(1.0, planeW - 0.6));
      engTxt.setAttribute('position', `0 ${engY} 0.01`);
      engTxt.setAttribute('wrap-count', isPhrase ? '32' : '30');
      if (isPhrase) engTxt.setAttribute('scale', '0.75 0.75 1');
      this._wordsContainer.appendChild(engTxt);

      const instrTxt = document.createElement('a-text');
      instrTxt.setAttribute('value', isPhrase ? 'Say the phrase in English' : 'Say the word in English');
      instrTxt.setAttribute('align', 'center');
      instrTxt.setAttribute('color', '#cfcfcf');
      instrTxt.setAttribute('width', Math.max(1.0, planeW - 0.9));
      instrTxt.setAttribute('position', `0 ${instrY} 0.01`);
      instrTxt.setAttribute('wrap-count', '30');
      this._wordsContainer.appendChild(instrTxt);

      const listenBtn = document.createElement('a-plane');
      listenBtn.setAttribute('width', 1.2);
      listenBtn.setAttribute('height', 0.34);
      listenBtn.setAttribute('color', '#225577');
      listenBtn.setAttribute('class', 'clickable');
      listenBtn.setAttribute('position', `0 ${listenY} 0.01`);
      const listenTxt = document.createElement('a-text');
      listenTxt.setAttribute('value', 'LISTEN');
      listenTxt.setAttribute('align', 'center');
      listenTxt.setAttribute('color', '#ffffff');
      listenTxt.setAttribute('width', 3.0);
      listenTxt.setAttribute('position', '0 0 0.02');
      listenBtn.appendChild(listenTxt);
      listenBtn.addEventListener('click', () => this._startListening());
      this._wordsContainer.appendChild(listenBtn);
      this._pronListenBtn = listenBtn;
      this._pronListenTxt = listenTxt;

      this._meterMinHeight = 0.03;
      this._meterMaxHeight = 0.16;
      const meterContainer = document.createElement('a-entity');
      meterContainer.setAttribute('position', `0 ${meterY} 0.01`);
      this._wordsContainer.appendChild(meterContainer);
      this._meterBars = [];
      const barCount = 9;
      const barW = 0.09;
      const barGap = 0.025;
      const totalBarsW = barCount * barW + (barCount - 1) * barGap;
      const barsStartX = -(totalBarsW / 2) + (barW / 2);
      for (let bi = 0; bi < barCount; bi++) {
        const bar = document.createElement('a-plane');
        const bx = barsStartX + bi * (barW + barGap);
        bar.setAttribute('width', barW);
        bar.setAttribute('height', this._meterMinHeight);
        bar.setAttribute('color', '#335577');
        bar.setAttribute('material', 'shader: flat; side: double;');
        bar.setAttribute('position', `${bx} ${this._meterMinHeight / 2} 0`);
        bar._baseX = bx;
        meterContainer.appendChild(bar);
        this._meterBars.push(bar);
      }
      this._meterContainer = meterContainer;

      const feedback = document.createElement('a-text');
      feedback.setAttribute('value', '');
      feedback.setAttribute('align', 'center');
      feedback.setAttribute('color', '#ffffff');
      feedback.setAttribute('width', Math.max(1.0, planeW - 0.9));
      feedback.setAttribute('position', `0 ${feedbackY} 0.01`);
      feedback.setAttribute('wrap-count', '30');
      this._wordsContainer.appendChild(feedback);
      this._pronFeedback = feedback;

      const prog = document.createElement('a-text');
      prog.setAttribute('value', `Word ${idx + 1} / ${this._pronWords.length}`);
      prog.setAttribute('align', 'center');
      prog.setAttribute('color', '#888888');
      prog.setAttribute('width', Math.max(1.0, planeW - 0.9));
      prog.setAttribute('position', `0 ${progY} 0.01`);
      this._wordsContainer.appendChild(prog);

      this._awaitingPronResult = false;
    } catch (e) { console.warn('Render pronunciation error', e); }
  },

  _showPronFeedback: function (text, color) {
    try {
      if (this._pronFeedback) {
        this._pronFeedback.setAttribute('value', text || '');
        this._pronFeedback.setAttribute('color', color || '#ffffff');
      }
    } catch (e) {}
  },

  // Abre el micrófono (independiente de SpeechRecognition) y anima las barras del ecualizador a
  // partir de datos de frecuencia en vivo, para dar confirmación visual de que el mic capta sonido.
  _startAudioMeter: function () {
    try {
      this._stopAudioMeter();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        this._micStream = stream;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) { this._stopAudioMeter(); return; }
        this._audioCtx = new AudioCtx();
        const source = this._audioCtx.createMediaStreamSource(stream);
        const analyser = this._audioCtx.createAnalyser();
        analyser.fftSize = 32;
        analyser.smoothingTimeConstant = 0.6;
        source.connect(analyser);
        this._analyser = analyser;
        this._analyserData = new Uint8Array(analyser.frequencyBinCount);

        this._meterInterval = setInterval(() => {
          const bars = this._meterBars;
          if (!this._analyser || !bars || !bars.length) return;
          this._analyser.getByteFrequencyData(this._analyserData);
          for (let i = 0; i < bars.length; i++) {
            const dataIdx = Math.floor((i / bars.length) * this._analyserData.length);
            const v = this._analyserData[dataIdx] / 255;
            const h = this._meterMinHeight + v * (this._meterMaxHeight - this._meterMinHeight);
            try {
              bars[i].setAttribute('height', h.toFixed(3));
              bars[i].setAttribute('position', `${bars[i]._baseX} ${(h / 2).toFixed(3)} 0`);
              bars[i].setAttribute('color', v > 0.66 ? '#ff4444' : (v > 0.33 ? '#ffcc33' : '#33cc66'));
            } catch (e) {}
          }
        }, 60);
      }).catch((err) => {
        console.warn('Audio meter: microphone unavailable', err);
      });
    } catch (e) { console.warn('startAudioMeter error', e); }
  },

  _stopAudioMeter: function () {
    try {
      if (this._meterInterval) { clearInterval(this._meterInterval); this._meterInterval = null; }
      if (this._micStream) { this._micStream.getTracks().forEach((t) => { try { t.stop(); } catch (e) {} }); this._micStream = null; }
      if (this._audioCtx) { try { this._audioCtx.close(); } catch (e) {} this._audioCtx = null; }
      this._analyser = null;
      this._analyserData = null;
      (this._meterBars || []).forEach((b) => {
        try {
          b.setAttribute('height', this._meterMinHeight || 0.02);
          b.setAttribute('position', `${b._baseX} ${(this._meterMinHeight || 0.02) / 2} 0`);
          b.setAttribute('color', '#335577');
        } catch (e) {}
      });
    } catch (e) {}
  },

  _startListening: function () {
    try {
      if (this._awaitingPronResult) return;
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        this._showPronFeedback('Speech recognition not supported in this browser', '#ffaaaa');
        return;
      }
      if (this._recognition) {
        try { this._recognition.onresult = null; this._recognition.onerror = null; this._recognition.onend = null; this._recognition.abort(); } catch (e) {}
        this._recognition = null;
      }

      const recognition = new SR();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      this._recognition = recognition;

      try { this._pronListenTxt.setAttribute('value', 'LISTENING...'); } catch (e) {}
      try { this._pronListenBtn.setAttribute('color', '#337799'); } catch (e) {}
      this._showPronFeedback('', '#ffffff');
      this._startAudioMeter();

      recognition.onresult = (event) => {
        const transcript = (event.results && event.results[0] && event.results[0][0]) ? event.results[0][0].transcript : '';
        this._handlePronunciationResult(transcript);
      };
      recognition.onerror = (event) => {
        const err = event && event.error;
        if (err === 'not-allowed' || err === 'permission-denied') {
          this._showPronFeedback('Microphone access denied. Enable it in your browser settings.', '#ffaaaa');
        } else if (err === 'no-speech') {
          this._showPronFeedback('No speech detected. Press LISTEN and try again.', '#ffddaa');
        } else {
          this._showPronFeedback('Speech recognition error: ' + (err || 'unknown'), '#ffaaaa');
        }
        try { this._pronListenTxt.setAttribute('value', 'LISTEN'); } catch (e) {}
        try { this._pronListenBtn.setAttribute('color', '#225577'); } catch (e) {}
        this._stopAudioMeter();
      };
      recognition.onend = () => {
        try { if (this._pronListenTxt) this._pronListenTxt.setAttribute('value', 'LISTEN'); } catch (e) {}
        try { if (this._pronListenBtn) this._pronListenBtn.setAttribute('color', '#225577'); } catch (e) {}
        this._stopAudioMeter();
      };
      recognition.start();
    } catch (e) {
      console.warn('startListening error', e);
      this._showPronFeedback('Unable to start speech recognition', '#ffaaaa');
      this._stopAudioMeter();
    }
  },

  // Normaliza texto para comparación de pronunciación (minúsculas, sin puntuación/contracciones,
  // espacios colapsados).
  _normalize: function (text) {
    if (!text) return '';
    let t = String(text).toLowerCase();
    t = t.replace(/[‘’]/g, "'");
    t = t.replace(/'/g, '');
    t = t.replace(/[^a-z0-9\s]/g, ' ');
    t = t.replace(/_/g, ' ');
    t = t.replace(/\s+/g, ' ').trim();
    const spokenMap = { gonna: 'going to', wanna: 'want to' };
    if (spokenMap[t]) t = spokenMap[t];
    return t;
  },

  // Compara la transcripción reconocida contra la palabra esperada (comparación tolerante: la
  // transcripción puede contener palabras extra). Reintenta la misma palabra hasta
  // `pronMaxAttempts` veces antes de avanzar a la siguiente.
  _handlePronunciationResult: function (transcript) {
    try {
      if (this._awaitingPronResult) return;
      this._awaitingPronResult = true;

      const idx = this._pronIndex || 0;
      const current = this._pronWords[idx] || {};
      const normTranscript = this._normalize(transcript);
      const normExpected = this._normalize(current.ing);
      const correct = !!(normExpected && normTranscript && normTranscript.includes(normExpected));

      this._pronResults = this._pronResults || [];
      const maxAttempts = (typeof this.data.pronMaxAttempts === 'number' && this.data.pronMaxAttempts > 0) ? this.data.pronMaxAttempts : 2;

      if (correct) {
        this._pronResults.push({ ing: current.ing || '', esp: current.esp || '', correct: true, transcript: transcript || '' });
        this._showPronFeedback(`Correct! (heard: "${transcript}")`, '#aaffaa');
        setTimeout(() => {
          this._pronIndex = idx + 1;
          this._awaitingPronResult = false;
          this._renderPronunciation();
        }, 900);
        return;
      }

      this._pronAttempts = (this._pronAttempts || 0) + 1;
      if (this._pronAttempts < maxAttempts) {
        this._showPronFeedback(`Incorrect (heard: "${transcript || '...'}") — try again (${this._pronAttempts}/${maxAttempts})`, '#ffddaa');
        this._awaitingPronResult = false;
        return;
      }

      this._pronResults.push({ ing: current.ing || '', esp: current.esp || '', correct: false, transcript: transcript || '' });
      this._pronFailedList = this._pronFailedList || [];
      this._pronFailedList.unshift({ ing: current.ing || '', transcript: transcript || '' });
      this._failedListScroll = 0;
      this._updateFailedSidebar();
      this._showPronFeedback(`Incorrect (heard: "${transcript || '...'}")`, '#ffaaaa');
      setTimeout(() => {
        this._pronIndex = idx + 1;
        this._awaitingPronResult = false;
        this._renderPronunciation();
      }, 900);
    } catch (e) {
      console.warn('handlePronunciationResult error', e);
      this._awaitingPronResult = false;
    }
  },

  // Muestra el puntaje final, si pasó/falló contra passingThreshold, y la lista de palabras mal
  // pronunciadas.
  _finishPronunciation: function () {
    try {
      const results = this._pronResults || [];
      const total = results.length;
      const correctCount = results.filter((r) => r.correct).length;
      const percentage = total ? (correctCount / total) : 0;
      const threshold = (typeof this.data.passingThreshold === 'number') ? this.data.passingThreshold : 0.8;
      const passed = percentage >= threshold;
      const failedWords = results.filter((r) => !r.correct).map((r) => r.ing).filter(Boolean);
      const failedPairs = this._pronFailedList || [];

      const payload = this._payloadForSubmit || {};
      payload.words = this._pronWords;
      payload.archivo = this.data.songTitle || '';
      payload.level = this._selectedLevel;
      payload.correctCount = correctCount;
      payload.total = total;
      payload.percentage = percentage;
      payload.passed = passed;
      payload.failedWords = failedWords;

      console.log('Pronunciation evaluation complete — emitting submit-evaluation with payload:', payload);
      try { this.el.emit('submit-evaluation', payload); } catch (e) {}

      try {
        this._saveEvaluation({
          archivo: payload.archivo,
          total: correctCount,
          nota_evaluacion: failedPairs.length ? failedPairs.map((w) => `${w.ing}->${w.transcript || '?'}`).join(', ') : 'none',
          terminado: 1,
          nivel: this._selectedLevel,
        });
      } catch (e) {}

      this._clearWords();

      const planeW = this.data.width;
      const planeH = this.data.height;
      const pct = Math.round(percentage * 100);

      const summary = document.createElement('a-text');
      summary.setAttribute('value', `${passed ? 'PASSED' : 'FAILED'} — ${correctCount}/${total} correct (${pct}%)`);
      summary.setAttribute('align', 'center');
      summary.setAttribute('color', passed ? '#aaffaa' : '#ffaaaa');
      summary.setAttribute('width', Math.max(1.0, planeW - 0.6));
      summary.setAttribute('position', `0 ${planeH * 0.2} 0.01`);
      summary.setAttribute('wrap-count', '30');
      this._wordsContainer.appendChild(summary);

      const missedText = failedWords.length ? `Missed: ${failedWords.join(', ')}` : 'No mistakes — great job!';
      const missed = document.createElement('a-text');
      missed.setAttribute('value', missedText);
      missed.setAttribute('align', 'center');
      missed.setAttribute('baseline', 'top');
      missed.setAttribute('color', '#ffffff');
      missed.setAttribute('width', Math.max(1.0, planeW - 0.6));
      missed.setAttribute('position', `0 ${planeH * 0.08} 0.01`);
      missed.setAttribute('wrap-count', '40');
      this._wordsContainer.appendChild(missed);
    } catch (e) { console.warn('finishPronunciation error', e); }
  },

  // Guarda el resultado de la evaluación en el registro local (ver vrEvaluationLog.util.js).
  // ApprendeVr no tiene todavía un backend de evaluaciones (Requerimiento 009, "No incluido").
  _saveEvaluation: function (info) {
    try {
      saveLocalEvaluation({
        archivo: info.archivo || '',
        total: Number.isFinite(info.total) ? info.total : 0,
        nota_evaluacion: info.nota_evaluacion || null,
        terminado: info.terminado ? 1 : 0,
        nivel: info.nivel || 1,
      });
    } catch (e) { console.warn('saveEvaluation error', e); }
  },

  // Carga y muestra las evaluaciones previas de la canción actual desde el registro local.
  _loadPreviousEvaluations: function () {
    try {
      const songTitle = this.data.songTitle || '';
      const evaluations = getLocalEvaluations(songTitle);

      while (this._evaluationsContainer.firstChild) {
        this._evaluationsContainer.removeChild(this._evaluationsContainer.firstChild);
      }

      if (evaluations.length === 0) {
        const noEvals = document.createElement('a-text');
        noEvals.setAttribute('value', 'No previous evaluations found');
        noEvals.setAttribute('align', 'center');
        noEvals.setAttribute('color', '#666666');
        noEvals.setAttribute('width', this.data.width - 0.4);
        noEvals.setAttribute('position', '0 0 0');
        noEvals.setAttribute('wrap-count', '30');
        this._evaluationsContainer.appendChild(noEvals);
        return;
      }

      const titleEvals = document.createElement('a-text');
      titleEvals.setAttribute('value', 'Previous Evaluations:');
      titleEvals.setAttribute('align', 'center');
      titleEvals.setAttribute('color', '#ffffff');
      titleEvals.setAttribute('width', this.data.width - 0.4);
      titleEvals.setAttribute('position', '0.1 0.3 0');
      titleEvals.setAttribute('wrap-count', '30');
      this._evaluationsContainer.appendChild(titleEvals);

      const maxDisplay = 3;
      evaluations.slice(0, maxDisplay).forEach((ev, idx) => {
        const yPos = 0.05 - (idx * 0.15);

        let dateStr = '';
        try {
          const d = new Date(ev.fecha_hora);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          const seconds = String(d.getSeconds()).padStart(2, '0');
          dateStr = `${day}/${month}/${year}-${hours}:${minutes}:${seconds}`;
        } catch (e) {
          dateStr = (ev.fecha_hora || 'N/A').replace(/\s+/g, '-');
        }

        const status = ev.terminado ? 'Completed' : 'Incomplete';
        const statusColor = ev.terminado ? '#00ff00' : '#ff0000';

        const nivelLabel = `L${ev.nivel || 1}`;
        const evalText = `${status} | ${nivelLabel} | SCORE:${ev.total} | LAST WORD:${ev.nota_evaluacion || 'no'} | ${dateStr}`;

        const evalItem = document.createElement('a-text');
        evalItem.setAttribute('value', evalText);
        evalItem.setAttribute('align', 'left');
        evalItem.setAttribute('color', statusColor);
        evalItem.setAttribute('width', this.data.width - 0.3);
        evalItem.setAttribute('position', `-${this.data.width / 2 - 0.10} ${yPos} 0`);
        evalItem.setAttribute('wrap-count', '80');
        evalItem.setAttribute('scale', '1.5 1.5 1');
        this._evaluationsContainer.appendChild(evalItem);
      });

      if (evaluations.length > maxDisplay) {
        const more = document.createElement('a-text');
        more.setAttribute('value', `... and ${evaluations.length - maxDisplay} more`);
        more.setAttribute('align', 'center');
        more.setAttribute('color', '#666666');
        more.setAttribute('width', this.data.width - 0.4);
        more.setAttribute('position', `0 ${0.05 - (maxDisplay * 0.15)} 0`);
        more.setAttribute('wrap-count', '30');
        more.setAttribute('scale', '0.7 0.7 1');
        this._evaluationsContainer.appendChild(more);
      }
    } catch (e) {
      console.error('Error en _loadPreviousEvaluations:', e);
    }
  },
});
