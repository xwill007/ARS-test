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

// offset: posición local (relativa al `host`, el elemento donde vive el marcador 📍) en la que se
// ancla el marcador — siempre en la esquina SUPERIOR IZQUIERDA del panel visible de cada elemento
// (borde izquierdo, un poco por encima del borde superior), igual convención que `UbicacionControl`
// (corner="top-left").
// `karaoke` es un grupo compuesto (video + lista de canciones, lejos entre sí en X). `karaoke` y
// `songList` comparten el MISMO host (`#karaoke-vr-component`) pero editan posiciones distintas:
// `karaoke` edita la posición del propio grupo (el video), `songList` edita la posición del
// contenedor de la lista de canciones (this._videoListContainer de VRKaraokeAf.js). Por eso el
// marcador de cada uno se ancla al host (sin heredar el `escalaLista` que sí tiene la lista) y
// `resolveTarget()` decide, según la clave, qué se lee/escribe como posición.
// El video no tiene entrada propia acá: vive dentro del panel de karaoke (no es una entidad
// independiente en el DOM), así que no es posicionable por separado — hubo una entrada `video`
// con selector `#video-container` que nunca existió, dejando ese elemento fuera de la config
// guardada y haciendo fallar la validación del backend (que exigía las claves exactas) en cada
// GUARDAR (hallazgo tardío, ver problems_solutions.md del Requerimiento 010).
const ELEMENTS = [
  { key: 'karaoke', selector: '#karaoke-vr-component' },
  { key: 'songList', selector: '#karaoke-vr-component' },
  { key: 'newSong', selector: '#new-song-component', offset: [-1.6, 2.875, 0.05] },
];

// offset del marcador de `karaoke` calculado del video real que monta vr-karaoke-af: esquina
// superior izquierda (borde izquierdo, 0.3 por encima del borde superior, a la MISMA profundidad
// z del video). Con los valores de la vista original ("0 2.5 -3", 15x9) devuelve [-7.5, 7.3, -3],
// igual que el offset hardcodeado anterior; con el overlay (-3.2 1.6 -6, 6x3.6) devuelve
// [-6.2, 3.7, -6], pegado al video en vez de flotar delante de la cámara.
function resolveOffset(el, key) {
  if (key !== 'karaoke') return null;
  const comp = el.components && el.components['vr-karaoke-af'];
  if (!comp || !comp.data) return [-7.5, 7.3, -3];
  const vp = String(comp.data.videoPosition || '0 2.5 -3').trim().split(/\s+/).map(Number);
  const vx = Number.isFinite(vp[0]) ? vp[0] : 0;
  const vy = Number.isFinite(vp[1]) ? vp[1] : 2.5;
  const vz = Number.isFinite(vp[2]) ? vp[2] : -3;
  const vw = Number.isFinite(comp.data.videoWidth) ? comp.data.videoWidth : 15;
  const vh = Number.isFinite(comp.data.videoHeight) ? comp.data.videoHeight : 9;
  return [vx - vw / 2, vy + vh / 2 + 0.3, vz];
}

// offset del marcador de `songList`, en coordenadas del host `#karaoke-vr-component` (que no tiene
// scale): listPosition + esquina superior izquierda de la lista * escalaLista. La lista (ancho 4)
// está escalada por `escalaLista`; su fondo arranca en y local 0.4 (ver _buildSongListUI de
// VRKaraokeAf.js: `-backgroundHeight/2 + 0.4`), así que el borde superior queda en 0.4 y el
// marcador se ancla 0.3 por encima (mismo margen que el video). Con la vista original
// ("12.0 6.15 -3", escala 2.2) devuelve [7.6, 7.69, -3]; con el overlay ("3.2 1.6 -6", escala 0.85)
// devuelve [1.5, 2.2, -6].
function resolveSongListOffset(comp) {
  if (!comp || !comp.data) return [6, 2.2, -3];
  const lp = String(comp.data.listPosition || '6 2.5 -3').trim().split(/\s+/).map(Number);
  const lx = Number.isFinite(lp[0]) ? lp[0] : 6;
  const ly = Number.isFinite(lp[1]) ? lp[1] : 2.5;
  const lz = Number.isFinite(lp[2]) ? lp[2] : -3;
  const scale = Number.isFinite(comp.data.escalaLista) ? comp.data.escalaLista : 1.0;
  return [lx - 2 * scale, ly + 0.7 * scale, lz];
}

function parsePosition(attrValue) {
  if (attrValue && typeof attrValue === 'object') {
    return [attrValue.x || 0, attrValue.y || 0, attrValue.z || 0];
  }
  return [0, 0, 0];
}

function formatCoords(pos) {
  const x = Array.isArray(pos) ? pos[0] : pos.x;
  const y = Array.isArray(pos) ? pos[1] : pos.y;
  const z = Array.isArray(pos) ? pos[2] : pos.z;
  return `${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}`;
}

