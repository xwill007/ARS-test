// Control de ajuste de posición para los elementos de la vista A-Frame (Requerimiento 010).
//
// A diferencia de un overlay HTML fijo en una esquina de la pantalla, acá el marcador 📍 vive
// DENTRO de la escena, como hijo de cada elemento (video, panel de karaoke, panel de agregar
// canción, panel de evaluación): al moverse el elemento, el marcador y su d-pad se mueven con él
// (posición local), y cada elemento tiene su propio control independiente — igual que
// `UbicacionControl` está pegado al formulario de login, no en una esquina compartida de la
// pantalla. El d-pad muestra además las coordenadas actuales del elemento, y un input numérico
// (HTML, proyectado sobre el centro del d-pad) para definir el incremento de cada click.
//
// `createWidget`/`registerPositionWidgetClickables`/`registerNumericInput` se exportan porque el
// panel de evaluación (`VREvaluacionAf.js`) no existe todavía cuando esta vista carga — se crea
// recién al pulsar "EVALUATE SONG" — así que arma su propio widget bajo demanda y lo suma a los
// mismos registros compartidos en vez de duplicar la lógica de raycasting/proyección.
import { getPointerNDC } from './vrPointerRaycast.util.js';
import { getUserSetting, saveUserSetting } from './vrUserSettingsApi.util.js';
import { t } from './vrI18n.util.js';

const DEFAULT_STEP = 3.0;
const VIEW = 'aframe-view';

// offset: posición local (relativa al propio elemento) donde se ancla el marcador 📍 — siempre en
// la esquina SUPERIOR IZQUIERDA del panel visible de cada elemento (borde izquierdo, un poco por
// encima del borde superior), igual convención que `UbicacionControl` (corner="top-left").
// `karaoke` es un grupo compuesto (video + lista de canciones, lejos entre sí en X) — se ancla a
// la esquina superior izquierda de su video (videoPosition/videoWidth/videoHeight de
// VRKaraokeAf.js en index.html: "0 2.5 -3", 15x9), que es su elemento visualmente principal. El
// video no tiene entrada propia acá: vive dentro del panel de karaoke (no es una entidad
// independiente en el DOM), así que no es posicionable por separado — hubo una entrada `video`
// con selector `#video-container` que nunca existió, dejando ese elemento fuera de la config
// guardada y haciendo fallar la validación del backend (que exigía las tres claves) en cada
// GUARDAR (hallazgo tardío, ver problems_solutions.md del Requerimiento 010).
const ELEMENTS = [
  { key: 'karaoke', selector: '#karaoke-vr-component', offset: [-7.5, 7.3, -3] },
  { key: 'newSong', selector: '#new-song-component', offset: [-1.6, 2.875, 0.05] },
];

function parsePosition(attrValue) {
  if (attrValue && typeof attrValue === 'object') {
    return [attrValue.x || 0, attrValue.y || 0, attrValue.z || 0];
  }
  return [0, 0, 0];
}

function formatCoords(pos) {
  return `${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}`;
}

