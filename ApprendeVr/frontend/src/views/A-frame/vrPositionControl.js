// Control de ajuste de posición para los elementos de la vista A-Frame (Requerimiento 010).
//
// A diferencia de un overlay HTML fijo en una esquina de la pantalla, acá el marcador 📍 vive
// DENTRO de la escena, como hijo de cada elemento (video, panel de karaoke, panel de agregar
// canción): al moverse el elemento, el marcador y su d-pad se mueven con él (posición local), y
// cada elemento tiene su propio control independiente — igual que `UbicacionControl` está pegado
// al formulario de login, no en una esquina compartida de la pantalla.
import { getPointerNDC } from './vrPointerRaycast.util.js';
import { getUserSetting, saveUserSetting } from './vrUserSettingsApi.util.js';
import { t } from './vrI18n.util.js';

const MOVE_STEP = 0.5;
const VIEW = 'aframe-view';

// offset: posición local (relativa al propio elemento) donde se ancla el marcador 📍 — siempre en
// la esquina SUPERIOR IZQUIERDA del panel visible de cada elemento (borde izquierdo, un poco por
// encima del borde superior), igual convención que `UbicacionControl` (corner="top-left").
// `karaoke` es un grupo compuesto (video + lista de canciones, lejos entre sí en X) — se ancla a
// la esquina superior izquierda de su video (videoPosition/videoWidth/videoHeight de
// VRKaraokeAf.js en index.html: "0 2.5 -3", 15x9), que es su elemento visualmente principal.
const ELEMENTS = [
  { key: 'video', selector: '#video-container', offset: [-8, 4.8, 0] },
  { key: 'karaoke', selector: '#karaoke-vr-component', offset: [-7.5, 7.3, -3] },
  { key: 'newSong', selector: '#new-song-component', offset: [-1.6, 2.875, 0.05] },
];

function parsePosition(attrValue) {
  if (attrValue && typeof attrValue === 'object') {
    return [attrValue.x || 0, attrValue.y || 0, attrValue.z || 0];
  }
  return [0, 0, 0];
}

// Un widget por elemento: marcador clickeable (círculo rojo) que despliega/oculta un d-pad de
// 6 botones (↑↓←→ + acercar/alejar en Z) más un botón GUARDAR, todos hijos del propio elemento.
// Mover con el d-pad solo actualiza la posición en pantalla; el ajuste recién se registra en la
// base de datos al pulsar GUARDAR (a pedido explícito, en vez de guardar en cada click). Tiene su
// propio raycast manual (mismo patrón que VRNewSongAf/VRKaraokeAf): el <a-cursor> por defecto de
// index.html apunta al centro de pantalla (gaze), no al mouse.
function createWidget(el, offset, onMove, onSave) {
  const [ox, oy, oz] = offset;
  const clickables = []; // { el, onClick }

  const marker = document.createElement('a-circle');
  marker.setAttribute('radius', 0.18);
  marker.setAttribute('color', '#d21919');
  marker.setAttribute('class', 'clickable');
  marker.setAttribute('position', `${ox} ${oy} ${oz}`);
  marker.setAttribute('material', 'shader: flat; side: double;');
  el.appendChild(marker);

  const dpad = document.createElement('a-entity');
  dpad.setAttribute('position', `${ox} ${oy - 0.5} ${oz}`);
  dpad.setAttribute('visible', false);
  el.appendChild(dpad);

  const makeButton = (label, x, y, width, height, onClick) => {
    const btn = document.createElement('a-plane');
    btn.setAttribute('width', width);
    btn.setAttribute('height', height);
    btn.setAttribute('color', '#333333');
    btn.setAttribute('class', 'clickable');
    btn.setAttribute('material', 'shader: flat; side: double;');
    btn.setAttribute('position', `${x} ${y} 0`);
    const txt = document.createElement('a-text');
    txt.setAttribute('value', label);
    txt.setAttribute('align', 'center');
    txt.setAttribute('color', '#ffffff');
    txt.setAttribute('width', 6);
    txt.setAttribute('position', '0 0 0.01');
    btn.appendChild(txt);
    btn.addEventListener('click', onClick);
    clickables.push({ el: btn, onClick });
    dpad.appendChild(btn);
    return btn;
  };

  const moveBtn = (label, x, y, dx, dy, dz) =>
    makeButton(label, x, y, 0.32, 0.26, () => onMove(dx, dy, dz));

  moveBtn('^', 0, 0.3, 0, MOVE_STEP, 0);
  moveBtn('<', -0.36, 0, -MOVE_STEP, 0, 0);
  moveBtn('>', 0.36, 0, MOVE_STEP, 0, 0);
  moveBtn('v', 0, -0.3, 0, -MOVE_STEP, 0);
  moveBtn('-', -0.18, -0.6, 0, 0, -MOVE_STEP);
  moveBtn('+', 0.18, -0.6, 0, 0, MOVE_STEP);

  const saveBtn = makeButton(t('aframe.positionControl.save'), 0, -0.95, 0.7, 0.26, () => {
    onSave();
    const prevColor = saveBtn.getAttribute('color');
    saveBtn.setAttribute('color', '#117711');
    setTimeout(() => saveBtn.setAttribute('color', prevColor), 400);
  });
  saveBtn.setAttribute('color', '#0008ff');

  const toggle = () => {
    const visible = !dpad.getAttribute('visible');
    dpad.setAttribute('visible', visible);
  };
  marker.addEventListener('click', toggle);
  clickables.push({ el: marker, onClick: toggle });

  return clickables;
}