// Un widget por elemento: marcador clickeable (círculo rojo) que despliega/oculta un d-pad con
// las coordenadas actuales, 6 botones de movimiento (↑↓←→ + acercar/alejar en Z), un input HTML
// para el incremento de cada click (por defecto 0.01, en el centro del d-pad) y un botón GUARDAR
// — todos hijos del propio elemento salvo el input (HTML, proyectado sobre pantalla). Mover con
// el d-pad solo actualiza la posición en pantalla; el ajuste recién se registra en la base de
// datos al pulsar GUARDAR (a pedido explícito, en vez de guardar en cada click).
export function createWidget(el, offset, onMove, onSave, getDisplayPos) {
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
    const displayPos = getDisplayPos ? getDisplayPos() : el.getAttribute('position');
    coordsLabel.setAttribute('value', formatCoords(displayPos));
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

  // Reposiciona el marcador + d-pad sobre un nuevo anclaje (offset relativo al `el`). Se usa en
  // `songList`: su marcador vive en el host `#karaoke-vr-component`, pero la lista (hija del host)
  // se mueve sin mover el host, así que al mover la lista hay que re-anclar el widget para que el
  // 📍 siga pegado a la esquina de la lista en vez de quedarse en la posición original.
  const setAnchor = ([nx, ny, nz]) => {
    marker.setAttribute('position', `${nx} ${ny} ${nz}`);
    dpad.setAttribute('position', `${nx} ${ny - 0.9} ${nz}`);
  };

  return { clickables, dpad, marker, inputAnchor, stepInput, refreshCoordsLabel, setAnchor };
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

// Resuelve un elemento de `ELEMENTS` a un target de posición: `host` es el elemento al que se
// ancla el widget (marcador + d-pad); `getPos`/`setPos` desacoplan "dónde vive el widget" de "qué
// posición se edita". Para `karaoke`/`newSong` host === elemento y la posición es la del propio
// host; para `songList` el host es `#karaoke-vr-component` pero la posición editada es la del
// contenedor de la lista (this._videoListContainer de VRKaraokeAf.js), que se crea dinámicamente
// y se re-crea al agregar una canción.
function resolveTarget(hostEl, key) {
  if (key === 'songList') {
    const comp = hostEl.components && hostEl.components['vr-karaoke-af'];
    if (!comp) return null;
    const getListEl = () => comp._videoListContainer;
    return {
      key,
      host: hostEl,
      offset: resolveSongListOffset(comp),
      getPos: () => {
        const listEl = getListEl();
        return listEl ? parsePosition(listEl.getAttribute('position')) : parsePosition(comp.data.listPosition);
      },
      setPos: (p) => {
        const listEl = getListEl();
        if (listEl) listEl.setAttribute('position', `${p[0]} ${p[1]} ${p[2]}`);
        try { comp.data.listPosition = `${p[0]} ${p[1]} ${p[2]}`; } catch (e) {}
      },
      // Al mover la lista, el marcador (hijo del host) no se mueve solo — re-anclarlo a la nueva
      // esquina de la lista para que el 📍 siga pegado a ella.
      reanchor: (widget) => widget.setAnchor(resolveSongListOffset(comp)),
    };
  }
  const def = ELEMENTS.find((e) => e.key === key);
  const offset = (def && def.offset) || resolveOffset(hostEl, key);
  return {
    key,
    host: hostEl,
    offset,
    getPos: () => parsePosition(hostEl.getAttribute('position')),
    setPos: (p) => hostEl.setAttribute('position', `${p[0]} ${p[1]} ${p[2]}`),
  };
}

export function initPositionControl() {
  const sceneEl = document.querySelector('a-scene');
  if (!sceneEl) return;

  setupSharedRaycast(sceneEl);
  startNumericInputProjection(sceneEl);

  const targets = ELEMENTS.map((e) => {
    const hostEl = document.querySelector(e.selector);
    if (!hostEl) return null;
    return resolveTarget(hostEl, e.key);
  }).filter(Boolean);
  if (!targets.length) return;

  // Estado en memoria: arranca con lo que cada elemento ya trae en el DOM (hardcodeado en
  // index.html o en el schema del componente), y se reemplaza por lo guardado (si existe) al
  // cargar más abajo.
  const state = {};
  targets.forEach((t) => {
    state[t.key] = t.getPos();
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
    let widget = null;
    const onMove = (dx, dy, dz) => {
      const pos = state[t.key];
      const next = [
        +(pos[0] + dx).toFixed(2),
        +(pos[1] + dy).toFixed(2),
        +(pos[2] + dz).toFixed(2),
      ];
      state[t.key] = next;
      t.setPos(next);
      if (t.reanchor) t.reanchor(widget);
    };
    widget = createWidget(t.host, t.offset, onMove, persist, t.getPos);
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
        t.setPos(elConfig.position);
        if (t.reanchor) t.reanchor(t.widget);
        t.widget.refreshCoordsLabel();
      }
    });
  });

  // La lista de canciones se re-crea al agregar una canción (VRKaraokeAf._initSongList crea un
  // `_videoListContainer` nuevo con listPosition del schema, perdiendo la posición editada). Se
  // vigila por referencia (mismo patrón que el puente de video de aframe-overlay-modules.js) para
  // re-aplicar la posición en memoria al contenedor nuevo, sin tocar VRKaraokeAf.js.
  const songListTarget = targets.find((t) => t.key === 'songList');
  if (songListTarget) {
    const karaokeEl = document.querySelector('#karaoke-vr-component');
    const comp = () => karaokeEl && karaokeEl.components && karaokeEl.components['vr-karaoke-af'];
    let lastListEl = comp() && comp()._videoListContainer;
    setInterval(() => {
      const c = comp();
      const listEl = c && c._videoListContainer;
      if (listEl && listEl !== lastListEl) {
        lastListEl = listEl;
        songListTarget.setPos(state.songList);
        songListTarget.reanchor(songListTarget.widget);
        songListTarget.widget.refreshCoordsLabel();
      }
    }, 300);
  }
}