// Un widget por elemento: marcador clickeable (círculo rojo) que despliega/oculta un d-pad con
// las coordenadas actuales, 6 botones de movimiento (↑↓←→ + acercar/alejar en Z), un input HTML
// para el incremento de cada click (por defecto 0.01, en el centro del d-pad) y un botón GUARDAR
// — todos hijos del propio elemento salvo el input (HTML, proyectado sobre pantalla). Mover con
// el d-pad solo actualiza la posición en pantalla; el ajuste recién se registra en la base de
// datos al pulsar GUARDAR (a pedido explícito, en vez de guardar en cada click).
export function createWidget(el, offset, onMove, onSave) {
  const [ox, oy, oz] = offset;
  const clickables = []; // { el, onClick }

  const marker = document.createElement('a-circle');
  marker.setAttribute('radius', 0.18);
  marker.setAttribute('color', '#d21919');
  marker.setAttribute('class', 'clickable');
  marker.setAttribute('position', `${ox} ${oy} ${oz}`);
  marker.setAttribute('material', 'shader: flat; side: double;');
  marker.setAttribute('scale', '2 2 2');
  el.appendChild(marker);

  const dpad = document.createElement('a-entity');
  // 0.9 (no 0.5): con las flechas agrandadas, la "^" (local y=0.48 dentro del d-pad) quedaba a
  // solo 0.02 del marcador — prácticamente superpuestos — y el raycaster terminaba activando la
  // flecha en vez de abrir/cerrar el d-pad al clickear el marcador.
  dpad.setAttribute('position', `${ox} ${oy - 0.9} ${oz}`);
  // Doble de grande (marcador incluido) para facilitar el click, a pedido del usuario.
  dpad.setAttribute('scale', '2 2 2');
  dpad.setAttribute('visible', false);
  el.appendChild(dpad);

  // Grupo frontal: TODO el contenido interactivo del d-pad (coords, flechas, ancla del input)
  // vive acá, desplazado hacia la cámara (+Z) como grupo único — así flechas e input quedan
  // siempre a la misma distancia del usuario, en vez de que solo el input se acerque.
  const front = document.createElement('a-entity');
  front.setAttribute('position', '0 0 0.5');
  dpad.appendChild(front);

  // Coordenadas actuales, arriba de las flechas.
  const coordsLabel = document.createElement('a-text');
  coordsLabel.setAttribute('align', 'center');
  coordsLabel.setAttribute('color', '#ffffff');
  coordsLabel.setAttribute('width', 3.6);
  coordsLabel.setAttribute('position', '0 0.85 0');
  front.appendChild(coordsLabel);

  const refreshCoordsLabel = () => {
    coordsLabel.setAttribute('value', formatCoords(el.getAttribute('position')));
  };
  refreshCoordsLabel();

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
    front.appendChild(btn);
    return btn;
  };

  // Ancla del input HTML: un punto invisible dentro del mismo grupo `front` que las flechas (misma
  // distancia de la cámara), usado para proyectar a pantalla dónde dibujar el input numérico.
  const inputAnchor = document.createElement('a-entity');
  inputAnchor.setAttribute('position', '0 -0.15 0');
  front.appendChild(inputAnchor);

  // Input HTML (proyectado sobre `inputAnchor`, ver `registerNumericInput` +
  // `startNumericInputProjection`) que define cuánto se mueve cada click de flecha/zoom.
  const stepInput = document.createElement('input');
  stepInput.type = 'number';
  stepInput.step = '0.01';
  stepInput.value = String(DEFAULT_STEP);
  stepInput.setAttribute('aria-label', 'position-control-step');
  // Tamaño acorde al resto del widget, ahora al doble de escala.
  Object.assign(stepInput.style, {
    position: 'fixed',
    display: 'none',
    width: '46px',
    fontSize: '13px',
    textAlign: 'center',
    zIndex: '1000',
    border: '1px solid #555',
    borderRadius: '4px',
    padding: '3px 0',
  });
  // Evita que escribir en el input dispare el raycast manual de la escena (que interpreta
  // cualquier pointerdown sobre la pantalla como un intento de click en un elemento 3D).
  ['pointerdown', 'mousedown', 'click'].forEach((evt) =>
    stepInput.addEventListener(evt, (e) => e.stopPropagation()),
  );

  const getStep = () => {
    const value = parseFloat(stepInput.value);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_STEP;
  };

  const moveBtn = (label, x, y, axis, sign) =>
    makeButton(label, x, y, 0.44, 0.36, () => {
      const delta = [0, 0, 0];
      delta[axis] = sign * getStep();
      onMove(delta[0], delta[1], delta[2]);
      refreshCoordsLabel();
    });

  // Flechas más separadas del centro (que el input HTML de incremento, proyectado ahí, quede con
  // espacio libre alrededor en vez de taparlas) y más grandes que antes, para un click más fácil.
  moveBtn('^', 0, 0.48, 1, 1);
  moveBtn('<', -0.55, 0, 0, -1);
  moveBtn('>', 0.55, 0, 0, 1);
  moveBtn('v', 0, -0.48, 1, -1);
  moveBtn('-', -0.3, -0.95, 2, -1);
  moveBtn('+', 0.3, -0.95, 2, 1);

  const saveBtn = makeButton(t('aframe.positionControl.save'), 0, -1.35, 0.85, 0.34, () => {
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

  return { clickables, dpad, inputAnchor, stepInput, refreshCoordsLabel };
}

// Registro compartido de botones clickeables de TODOS los widgets de esta vista (los tres fijos
// de acá + el del panel de evaluación, agregado bajo demanda por VREvaluacionAf.js). Es un array
// mutado in-place (nunca reasignado) para que el listener de `setupSharedRaycast`, ya registrado,
// vea también los widgets agregados después de esa primera configuración.
const sharedClickables = [];

export function registerPositionWidgetClickables(clickables) {
  sharedClickables.push(...clickables);
}

// Registro compartido de inputs de incremento (uno por widget) que `startNumericInputProjection`
// posiciona en pantalla cada frame, proyectando `anchor` (más cerca de la cámara que el resto del
// d-pad — ver `inputAnchor` en `createWidget`); `dpad` solo se usa para saber si mostrarlo u
// ocultarlo (visible cuando el d-pad de ese widget está abierto).
const numericInputs = []; // { input, dpad, anchor }

export function registerNumericInput(input, dpad, anchor) {
  document.body.appendChild(input);
  numericInputs.push({ input, dpad, anchor });
}

// Raycast manual compartido por todos los widgets de esta vista: un solo listener en window, en
// vez de uno por widget, evitando registrar N handlers casi idénticos.
function setupSharedRaycast(sceneEl) {
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
    sharedClickables.forEach((entry) => {
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

// Proyecta el centro 3D de cada d-pad abierto a coordenadas de pantalla, y posiciona ahí su input
// HTML de incremento (oculto mientras el d-pad correspondiente esté cerrado o fuera de cámara).
function worldToScreen(sceneEl, worldPos) {
  const camera = sceneEl.camera;
  const canvas = sceneEl.canvas;
  if (!camera || !canvas) return null;
  const projected = worldPos.clone().project(camera);
  if (projected.z < -1 || projected.z > 1) return null; // detrás de la cámara o fuera del frustum
  const rect = canvas.getBoundingClientRect();
  return {
    x: rect.left + (projected.x * 0.5 + 0.5) * rect.width,
    y: rect.top + (-projected.y * 0.5 + 0.5) * rect.height,
  };
}

function startNumericInputProjection(sceneEl) {
  const worldPos = new AFRAME.THREE.Vector3();

  const tick = () => {
    numericInputs.forEach(({ input, dpad, anchor }) => {
      const visible = dpad.getAttribute('visible') && anchor.object3D;
      const screen = visible ? (anchor.object3D.getWorldPosition(worldPos), worldToScreen(sceneEl, worldPos)) : null;
      if (!screen) {
        input.style.display = 'none';
        return;
      }
      input.style.display = 'block';
      input.style.left = `${Math.round(screen.x - 23)}px`;
      input.style.top = `${Math.round(screen.y - 13)}px`;
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function initPositionControl() {
  const sceneEl = document.querySelector('a-scene');
  if (!sceneEl) return;

  setupSharedRaycast(sceneEl);
  startNumericInputProjection(sceneEl);

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
    const widget = createWidget(t.el, t.offset, onMove, persist);
    t.widget = widget;
    registerPositionWidgetClickables(widget.clickables);
    registerNumericInput(widget.stepInput, widget.dpad, widget.inputAnchor);
  });

  // Cargar configuración guardada (si hay sesión) y aplicarla sobre lo hardcodeado en index.html.
  getUserSetting(VIEW).then((saved) => {
    if (!saved) return;
    targets.forEach((t) => {
      const elConfig = saved[t.key];
      if (elConfig && Array.isArray(elConfig.position) && elConfig.position.length === 3) {
        state[t.key] = elConfig.position;
        t.el.setAttribute('position', `${elConfig.position[0]} ${elConfig.position[1]} ${elConfig.position[2]}`);
        t.widget.refreshCoordsLabel();
      }
    });
  });
}