// Raycast manual compartido por todos los widgets de esta vista: un solo listener en window,
// en vez de uno por widget, evitando registrar N handlers casi idénticos.
function setupSharedRaycast(sceneEl, allClickables) {
  const THREE = AFRAME.THREE;
  const mouse = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();

  window.addEventListener('pointerdown', (evt) => {
    const canvas = sceneEl.canvas;
    if (!canvas || !sceneEl.camera) return;
    const ndc = getPointerNDC(canvas, evt.clientX, evt.clientY);
    mouse.set(ndc.x, ndc.y);
    raycaster.setFromCamera(mouse, sceneEl.camera);

    const meshes = [];
    const meshToEntry = new Map();
    allClickables.forEach((entry) => {
      if (!entry.el.object3D) return;
      entry.el.object3D.traverse((o) => {
        if (o.isMesh) {
          meshes.push(o);
          meshToEntry.set(o, entry);
        }
      });
    });
    if (!meshes.length) return;

    const intersects = raycaster.intersectObjects(meshes, true);
    if (intersects.length) {
      const entry = meshToEntry.get(intersects[0].object);
      if (entry) entry.onClick();
    }
  });
}

export function initPositionControl() {
  const sceneEl = document.querySelector('a-scene');
  if (!sceneEl) return;

  const targets = ELEMENTS.map((e) => ({ ...e, el: document.querySelector(e.selector) })).filter(
    (e) => e.el,
  );
  if (!targets.length) return;

  // Estado en memoria: arranca con lo que cada entidad ya trae en el DOM (hardcodeado en
  // index.html), y se reemplaza por lo guardado (si existe) al cargar más abajo.
  const state = {};
  targets.forEach((t) => {
    state[t.key] = parsePosition(t.el.getAttribute('position'));
  });

  const persist = () => {
    const config = {};
    targets.forEach((t) => {
      config[t.key] = { position: state[t.key] };
    });
    saveUserSetting(VIEW, config);
  };

  let allClickables = [];
  targets.forEach((t) => {
    // Mover con el d-pad solo actualiza la posición en memoria/pantalla; el botón GUARDAR de
    // cada widget es el que la registra en la base de datos (a pedido explícito del usuario).
    const onMove = (dx, dy, dz) => {
      const pos = state[t.key];
      const next = [
        +(pos[0] + dx).toFixed(2),
        +(pos[1] + dy).toFixed(2),
        +(pos[2] + dz).toFixed(2),
      ];
      state[t.key] = next;
      t.el.setAttribute('position', `${next[0]} ${next[1]} ${next[2]}`);
    };
    allClickables = allClickables.concat(createWidget(t.el, t.offset, onMove, persist));
  });

  setupSharedRaycast(sceneEl, allClickables);

  // Cargar configuración guardada (si hay sesión) y aplicarla sobre lo hardcodeado en index.html.
  getUserSetting(VIEW).then((saved) => {
    if (!saved) return;
    targets.forEach((t) => {
      const elConfig = saved[t.key];
      if (elConfig && Array.isArray(elConfig.position) && elConfig.position.length === 3) {
        state[t.key] = elConfig.position;
        t.el.setAttribute('position', `${elConfig.position[0]} ${elConfig.position[1]} ${elConfig.position[2]}`);
      }
    });
  });
}
