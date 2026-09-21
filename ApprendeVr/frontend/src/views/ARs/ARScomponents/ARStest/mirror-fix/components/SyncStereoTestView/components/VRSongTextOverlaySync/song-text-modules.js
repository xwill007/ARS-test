// Entrada de song-text.html (overlay "Song Text" de AR-SYNC). Muestra la letra de la canción
// seleccionada en el overlay "karaoke" — tres renglones (frase anterior, actual y futura)
// sincronizados con la reproducción vía `tiempo_frase` de `frases_vr` (ver
// phrases/entities/phrase.entity.ts + GET /api/frases). También permite editar el tiempo de cada
// frase (icono ⚙️ → "Edit time") para corregir la desincronización de la letra.
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
//
// Modo "Edit time" (icono ⚙️ → "Edit time"): pausa la canción para capturar el tiempo y clickea la
// frase para asignarle ese tiempo (se actualiza en BD vía PATCH /api/frases/:id/time). Mientras el
// modo está activo, las frases dejan de avanzar automáticamente.
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

  // Vista normal: los tres renglones de letra (anterior/actual/futura).
  const normalView = document.createElement('div');
  panel.appendChild(normalView);

  function makeLine() {
    const line = document.createElement('div');
    line.style.minHeight = '1.4em';
    line.style.lineHeight = '1.4';
    line.style.fontSize = '20px';
    line.style.fontWeight = '600';
    line.style.color = '#ffffff';
    line.style.whiteSpace = 'normal';
    line.style.wordBreak = 'break-word';
    normalView.appendChild(line);
    return line;
  }
  const prevLine = makeLine();
  const currentLine = makeLine();
  // Traducción (español) de la frase actual — pedido del usuario: se muestra SOLO debajo de la
  // frase del centro (la que se está reproduciendo), en letra más chica y color azul. No se muestra
  // en la anterior ni en la siguiente.
  const currentTranslation = document.createElement('div');
  Object.assign(currentTranslation.style, {
    minHeight: '1.2em',
    lineHeight: '1.3',
    fontSize: '15px',
    fontWeight: '400',
    color: '#64b5f6',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
  });
  normalView.appendChild(currentTranslation);
  const nextLine = makeLine();
  // Aviso "EDIT TEXT SONG TIME" — pedido del usuario: cuando la canción tiene frases sin tiempo
  // (00:00:00.0), se muestra al final de la letra sincronizada (o al inicio si no hay ninguna con
  // tiempo) para invitar a editarlas. Se resalta en amarillo, centrado, debajo de la siguiente.
  const editHint = document.createElement('div');
  Object.assign(editHint.style, {
    minHeight: '1.2em',
    lineHeight: '1.3',
    fontSize: '15px',
    fontWeight: '600',
    color: '#ffcc66',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    marginTop: '8px',
  });
  editHint.textContent = 'EDIT TEXT SONG TIME';
  normalView.appendChild(editHint);

  // Estado "sin frases" — pedido del usuario: cuando la canción NO tiene frases asociadas, mostrar
  // un texto aclaratorio y un botón "ADD TEXT SONG" para empezar a cargar la letra. El botón abre
  // el modo edición (mismo flujo que ⚙️ → "Edit time"), que es donde se asignan los tiempos.
  const emptyState = document.createElement('div');
  emptyState.style.display = 'none';
  emptyState.style.textAlign = 'center';
  emptyState.style.padding = '8px 0';
  const emptyText = document.createElement('div');
  emptyText.textContent = 'No text song for this song';
  Object.assign(emptyText.style, { color: '#ffcc66', fontSize: '15px', fontWeight: '600', marginBottom: '10px' });
  emptyState.appendChild(emptyText);
  const addTextSongBtn = document.createElement('button');
  addTextSongBtn.textContent = 'ADD TEXT SONG';
  Object.assign(addTextSongBtn.style, {
    padding: '8px 14px',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '4px',
    background: '#2e7d32',
    color: '#ffffff',
    cursor: 'pointer',
    pointerEvents: 'auto',
  });
  ['pointerdown', 'mousedown'].forEach((evt) => addTextSongBtn.addEventListener(evt, (e) => e.stopPropagation()));
  addTextSongBtn.addEventListener('click', enterEditMode);
  emptyState.appendChild(addTextSongBtn);
  normalView.appendChild(emptyState);

  // Estilos base: anterior/futura atenuadas y más chicas, la actual grande y blanca.
  Object.assign(prevLine.style, { color: '#9e9e9e', fontSize: '15px', fontWeight: '400' });
  Object.assign(currentLine.style, { color: '#ffffff', fontSize: '24px', fontWeight: '700' });
  Object.assign(nextLine.style, { color: '#9e9e9e', fontSize: '15px', fontWeight: '400' });

  // Icono de configuración (⚙️) en la esquina superior derecha del panel — abre/cierra un menú
  // con la opción "Edit time".
  const configBtn = document.createElement('button');
  configBtn.textContent = '⚙';
  Object.assign(configBtn.style, {
    position: 'absolute',
    top: '6px',
    right: '6px',
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    background: 'rgba(40, 40, 40, 0.9)',
    color: '#ffffff',
    fontSize: '16px',
    lineHeight: '1',
    padding: '0',
    cursor: 'pointer',
    pointerEvents: 'auto',
  });
  ['pointerdown', 'mousedown'].forEach((evt) => configBtn.addEventListener(evt, (e) => e.stopPropagation()));
  panel.appendChild(configBtn);

  const menu = document.createElement('div');
  Object.assign(menu.style, {
    position: 'absolute',
    top: '40px',
    right: '6px',
    display: 'none',
    flexDirection: 'column',
    gap: '4px',
    background: 'rgba(30, 30, 30, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    borderRadius: '6px',
    padding: '6px',
    pointerEvents: 'auto',
  });
  panel.appendChild(menu);

  const editTimeBtn = document.createElement('button');
  editTimeBtn.textContent = 'Edit time';
  Object.assign(editTimeBtn.style, {
    padding: '6px 10px',
    fontSize: '13px',
    border: 'none',
    borderRadius: '4px',
    background: '#454545',
    color: '#ffffff',
    cursor: 'pointer',
    pointerEvents: 'auto',
  });
  ['pointerdown', 'mousedown'].forEach((evt) => editTimeBtn.addEventListener(evt, (e) => e.stopPropagation()));
  menu.appendChild(editTimeBtn);

  // Vista de edición: barra de captura de tiempo + lista clickeable de frases + botón "Done".
  // Vive en un panel DOM SEPARADO del panel de letra (`editPanel`), que sigue a su propia ancla
  // `#song-text-edit-anchor` (ver más abajo) para poder reposicionarse de forma independiente con
  // el componente POSITION.
  const editView = document.createElement('div');
  editView.style.pointerEvents = 'auto';

  const captureBar = document.createElement('div');
  captureBar.textContent = 'Play, pause, then adjust the time and click a phrase to set it.';
  Object.assign(captureBar.style, { color: '#ffcc66', fontSize: '12px', marginBottom: '6px', textAlign: 'center' });
  editView.appendChild(captureBar);

  // Tiempo capturado (el que se va a asignar a la frase) con ajuste fino por décimas de segundo:
  // botón "−" a la izquierda y "+" a la derecha del valor — pedido del usuario. Se muestra ANTES
  // del check "Recalculate", porque es el dato principal que el usuario está editando.
  const timeAdjust = document.createElement('div');
  Object.assign(timeAdjust.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '8px',
  });

  const minusBtn = document.createElement('button');
  minusBtn.textContent = '−';
  Object.assign(minusBtn.style, {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    background: 'rgba(40, 40, 40, 0.9)',
    color: '#ffffff',
    fontSize: '18px',
    lineHeight: '1',
    padding: '0',
    cursor: 'pointer',
    pointerEvents: 'auto',
  });
  ['pointerdown', 'mousedown'].forEach((evt) => minusBtn.addEventListener(evt, (e) => e.stopPropagation()));

  const timeDisplay = document.createElement('div');
  Object.assign(timeDisplay.style, {
    minWidth: '72px',
    fontSize: '20px',
    fontWeight: '700',
    color: '#ffcc66',
    textAlign: 'center',
    fontVariantNumeric: 'tabular-nums',
  });

  const plusBtn = document.createElement('button');
  plusBtn.textContent = '+';
  Object.assign(plusBtn.style, {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    background: 'rgba(40, 40, 40, 0.9)',
    color: '#ffffff',
    fontSize: '18px',
    lineHeight: '1',
    padding: '0',
    cursor: 'pointer',
    pointerEvents: 'auto',
  });
  ['pointerdown', 'mousedown'].forEach((evt) => plusBtn.addEventListener(evt, (e) => e.stopPropagation()));

  timeAdjust.appendChild(minusBtn);
  timeAdjust.appendChild(timeDisplay);
  timeAdjust.appendChild(plusBtn);
  editView.appendChild(timeAdjust);
  minusBtn.addEventListener('click', () => nudgeTime(-1));
  plusBtn.addEventListener('click', () => nudgeTime(1));

  const statusEl = document.createElement('div');
  Object.assign(statusEl.style, { color: '#aaffaa', fontSize: '12px', marginBottom: '6px', textAlign: 'center', minHeight: '14px' });
  editView.appendChild(statusEl);

  // Check para recalcular el tiempo de las frases siguientes (pedido del usuario): al activarlo,
  // al asignar un tiempo a una frase se calcula el incremento (nuevo − anterior) y se lo suma a
  // todas las frases que vienen después, para desplazar el resto de la letra en bloque sin
  // editarlas una por una. Se implementa como botón toggle (no `<input type=checkbox>`) porque el
  // gaze/dwell de mirror-fix solo activa `<button>` (ver findGazeButton más abajo).
  const recalcBtn = document.createElement('button');
  Object.assign(recalcBtn.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'center',
    width: '100%',
    marginBottom: '8px',
    padding: '10px 10px',
    fontSize: '15px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '4px',
    background: 'rgba(50, 50, 50, 0.9)',
    color: '#ffffff',
    cursor: 'pointer',
    pointerEvents: 'auto',
  });
  const recalcMark = document.createElement('span');
  // Pedido del usuario: el recálculo de las frases siguientes queda ACTIVO por defecto.
  recalcMark.textContent = '☑';
  recalcMark.style.width = '22px';
  recalcMark.style.textAlign = 'center';
  recalcMark.style.fontSize = '22px';
  recalcMark.style.color = '#69F0AE';
  const recalcText = document.createElement('span');
  recalcText.textContent = 'Recalculate following phrases';
  recalcBtn.appendChild(recalcMark);
  recalcBtn.appendChild(recalcText);
  ['pointerdown', 'mousedown'].forEach((evt) => recalcBtn.addEventListener(evt, (e) => e.stopPropagation()));
  recalcBtn.addEventListener('click', () => {
    recalcEnabled = !recalcEnabled;
    recalcMark.textContent = recalcEnabled ? '☑' : '☐';
    recalcMark.style.color = recalcEnabled ? '#69F0AE' : '#ffffff';
  });
  editView.appendChild(recalcBtn);

  const phraseList = document.createElement('div');
  Object.assign(phraseList.style, {
    maxHeight: '340px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    textAlign: 'left',
  });
  editView.appendChild(phraseList);

  // Formulario "ADD PHRASE" — pedido del usuario ("ADD TEXT SONG" → agregar frases): dos campos de
  // texto (inglés y español) y un botón para crear la frase vía `POST /api/frases`. El tiempo se
  // toma del capturado actual si lo hay, si no la frase se crea en 00:00:00.0 para ajustarla luego.
  const addForm = document.createElement('div');
  Object.assign(addForm.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(255, 255, 255, 0.15)',
  });

  function makeTextInput(placeholder) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    Object.assign(input.style, {
      width: '100%',
      boxSizing: 'border-box',
      padding: '6px 8px',
      fontSize: '13px',
      border: '1px solid #555',
      borderRadius: '4px',
      background: '#1a1a1a',
      color: '#ffffff',
      pointerEvents: 'auto',
    });
    // Evita que escribir acá dispare el raycast/gaze de la escena (mismo criterio que el input de
    // youtube-video-modules.js).
    ['pointerdown', 'mousedown', 'click'].forEach((evt) => input.addEventListener(evt, (e) => e.stopPropagation()));
    return input;
  }
  const englishInput = makeTextInput('English phrase');
  const spanishInput = makeTextInput('Frase en español');
  addForm.appendChild(englishInput);
  addForm.appendChild(spanishInput);

  const addPhraseBtn = document.createElement('button');
  addPhraseBtn.textContent = 'ADD PHRASE';
  Object.assign(addPhraseBtn.style, {
    padding: '6px 10px',
    fontSize: '13px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '4px',
    background: '#2e7d32',
    color: '#ffffff',
    cursor: 'pointer',
    pointerEvents: 'auto',
  });
  ['pointerdown', 'mousedown'].forEach((evt) => addPhraseBtn.addEventListener(evt, (e) => e.stopPropagation()));
  addPhraseBtn.addEventListener('click', () => createPhrase());
  addForm.appendChild(addPhraseBtn);
  editView.appendChild(addForm);

  const doneBtn = document.createElement('button');
  doneBtn.textContent = 'Done';
  Object.assign(doneBtn.style, {
    marginTop: '8px',
    padding: '6px 12px',
    fontSize: '13px',
    border: 'none',
    borderRadius: '4px',
    background: '#2e7d32',
    color: '#ffffff',
    cursor: 'pointer',
    pointerEvents: 'auto',
  });
  ['pointerdown', 'mousedown'].forEach((evt) => doneBtn.addEventListener(evt, (e) => e.stopPropagation()));
  editView.appendChild(doneBtn);

  // Botón "Cancel" — pedido del usuario: elimina los tiempos guardados en frontend (los cambios
  // stageados en memoria) y restaura los valores originales, para volver a seleccionar sin salir
  // del modo edición. No toca la BD (a diferencia de "Done"); solo revierte lo pendiente.
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  Object.assign(cancelBtn.style, {
    marginTop: '8px',
    marginLeft: '8px',
    padding: '6px 12px',
    fontSize: '13px',
    border: 'none',
    borderRadius: '4px',
    background: '#b71c1c',
    color: '#ffffff',
    cursor: 'pointer',
    pointerEvents: 'auto',
  });
  ['pointerdown', 'mousedown'].forEach((evt) => cancelBtn.addEventListener(evt, (e) => e.stopPropagation()));
  editView.appendChild(cancelBtn);

  // Panel de edición: contenedor `position: fixed` propio (no hijo de `panel`) que sigue a
  // `#song-text-edit-anchor`. Mismos estilos base que el panel de letra, con ancho propio.
  const EDIT_PANEL_WIDTH = 360;
  const editPanel = document.createElement('div');
  editPanel.style.position = 'fixed';
  editPanel.style.transform = 'translate(-50%, -50%)';
  editPanel.style.width = EDIT_PANEL_WIDTH + 'px';
  editPanel.style.maxWidth = '90vw';
  editPanel.style.zIndex = '99998';
  editPanel.style.background = 'rgba(0, 0, 0, 0.6)';
  editPanel.style.border = '1px solid rgba(255, 255, 255, 0.18)';
  editPanel.style.borderRadius = '8px';
  editPanel.style.padding = '12px 16px';
  editPanel.style.fontFamily = 'sans-serif';
  editPanel.style.boxSizing = 'border-box';
  editPanel.style.textAlign = 'center';
  editPanel.appendChild(editView);

  // Botón de cierre (X) en la esquina superior derecha del panel de edición — pedido del usuario:
  // poder cerrar la lista de "Edit time" sin pasar por "Done". Cierra el modo edición descartando
  // los cambios pendientes (la próxima vez que se entre a "Edit time" se arranca de cero, ver
  // `enterEditMode`, que limpia `stagedIds`). Se usa `<button>` (no un div) para que el gaze/dwell
  // lo active igual que el resto de los controles (ver findGazeButton).
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    position: 'absolute',
    top: '6px',
    right: '6px',
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    background: 'rgba(40, 40, 40, 0.9)',
    color: '#ffffff',
    fontSize: '14px',
    lineHeight: '1',
    padding: '0',
    cursor: 'pointer',
    pointerEvents: 'auto',
    zIndex: '1',
  });
  ['pointerdown', 'mousedown'].forEach((evt) => closeBtn.addEventListener(evt, (e) => e.stopPropagation()));
  closeBtn.addEventListener('click', exitEditMode);
  editPanel.appendChild(closeBtn);
  document.body.appendChild(editPanel);

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

  // Marcador de ubicación para el panel de edición de tiempos (componente POSITION): mismo patrón
  // que `positionMarker`, pero reenvía su click al marcador 3D de `#song-text-edit-anchor` y sigue
  // al `editPanel` en pantalla. Así la lista de frases del modo "Edit time" es reposicionable por
  // separado del panel de letra.
  const editPositionMarker = document.createElement('button');
  Object.assign(editPositionMarker.style, {
    position: 'fixed',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    border: '2px solid #ffffff',
    background: '#d21919',
    padding: '0',
    cursor: 'pointer',
    zIndex: '100001',
    display: 'none',
    boxShadow: '0 0 4px rgba(0, 0, 0, 0.6)',
  });
  ['pointerdown', 'mousedown'].forEach((evt) => editPositionMarker.addEventListener(evt, (e) => e.stopPropagation()));
  editPositionMarker.addEventListener('click', () => {
    const realMarker = document.querySelector('#song-text-edit-anchor > a-circle.clickable');
    if (realMarker) realMarker.click();
  });
  document.body.appendChild(editPositionMarker);

  // Estado de reproducción publicado por el padre. Se guarda el snapshot + cuándo se recibió para
  // interpolar suavemente el tiempo entre escrituras (el padre publica ~4x/seg; la frase cambia
  // cada ~2-4s, así que interpolar alcanza para que el resaltado no salte).
  let state = { fileName: '', time: 0, playing: false, receivedAt: 0 };
  // Modo "Edit time": mientras está activo, las frases no avanzan (freeze) y se captura el tiempo
  // al pausar para asignárselo a la frase clickeada. Los cambios NO se guardan en BD al clickear:
  // se "stagean" en memoria (set de ids) y recién se persisten todos juntos al presionar DONE.
  let editMode = false;
  let menuOpen = false;
  let capturedTime = null; // segundos (tiempo pausado capturado) o null
  let recalcEnabled = true; // check "recalcular frases siguientes" (ACTIVO por defecto)
  const stagedIds = new Set(); // ids de frases con cambios pendientes de guardar
  // Tiempo original (en segundos) de cada frase stageada, capturado ANTES del primer cambio — se
  // usa para que "Cancel" pueda restaurar los valores en memoria sin tocar la BD.
  const stagedOriginals = new Map();

  function readState() {
    let raw = '';
    try { raw = localStorage.getItem(KARAOKE_STATE_KEY) || ''; } catch (e) { /* ignore */ }
    let next = { fileName: '', time: 0, playing: false, receivedAt: Date.now() };
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        next = {
          fileName: (parsed && parsed.fileName) || '',
          time: Number(parsed && parsed.time) || 0,
          playing: !!(parsed && parsed.playing),
          receivedAt: Date.now(),
        };
      } catch (e) { /* ignore */ }
    }
    // Detección del momento exacto en que el usuario pausa (transición reproducir → pausado):
    // ese es el tiempo que se le asigna a la frase seleccionada en modo edición.
    if (editMode && state.playing && !next.playing) {
      capturedTime = next.time;
      updateCaptureBar();
    }
    state = next;
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

  // Segundos → "HH:MM:SS.d" (formato TIME(1) de MySQL, una décima — ver db/013). Redondea a la
  // décima más cercana.
  function toHms(sec) {
    const rounded = Math.max(0, Math.round(sec * 10) / 10);
    const whole = Math.floor(rounded);
    const tenth = Math.round((rounded - whole) * 10);
    const h = Math.floor(whole / 3600);
    const m = Math.floor((whole % 3600) / 60);
    const s = whole % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return pad(h) + ':' + pad(m) + ':' + pad(s) + '.' + tenth;
  }

  // Segundos → "M:SS.d" para mostrar en la UI.
  function formatClock(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '0:00.0';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const tenth = Math.round((sec - Math.floor(sec)) * 10);
    return m + ':' + String(s).padStart(2, '0') + '.' + tenth;
  }

  let phrasesCache = { fileName: null, phrases: [] };
  // Evita refetchear la misma canción en cada frame mientras la petición está en vuelo (el fetch
  // es async y `phrasesCache.fileName` recién se actualiza cuando resuelve).
  let loadingFileName = null;

  function setLines(prev, current, translation, next) {
    prevLine.textContent = prev || '';
    currentLine.textContent = current || '';
    currentTranslation.textContent = translation || '';
    nextLine.textContent = next || '';
  }

  // La sincronización de la letra (panel SONG TEXT) se hace SIEMPRE por tiempo de reproducción, en
  // orden ascendente de tiempo, usando SOLO las frases con tiempo ya asignado (> 0) — pedido del
  // usuario: las frases en 00:00:00.0 (sin sincronizar) no deben aparecer en este panel.
  function computeLines(time) {
    const all = phrasesCache.phrases;
    const hasZeroTime = all.some((p) => p.t === 0);

    // Sin frases asociadas a la canción: mostrar el estado vacío con su botón y ocultar todo lo
    // demás (renglones de letra + avisos).
    if (!all.length) {
      setLines('', '', '', '');
      editHint.style.display = 'none';
      emptyState.style.display = '';
      return;
    }
    emptyState.style.display = 'none';

    const phrases = all
      .filter((p) => p.t > 0)
      .sort((a, b) => (a.t - b.t) || (a.id - b.id));

    // Aviso "EDIT TEXT SONG TIME": aparece solo cuando ya no quedan frases con tiempo por mostrar —
    // es decir, al inicio SOLO si no hay ninguna frase con tiempo, y al final cuando la reproducción
    // ya superó la última frase sincronizada (nunca mientras todavía se están mostrando).
    let showHint = false;
    if (hasZeroTime) {
      if (!phrases.length) {
        showHint = true;
      } else {
        const lastTime = phrases[phrases.length - 1].t;
        if (time > lastTime) showHint = true;
      }
    }
    editHint.style.display = showHint ? '' : 'none';

    if (!phrases.length) {
      setLines('', '', '', '');
      return;
    }
    // Frase actual = la de mayor `tiempo_frase` <= al tiempo de reproducción.
    let idx = -1;
    for (let i = 0; i < phrases.length; i++) {
      if (phrases[i].t <= time) idx = i;
      else break;
    }
    if (idx === -1) {
      // Todavía no arrancó la primera frase: mostrar la primera como "futura".
      setLines('', '', '', phrases[0].en);
      return;
    }
    const prev = idx > 0 ? phrases[idx - 1].en : '';
    const current = phrases[idx].en;
    const translation = phrases[idx].es || '';
    const next = idx + 1 < phrases.length ? phrases[idx + 1].en : '';
    setLines(prev, current, translation, next);
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
        .map((p) => ({ id: Number(p && p.id_frase) || 0, en: (p && p.ingles_frase) || '', es: (p && p.espanol_frase) || '', t: parseTime(p && p.tiempo_frase) }))
        .filter((p) => Number.isFinite(p.t));
      // Pedido del usuario: orden base de la lista por id ascendente.
      parsed.sort((a, b) => a.id - b.id);
      phrasesCache = { fileName, phrases: parsed };
      loadingFileName = null;
      if (editMode) renderPhraseList();
      return parsed;
    } catch (e) {
      phrasesCache = { fileName: null, phrases: [] };
      loadingFileName = null;
      return [];
    }
  }

  function updateCaptureBar() {
    updateTimeDisplay();
  }

  // Refleja el tiempo capturado en el widget "− time +" (o un placeholder si todavía no hay
  // tiempo porque la canción no se pausó).
  function updateTimeDisplay() {
    timeDisplay.textContent = capturedTime === null ? '--:--' : formatClock(capturedTime);
  }

  // Ajusta el tiempo capturado en segundos enteros (delta = ±1) — pedido del usuario: los botones
  // −/+ mueven el tiempo de a un segundo, que es más cómodo para corregir la sincronización.
  function nudgeTime(delta) {
    if (capturedTime === null) {
      statusEl.textContent = 'Pause the song first to capture a time.';
      return;
    }
    capturedTime = Math.max(0, Math.round(capturedTime + delta));
    updateTimeDisplay();
  }

  function renderPhraseList() {
    phraseList.innerHTML = '';
    const phrases = phrasesCache.phrases;
    if (!phrases.length) {
      const empty = document.createElement('div');
      empty.textContent = 'No phrases loaded.';
      empty.style.color = '#999999';
      empty.style.fontSize = '13px';
      phraseList.appendChild(empty);
      return;
    }
    // Pedido del usuario: la lista de edición muestra (1) al INICIO las 3 frases de la ventana
    // actual —anterior, actual y siguiente en orden natural de la letra (por id), donde "actual" es
    // la que está sonando— y (2) debajo, únicamente 3 frases con tiempo 00:00:00.0 (las de menor
    // id). La ventana se arma sobre el orden por id para que siempre haya anterior/siguiente aunque
    // sean frases que todavía no tienen tiempo asignado.
    const refTime = capturedTime !== null ? capturedTime : effectiveTime();
    const ordered = [...phrases].sort((a, b) => a.id - b.id);
    const timed = phrases.filter((p) => p.t > 0).sort((a, b) => (a.t - b.t) || (a.id - b.id));

    let currentPhrase = null;
    if (timed.length) {
      let currentIdx = -1;
      for (let i = 0; i < timed.length; i++) {
        if (timed[i].t <= refTime) currentIdx = i;
        else break;
      }
      currentPhrase = currentIdx === -1 ? timed[0] : timed[currentIdx];
    }

    const windowIds = new Set();
    const head = [];
    if (currentPhrase) {
      const pos = ordered.findIndex((p) => p.id === currentPhrase.id);
      for (let i = pos - 1; i <= pos + 1; i++) {
        if (i >= 0 && i < ordered.length) head.push(ordered[i]);
      }
    }
    head.forEach((p) => windowIds.add(p.id));

    // Solo las 3 frases con tiempo cero de menor id (evita duplicados con la ventana por seguridad).
    const zeroHead = phrases
      .filter((p) => p.t === 0 && !windowIds.has(p.id))
      .sort((a, b) => a.id - b.id)
      .slice(0, 3);

    const display = [...head, ...zeroHead];

    display.forEach((p) => {
      const btn = document.createElement('button');
      btn.textContent = p.id + '. ' + p.en + '  [' + formatClock(p.t) + ']';
      Object.assign(btn.style, {
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '6px 8px',
        fontSize: '13px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '4px',
        background: 'rgba(50, 50, 50, 0.9)',
        color: '#ffffff',
        cursor: 'pointer',
        pointerEvents: 'auto',
      });
      ['pointerdown', 'mousedown'].forEach((evt) => btn.addEventListener(evt, (e) => e.stopPropagation()));
      btn.addEventListener('click', () => stageTimeToPhrase(p));
      phraseList.appendChild(btn);
    });
  }

  // Persiste en BD el tiempo actual de una frase (PATCH /api/frases/:id/time). Devuelve `true` en
  // éxito. NO actualiza el cache: el cache ya tiene la décima redondeada con la que se stageó.
  async function patchPhraseTime(phrase, seconds) {
    const newTime = toHms(seconds);
    try {
      const res = await fetch('/api/frases/' + phrase.id + '/time', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time: newTime }),
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  // Crea una frase nueva vía `POST /api/frases` con el texto ingresado en el formulario "ADD
  // PHRASE". Usa el tiempo capturado actual si lo hay; si no, la deja en 00:00:00.0 para ajustarla
  // después. Al éxito, limpia los inputs y recarga las frases de la canción.
  async function createPhrase() {
    const english = englishInput.value.trim();
    const spanish = spanishInput.value.trim();
    if (!english || !spanish) {
      statusEl.textContent = 'Fill both English and Spanish text.';
      return;
    }
    if (!state.fileName) {
      statusEl.textContent = 'No song selected.';
      return;
    }
    const body = { archivo: state.fileName, ingles_frase: english, espanol_frase: spanish };
    if (capturedTime !== null) body.tiempo_frase = toHms(capturedTime);
    statusEl.textContent = 'Adding phrase...';
    try {
      const res = await fetch('/api/frases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        statusEl.textContent = 'Add failed (' + res.status + ').';
        return;
      }
      englishInput.value = '';
      spanishInput.value = '';
      // Invalidar el cache para que el próximo loadPhrases refetchee esta canción (ver el guard
      // `phrasesCache.fileName === fileName` en loadPhrases).
      phrasesCache = { fileName: null, phrases: [] };
      loadingFileName = null;
      await loadPhrases(state.fileName);
      updateAddMode();
      statusEl.textContent = 'Phrase added.';
    } catch (e) {
      statusEl.textContent = 'Add failed (network).';
    }
  }

  // Marca una frase (y, con recalc activo, las siguientes) con el tiempo capturado. Solo actualiza
  // el cache en memoria y el set `stagedIds`; el guardado real ocurre en `commitStagedChanges`
  // cuando el usuario presiona DONE. Así se evita persistir por error antes de terminar de editar.
  function stageTimeToPhrase(p) {
    if (capturedTime === null) {
      statusEl.textContent = 'Pause the song first to capture a time.';
      return;
    }
    const oldTime = p.t;
    const newTime = Math.max(0, Math.round(capturedTime * 10) / 10);
    const delta = Math.round((newTime - oldTime) * 10) / 10;

    // Frases a actualizar: la clickeada, y —si el check "recalcular siguientes" está activo y hay
    // un corrimiento real— todas las que vienen después (tiempo mayor al anterior de la clickeada).
    const targets = [{ phrase: p, seconds: newTime }];
    if (recalcEnabled && delta !== 0) {
      const followers = phrasesCache.phrases
        .filter((f) => f.id !== p.id && f.t > oldTime)
        .map((f) => ({ phrase: f, seconds: Math.max(0, Math.round((f.t + delta) * 10) / 10) }));
      followers.forEach((t) => targets.push(t));
    }

    for (const t of targets) {
      if (!stagedIds.has(t.phrase.id)) stagedOriginals.set(t.phrase.id, t.phrase.t);
      t.phrase.t = t.seconds;
      stagedIds.add(t.phrase.id);
    }

    phrasesCache.phrases.sort((a, b) => a.id - b.id);
    renderPhraseList();

    if (recalcEnabled && targets.length > 1) {
      const sign = delta >= 0 ? '+' : '';
      statusEl.textContent = 'Staged ' + targets.length + ' phrases (' + sign + delta.toFixed(1) + 's to following). Press DONE to save.';
    } else {
      statusEl.textContent = 'Phrase ' + p.id + ' → ' + formatClock(newTime) + ' (staged). Press DONE to save.';
    }
  }

  // Guarda en BD todos los cambios pendientes (stagedIds) y sale del modo edición. Si alguna
  // frase falla, NO sale del modo edición ni descarta los cambios, para que se pueda reintentar.
  async function commitStagedChanges() {
    if (!stagedIds.size) {
      exitEditMode();
      return;
    }
    statusEl.textContent = 'Saving ' + stagedIds.size + ' phrase(s)...';
    let failed = 0;
    const ids = [...stagedIds];
    const byId = new Map(phrasesCache.phrases.map((p) => [p.id, p]));
    for (const id of ids) {
      const phrase = byId.get(id);
      if (!phrase) { failed++; continue; }
      const ok = await patchPhraseTime(phrase, phrase.t);
      if (!ok) failed++;
    }
    if (failed > 0) {
      statusEl.textContent = 'Save failed for ' + failed + ' of ' + ids.length + ' phrase(s). Fix and press DONE to retry.';
      return;
    }
    stagedIds.clear();
    statusEl.textContent = 'Saved ' + ids.length + ' phrase(s).';
    exitEditMode();
  }

  function enterEditMode() {
    editMode = true;
    // Si ya está pausado al entrar, usar ese tiempo como punto de partida; si está reproduciendo,
    // se capturará al pausar (ver readState). La letra del panel principal se congela (computeLines
    // solo corre en !editMode) pero sigue visible, para saber qué frase se está editando.
    capturedTime = state.playing ? null : state.time;
    stagedIds.clear();
    stagedOriginals.clear();
    statusEl.textContent = '';
    updateCaptureBar();
    renderPhraseList();
    updateAddMode();
  }

  // "Agregar frase" (sin frases todavía): oculta el check "Recalculate following phrases" (no hay
  // frases siguientes que recalcular). Cuando ya hay frases, lo vuelve a mostrar.
  function updateAddMode() {
    recalcBtn.style.display = phrasesCache.phrases.length ? 'flex' : 'none';
  }

  // "Cancel": revierte en memoria todos los tiempos stageados (restaura los originales capturados
  // en `stagedOriginals`) y limpia el set de pendientes, para que el usuario pueda volver a
  // seleccionar. NO toca la BD y NO sale del modo edición.
  function cancelEdit() {
    if (!stagedIds.size) {
      statusEl.textContent = 'Nothing to cancel.';
      return;
    }
    const byId = new Map(phrasesCache.phrases.map((p) => [p.id, p]));
    for (const [id, original] of stagedOriginals) {
      const phrase = byId.get(id);
      if (phrase) phrase.t = original;
    }
    stagedIds.clear();
    stagedOriginals.clear();
    phrasesCache.phrases.sort((a, b) => a.id - b.id);
    renderPhraseList();
    statusEl.textContent = 'Changes cancelled.';
  }

  function exitEditMode() {
    editMode = false;
    capturedTime = null;
  }

  configBtn.addEventListener('click', () => {
    menuOpen = !menuOpen;
    menu.style.display = menuOpen ? 'flex' : 'none';
  });
  editTimeBtn.addEventListener('click', () => {
    menuOpen = false;
    menu.style.display = 'none';
    enterEditMode();
  });
  doneBtn.addEventListener('click', commitStagedChanges);
  cancelBtn.addEventListener('click', cancelEdit);

  // Loop por frame: re-lee el estado (snapshot de localStorage) y actualiza (a) la posición del
  // panel siguiendo al ancla, y (b) los tres renglones según el tiempo efectivo (salvo en modo
  // edición, donde las frases quedan congeladas). También detecta cambios de canción (comparando
  // contra el cache) para recargar las frases cuando el usuario selecciona otra en el overlay
  // "karaoke".
  function track() {
    const sceneEl = document.querySelector('a-scene');
    const anchorEl = document.querySelector('#song-text-anchor');
    const editAnchorEl = document.querySelector('#song-text-edit-anchor');
    const worldPos = new AFRAME.THREE.Vector3();

    readState();

    function update() {
      if (phrasesCache.fileName !== state.fileName && loadingFileName !== state.fileName) {
        loadPhrases(state.fileName);
      }
      if (!editMode) {
        computeLines(effectiveTime());
      }

      const camera = sceneEl && sceneEl.camera;
      const canvas = sceneEl && sceneEl.canvas;

      // Panel de letra (principal) siguiendo a `#song-text-anchor`.
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

      // Panel de edición de tiempos (lista de frases) siguiendo a `#song-text-edit-anchor`. Solo se
      // proyecta/muestra en modo edición.
      let editBehind = true;
      if (editMode && camera && canvas && editAnchorEl && editAnchorEl.object3D) {
        sceneEl.object3D.updateMatrixWorld(true);
        editAnchorEl.object3D.getWorldPosition(worldPos);
        const projected = worldPos.clone().project(camera);
        const rect = canvas.getBoundingClientRect();
        editBehind = projected.z > 1;
        editPanel.style.display = editBehind ? 'none' : 'block';
        if (!editBehind) {
          editPanel.style.left = (rect.left + (projected.x * 0.5 + 0.5) * rect.width) + 'px';
          editPanel.style.top = (rect.top + (-projected.y * 0.5 + 0.5) * rect.height) + 'px';
          const scale = editAnchorEl.object3D.scale.x;
          if (Number.isFinite(scale) && scale > 0) {
            editPanel.style.width = (EDIT_PANEL_WIDTH * scale) + 'px';
          }
        }
      } else if (!editMode) {
        editPanel.style.display = 'none';
      }
      const editRealMarker = document.querySelector('#song-text-edit-anchor > a-circle.clickable');
      const editMarkerShouldShow = editMode && !editBehind && editRealMarker && editRealMarker.getAttribute('visible') !== false;
      if (editMarkerShouldShow) {
        const editRect = editPanel.getBoundingClientRect();
        editPositionMarker.style.display = 'block';
        editPositionMarker.style.left = (editRect.left - 11) + 'px';
        editPositionMarker.style.top = (editRect.top - 11) + 'px';
        editPositionMarker.style.background = editRealMarker.getAttribute('color') || '#d21919';
      } else {
        editPositionMarker.style.display = 'none';
      }

      requestAnimationFrame(update);
    }
    update();
  }
  track();

  // React al evento `storage` (el padre publica el estado por localStorage): re-lee el snapshot
  // para que la interpolación se reinicie desde el último valor real (y, en modo edición, detecte
  // el momento del pause para capturar el tiempo).
  window.addEventListener('storage', function (ev) {
    if (ev.key === KARAOKE_STATE_KEY) readState();
  });

  // Gaze/dwell para activar los botones de DOM de este panel (marcador de posición, ⚙️, menú y
  // lista de frases en edición): mismo patrón que youtube-video-modules.js — la brújula 3D (capa
  // superior) es la única que recibe el mousedown/mousemove real, así que el único camino para
  // clickear estos `<button>` es el gaze/dwell propio de ESTE iframe (`document.elementFromPoint`
  // en el centro del canvas + FUSE).
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

  function send(msg) {
    window.parent.postMessage(Object.assign({ source: 'ars-sync-test' }, msg), '*');
  }

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
