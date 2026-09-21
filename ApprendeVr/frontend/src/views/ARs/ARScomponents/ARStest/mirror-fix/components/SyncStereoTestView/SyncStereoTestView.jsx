import React, { useEffect, useRef, useState } from 'react';
import CameraOverlaySync from './components/CameraOverlaySync';
import VRLocalVideoOverlaySync from './components/VRLocalVideoOverlaySync';
import VRConeOverlaySync from './components/VRConeOverlaySync';
import VRKaraokeOverlaySync from './components/VRKaraokeOverlaySync';
import VRYoutubeVideoOverlaySync from './components/VRYoutubeVideoOverlaySync';
import VRSongTextOverlaySync from './components/VRSongTextOverlaySync';
import VRNewSongOverlaySync from './components/VRNewSongOverlaySync';
import SyncConfigCompassMenu from './components/SyncConfigCompassMenu';
import { getUserSetting, saveUserSetting, detectDeviceType } from '../../../../../../A-frame/vrUserSettingsApi.util.js';
import { getStoredAuth } from '../../../../../../A-frame/vrAuth.util.js';
import { exitFullscreen } from '../../fullscreenHelper.js';

// Requerimiento 012 (ajuste pedido tras revisión): persistencia de qué overlays quedan
// seleccionados en el menú de AR-SYNC — mismo patrón `getUserSetting`/`saveUserSetting` que usa
// vrPositionControl.js (Requerimiento 010) para los widgets de posición, con su propia clave de
// vista para no chocar con las demás (`aframe-view`, `evaluation-panel`, etc.).
const OVERLAYS_SETTINGS_VIEW = 'ars-sync-overlays';
// Requerimiento 012 (ajuste pedido tras revisión): mismo patrón de persistencia explícita para la
// pestaña "Configuración" (separación/ancho/alto de los paneles), vista propia para no chocar con
// `ars-sync-overlays`.
const CONFIG_SETTINGS_VIEW = 'ars-sync-config';
// Requerimiento 013 (ampliación): posición de la brújula 3D (widget 📍 + d-pad de
// SyncConfigCompassMenu.jsx). Vista propia, mismo patrón que las dos de arriba.
const COMPASS_POSITION_VIEW = 'ars-sync-compass-position';
// Requerimiento 016: apariencia/comportamiento del cursor visible de AR-SYNC (posición relativa a
// la cámara, escala, tiempo de activación, color, geometría, visibilidad — ver
// SyncConfigCompassMenu.jsx, fila "Cursor" del tab "Interfaz"). Vista propia, mismo patrón que las
// de arriba.
const CURSOR_SETTINGS_VIEW = 'ars-sync-cursor';
// Requerimiento 013 (ajuste pedido por el usuario): el menú vive en el origen de la escena; la
// cámara se ubica aparte, arriba, mirando hacia abajo (ver CAMERA_POSITION en
// SyncConfigCompassMenu.jsx) — antes el menú estaba a 4m de una cámara a la altura de los ojos.
const DEFAULT_COMPASS_POSITION = { x: 0, y: 0, z: 0 };

// Overlays sincronizables por postMessage (todos menos 'camera', que no necesita sync — ver
// CameraOverlaySync.jsx). Cada uno se renderiza apilado (position absolute) sobre la cámara.
// 'karaoke' (Requerimiento 011) reusa los componentes A-Frame reales de src/views/A-frame
// (lista de canciones + agregar canción) importados tal cual — ver VRKaraokeOverlaySync.jsx.
const SYNCABLE_OVERLAYS = {
  video: VRLocalVideoOverlaySync,
  cone: VRConeOverlaySync,
  karaoke: VRKaraokeOverlaySync,
  youtubeVideo: VRYoutubeVideoOverlaySync,
  // Overlay "Song Text": letra de la canción seleccionada (frase anterior/actual/futura) — lee el
  // estado de reproducción publicado por este mismo componente en localStorage (ver el efecto de
  // broadcast más abajo), sin un puente de postMessage propio para el contenido.
  songText: VRSongTextOverlaySync,
  // Requerimiento 014 (ampliación): panel "New Song" separado de "karaoke" en su propio overlay
  // independiente — antes era una entidad más dentro del MISMO iframe que "karaoke" (ver
  // aframe-overlay-modules.html), pedido del usuario para poder activarlo/desactivarlo aparte.
  newSong: VRNewSongOverlaySync,
};

const layerStyle = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' };

// Mismos rangos que tenían los `<input type="range">` originales (min/max) — el panel 3D de la
// brújula manda deltas (+/- un paso), así que hay que acotarlos acá, del lado que sí conoce el
// límite real de cada campo.
const CONFIG_RANGES = {
  separation: { min: 0, max: 100 },
  width: { min: 200, max: 900 },
  height: { min: 200, max: 900 },
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Requerimiento 013 (hallazgo pedido por el usuario): antirebote del toggle de overlay. La brújula
// está duplicada por ojo (un iframe por panel estéreo) y sus cámaras van sincronizadas, así que
// ambos paneles apuntan al MISMO overlay y disparan `compass-toggle-overlay` casi a la vez — sin
// este antirebote el overlay se activa y desactiva al instante (dos toggles consecutivos). Se
// ignora cualquier toggle de la MISMA clave dentro de este delay (mínimo 1 segundo pedido).
const OVERLAY_TOGGLE_DEBOUNCE_MS = 1000;
// Requerimiento 013 (sync de visibilidad del menú): antirebote del toggle de la X de la dona.
// Mismo motivo que el overlay: ambas brújulas (un ojo cada una, cámaras sincronizadas) disparan la
// X casi a la vez, así que sin este delay el estado alternaría dos veces y volvería al punto de
// partida (o quedaría desfasado). El padre es la fuente de verdad: ignora toggles repetidos dentro
// de 1 segundo y rebroadcastea un único estado a ambas instancias.
const COMPASS_WHEEL_TOGGLE_DEBOUNCE_MS = 1000;

/**
 * SyncStereoTestView — Requerimiento 002, enfoque alternativo al espejo por captura de píxeles:
 * dos instancias reales e independientes de cada overlay seleccionado, sincronizadas en tiempo
 * real vía postMessage. Este componente es el relay: escucha mensajes de CUALQUIERA de los
 * iframes y los reenvía únicamente a su contraparte del MISMO tipo de overlay en el otro panel
 * (nunca al que lo emitió, y nunca a un overlay de otro tipo si hay varios apilados a la vez).
 *
 * Los overlays seleccionados se apilan dentro de cada panel: la cámara (si está marcada) va de
 * fondo, sin necesitar sincronización — cada panel pide su propia cámara en vivo, y como ambos
 * leen el mismo dispositivo físico ya están "sincronizados" sin ningún esfuerzo extra. Los demás
 * overlays (video, cono) tienen fondo transparente en su `<a-scene>`, así que se ven compuestos
 * sobre la cámara, igual que en el flujo real de producción (video/overlay con zIndex 2 sobre el
 * `<video>` con zIndex 1, ver ARPanel.jsx).
 *
 * Requerimiento 013: el menú de configuración (separación/ancho/alto de los paneles, selección
 * múltiple de overlays) ya no se abre con un botón ☰ fijo ni se muestra como HTML 2D — es geometría
 * A-Frame dentro de la propia brújula 3D (SyncConfigCompassMenu.jsx, "panel 3D interactivo con el
 * raycaster", pedido explícito del usuario). Esta vista sigue siendo la dueña del estado real
 * (separación/ancho/alto/overlays seleccionados/guardado) y de `getUserSetting`/`saveUserSetting`
 * — la brújula solo cachea lo último recibido por `compass-config-state` y manda deltas/acciones
 * (`compass-update-separation/width/height`, `compass-toggle-overlay`,
 * `compass-save-config`/`compass-save-overlays`), mismo patrón que ya usa el widget de posición.
 *
 * No reutiliza ARStereoView.jsx a propósito — ese componente está pensado para el mecanismo de
 * espejo por captura (Intentos 1-6), no para sincronización de estado. Mantenerlos separados
 * evita mezclar dos arquitecturas distintas en el mismo componente mientras se evalúan.
 *
 * Componente de prueba aislado, no se usa desde ningún archivo de producción.
 */
const SyncStereoTestView = ({ onClose }) => {
  // Un ref por tipo de overlay sincronizable, por panel — se crean todos de una, se usen o no,
  // así el relay siempre tiene dónde mirar sin tener que crear/destruir refs dinámicamente.
  // Derivado de SYNCABLE_OVERLAYS (no hardcodeado aparte) para que agregar una clave ahí alcance:
  // un objeto literal aparte se desincroniza en silencio (TypeError en runtime al no encontrar la
  // clave nueva, como pasó al agregar 'karaoke' en el Requerimiento 011).
  const makeRefs = () => Object.fromEntries(Object.keys(SYNCABLE_OVERLAYS).map((key) => [key, React.createRef()]));
  const leftRefs = useRef(makeRefs());
  const rightRefs = useRef(makeRefs());
  // Requerimiento 013: refs de la brújula 3D (una por panel, no keyed por tipo de overlay — solo
  // existe un menú de configuración, no una selección de varios).
  const leftCompassRef = useRef(null);
  const rightCompassRef = useRef(null);
  // Requerimiento 013 (antirebote del toggle, ver OVERLAY_TOGGLE_DEBOUNCE_MS): último timestamp de
  // toggle por clave. Vive en un ref (no en estado) porque `handleMessage` (registrado una vez,
  // deps `[]`) debe leer/escribir siempre el valor más reciente, no el capturado en el primer render.
  const lastOverlayToggleAtRef = useRef({});
  // Mismo antirebote que `lastOverlayToggleAtRef`, pero para el toggle único "Doble panel" (pedido
  // del usuario): un timestamp simple alcanza, no hace falta un objeto por clave.
  const lastDualPanelToggleAtRef = useRef(0);
  // Requerimiento 013 (sync de visibilidad del menú, pedido por el usuario): estado fuente de
  // verdad de si la dona (`#compass-wheel`) está visible. Ambas brújulas arrancan visibles; cada
  // vez que una cambia el estado, el padre lo guarda acá y lo relaya a la otra, así nunca se
  // desincronizan. Ref (no estado) porque `handleMessage` está registrado con deps `[]`.
  const compassWheelVisibleRef = useRef(true);
  // Requerimiento 013 (antirebote del toggle de la X, ver COMPASS_WHEEL_TOGGLE_DEBOUNCE_MS): último
  // timestamp del toggle de visibilidad. Ref por el mismo motivo que `compassWheelVisibleRef`.
  const compassWheelToggleAtRef = useRef(0);
  // Pedido del usuario: al pasar de un panel a dos (o viceversa), el panel recién montado
  // arrancaba desincronizado del que ya venía funcionando — un video reproduciendo y el otro no,
  // un menú de Configuración/Overlays abierto y el otro cerrado. Causa: hasta ahora solo se
  // relayaban EVENTOS (play/pause, abrir sección) en el momento en que ocurrían, sin ninguna
  // fuente de verdad que un panel nuevo pudiera consultar al montar. Estos dos refs son esa
  // fuente de verdad (mismo patrón que `compassWheelVisibleRef`): el padre los actualiza cuando
  // ve el evento real, y responde con el valor vigente cuando un panel recién montado lo pide
  // ('karaoke-ready'/dentro de 'compass-ready') — ver esos handlers más abajo.
  const karaokePlayingRef = useRef(false);
  // Pedido del usuario: "al seleccionar desde la lista de canciones aun no sincronizan, debe
  // funcionar como un stop que pare cualquier cancion que este sonando y reinicie la seleccionada
  // desde el comienzo" — fuente de verdad de QUÉ canción (`fileName`) está activa en ambos
  // paneles, mismo patrón que `karaokePlayingRef`/`compassSectionRef`: se actualiza cuando llega
  // 'karaoke-song-select' de cualquier panel y se le contesta a un panel recién montado en su
  // propio 'karaoke-ready' (ver más abajo), para que no arranque con la canción por defecto si el
  // hermano ya había elegido otra antes de que este existiera (p.ej. al activar "Doble panel").
  const karaokeSongRef = useRef(null);
  // Pedido del usuario (ampliación, segunda vuelta): en vez de que cada panel reporte su tiempo
  // cada 1s (descartado — polling innecesario), el padre lleva su PROPIO reloj matemático: guarda
  // en qué segundo del video estaba la última vez que cambió algo (play/pause/seek) y CUÁNDO
  // (reloj real, `Date.now()`) pasó eso. El tiempo actual se calcula sumando el tiempo transcurrido
  // desde entonces (si está reproduciendo) — ver `getKaraokeCurrentTime()` más abajo. Los paneles
  // ya no reportan nada en vivo; solo preguntan UNA VEZ al montar ('karaoke-ready').
  const karaokeTimeAtRef = useRef(0); // segundo del video en karaokeTimeSetAtRef
  const karaokeTimeSetAtRef = useRef(0); // Date.now() de esa referencia
  // Segundo actual del karaoke, calculado a partir de la última referencia conocida — nunca
  // "adivina" preguntándole a un panel, siempre es una cuenta matemática con lo que el padre ya
  // sabe. Solo suma tiempo real transcurrido si está reproduciendo; en pausa devuelve la
  // referencia congelada tal cual.
  const getKaraokeCurrentTime = () => {
    if (!karaokePlayingRef.current) return karaokeTimeAtRef.current;
    return karaokeTimeAtRef.current + (Date.now() - karaokeTimeSetAtRef.current) / 1000;
  };
  // Pedido del usuario: "al poner pause el tiempo se iguale al menor tiempo de ambos paneles...
  // el usuario no puede ver numeros diferentes en ambos paneles" — cada panel reproduce su propio
  // <video> de forma independiente, así que aunque arrancaron juntos pueden ir levemente
  // desalineados en `currentTime`. Guarda el `currentTime` real del panel que originó el pause
  // (mensaje 'karaoke-pause', ver más abajo) mientras se espera la confirmación del panel hermano
  // ('karaoke-pause-landed', que manda `applyPlayCommand` al aplicar el pause remoto) para poder
  // comparar ambos y fijar a los dos el MENOR, en vez de dejar que cada uno se congele donde le
  // tocó.
  const pendingPauseOriginTimeRef = useRef(null);
  const compassSectionRef = useRef(null); // 'config' | 'overlays' | 'interface' | null (panel de ajustes cerrado)
  // Pedido del usuario (ampliación, sección 11): modo edición de posición — activa/desactiva los
  // marcadores rojos de vrPositionControl.js en el overlay real. Mismo patrón de fuente de verdad
  // que `compassSectionRef`: se guarda acá (parte de `configStateRef`, igual que `dualPanel`) y se
  // relaya a ambas brújulas (para el check) y a ambos overlays de karaoke (para mostrar/ocultar
  // los marcadores) — nunca aplica nada local antes del rebroadcast.
  const positionModeRef = useRef(false);
  const lastPositionModeToggleAtRef = useRef(0);
  // Qué elemento del overlay real está seleccionado para mover ahora mismo (o null) — fuente de
  // verdad para que una brújula recién montada muestre el d-pad ya abierto con el elemento
  // correcto, en vez de perder la selección al activar "Doble panel".
  const positionSelectedRef = useRef(null); // { key, position: [x,y,z] } | null
  // Requerimiento 012 (ampliación): no cambia durante la sesión (navigator.userAgent es estático),
  // así que no hace falta estado — se usa tanto para persistir (getUserSetting/saveUserSetting ya
  // lo detectan solas por su propio default, ver vrUserSettingsApi.util.js) como para que el panel
  // 3D de la brújula muestre "Guardar ... (Web)"/"(Móvil)" en sus botones.
  const deviceType = detectDeviceType();
  // Requerimiento 012 (ampliación pedida por el usuario): mostrar a qué cuenta queda atado el
  // guardado — diagnóstico directo en el propio menú para casos como "en el celular no guarda":
  // `apprendevr_auth` es por origen/navegador (localStorage), así que en un dispositivo que nunca
  // inició sesión en ESTE origen esto muestra "sin sesión" en vez de un email, señal inmediata de
  // que ni siquiera se intenta la llamada de red (ver vrUserSettingsApi.util.js).
  // Requerimiento 013 (ampliación, login-test): pasa de const a estado para que, tras iniciar
  // sesión con el usuario de prueba desde la brújula (sin salir de la vista), el email se refresque
  // y el broadcast de `compass-config-state` (que depende de `userEmail`) lo propague a ambos
  // paneles de la brújula.
  const [userEmail, setUserEmail] = useState(() => getStoredAuth()?.user?.email || null);

  const [separation, setSeparation] = useState(24);
  const [panelWidth, setPanelWidth] = useState(380);
  const [panelHeight, setPanelHeight] = useState(480);
  // Pedido del usuario: ver un solo panel (en vez de los dos estéreo) para probar sin gafas VR,
  // sin perder la sincronización/config cuando se vuelve a activar. Vive en la pestaña
  // "Configuración" junto a separación/ancho/alto (mismo botón "Guardar", ver saveConfig).
  const [dualPanel, setDualPanel] = useState(true);
  const [selectedOverlays, setSelectedOverlays] = useState(['camera', 'video']);
  // Requerimiento 012 (ajuste pedido tras revisión): feedback visual del botón "Guardar
  // selección" — gris mientras la selección actual coincide con lo último guardado con éxito,
  // vuelve a su color normal en cuanto se toca un checkbox (ya no coincide con lo guardado).
  const [overlaysSaved, setOverlaysSaved] = useState(false);
  // Mismo feedback ("gris" mientras coincide con lo último guardado) para la pestaña
  // "Configuración".
  const [configSaved, setConfigSaved] = useState(false);

  // Requerimiento 013 (ampliación): posición de la brújula 3D, movida con el widget 📍 + d-pad de
  // SyncConfigCompassMenu.jsx. Guardada en un ref además de en estado porque `handleMessage` (más
  // abajo) se registra una sola vez (deps `[]`) y necesita leer siempre el valor más reciente, no
  // el capturado en el closure del primer render — mismo motivo por el que el resto de este
  // handler ya lee `leftRefs.current`/`rightRefs.current` en vez de depender de props/estado.
  const [compassPosition, setCompassPosition] = useState(DEFAULT_COMPASS_POSITION);
  const compassPositionRef = useRef(compassPosition);
  useEffect(() => { compassPositionRef.current = compassPosition; }, [compassPosition]);

  // Requerimiento 016: config del cursor — null hasta que getUserSetting(CURSOR_SETTINGS_VIEW)
  // resuelve (o para siempre, si el usuario nunca guardó una); la brújula ya sabe usar su propio
  // DEFAULT_CURSOR_CONFIG local en ese caso (ver el chequeo de "msg.cursorConfig" en
  // SyncConfigCompassMenu.jsx), así que acá no hace falta un valor por defecto propio.
  const [cursorConfig, setCursorConfig] = useState(null);
  // Requerimiento 016: aframe-overlay-modules.js (overlay karaoke/new-song) y
  // youtube-video-modules.js son módulos ES reales (no srcDoc, pueden leer localStorage), así que
  // el tiempo de activación configurado se les comparte por ahí en vez de por postMessage — mismo
  // mecanismo ya usado para compartir la URL de YouTube entre paneles
  // (apprendevr_youtube_preview_url, Requerimiento 015). Se lee UNA vez al iniciar cada script (no
  // en vivo dentro de la misma sesión) — mismo criterio "estático al montar" que ya tenía
  // VRLocalVideoOverlaySync.jsx con su prop cursorFuseTimeout (nunca se le pasaba un valor real
  // antes de este requerimiento, ver investigación en problems_solutions.md).
  useEffect(() => {
    if (cursorConfig && typeof cursorConfig.fuseTimeout === 'number') {
      try { localStorage.setItem('apprendevr_cursor_fuse_timeout', String(cursorConfig.fuseTimeout)); } catch (e) { /* ignore */ }
    }
  }, [cursorConfig]);

  // Overlay "Song Text": publica en localStorage el estado de reproducción del karaoke (canción
  // seleccionada + tiempo actual + play/pause) para que el overlay `songText` (un iframe del mismo
  // origen) muestre la letra sincronizada sin un puente de postMessage propio — mismo mecanismo de
  // origen compartido que ya usa la URL de YouTube (apprendevr_youtube_preview_url, Requerimiento
  // 015). Se escribe a baja frecuencia (~4x/seg), suficiente para el resaltado de frases (cambian
  // cada ~2-4s); el propio overlay interpola el tiempo entre escrituras (ver song-text-modules.js).
  // Lee de los refs (`getKaraokeCurrentTime`/`karaokePlayingRef`/`karaokeSongRef`), así que siempre
  // ve el valor vigente aunque este efecto esté registrado con deps `[]`.
  useEffect(() => {
    const publish = () => {
      try {
        localStorage.setItem('apprendevr_karaoke_state', JSON.stringify({
          fileName: karaokeSongRef.current || '',
          time: getKaraokeCurrentTime(),
          playing: karaokePlayingRef.current,
        }));
      } catch (e) { /* ignore */ }
    };
    publish();
    const id = setInterval(publish, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Requerimiento 013 (panel 3D): mismo motivo que `compassPositionRef` — `handleMessage` (más
  // abajo) se registra una sola vez y necesita el valor más reciente de todo lo que el panel 3D
  // de la brújula puede pedir guardar (separación/ancho/alto/overlays), no el del primer render.
  // Sin dependencias: se refresca después de CADA render, más simple que listar cada campo.
  // `width`/`height` (no `panelWidth`/`panelHeight`) porque son los nombres que usa
  // `CONFIG_FIELDS` del lado de la brújula (SyncConfigCompassMenu.jsx) — este ref (y el broadcast
  // de más abajo) alimentan directamente el mensaje `compass-config-state`, así que usan ESE
  // vocabulario; `panelWidth`/`panelHeight` siguen siendo los nombres de estado/DB acá adentro
  // (ver `saveConfig`).
  const configStateRef = useRef(null);
  useEffect(() => {
    configStateRef.current = { separation, width: panelWidth, height: panelHeight, dualPanel, positionMode: positionModeRef.current, configSaved, selectedOverlays, overlaysSaved, cursorConfig };
  });

  // Carga la selección/config/posición guardadas (si las hay). Se usa tanto al montar como al
  // cambiar de usuario vía login-test (ver doLoginTest): primero se resetea a defaults para que no
  // queden visibles los ajustes del usuario anterior cuando el nuevo no tiene nada guardado, y
  // luego se aplica lo guardado si existe. Sin sesión o sin ajuste guardado, getUserSetting
  // resuelve `null` y quedan los defaults de arriba — mismo comportamiento "sin romper nada" que
  // vrPositionControl.js.
  const loadUserSettings = () => {
    setSeparation(24);
    setPanelWidth(380);
    setPanelHeight(480);
    setDualPanel(true);
    setSelectedOverlays(['camera', 'video']);
    setOverlaysSaved(false);
    setConfigSaved(false);
    setCursorConfig(null);

    getUserSetting(OVERLAYS_SETTINGS_VIEW).then((setting) => {
      // getUserSetting ya resuelve el `config` guardado directamente (no envuelto en `.config` —
      // ese envoltorio solo lo usa el body del PUT, ver vrUserSettingsApi.util.js), mismo
      // consumo que hace vrPositionControl.js con su propio `saved`.
      const saved = setting && Array.isArray(setting.selectedOverlays)
        ? setting.selectedOverlays
        : null;
      if (saved) {
        setSelectedOverlays(saved);
        setOverlaysSaved(true);
      }
    });
    getUserSetting(CONFIG_SETTINGS_VIEW).then((setting) => {
      const hasValidConfig = setting &&
        typeof setting.separation === 'number' &&
        typeof setting.panelWidth === 'number' &&
        typeof setting.panelHeight === 'number';
      if (hasValidConfig) {
        setSeparation(setting.separation);
        setPanelWidth(setting.panelWidth);
        setPanelHeight(setting.panelHeight);
        // Campo agregado después de que ya existieran filas guardadas sin él (ver Requerimiento
        // de "Doble panel"): un ajuste guardado viejo simplemente no lo trae, y el default (true,
        // ya seteado por loadUserSettings arriba) sigue aplicando sin romper nada.
        if (typeof setting.dualPanel === 'boolean') setDualPanel(setting.dualPanel);
        setConfigSaved(true);
      }
    });
    getUserSetting(COMPASS_POSITION_VIEW).then((setting) => {
      const hasValidPosition = setting &&
        typeof setting.x === 'number' && typeof setting.y === 'number' && typeof setting.z === 'number';
      if (hasValidPosition) setCompassPosition({ x: setting.x, y: setting.y, z: setting.z });
    });
    // Requerimiento 016: no valida la forma acá (eso ya lo hizo el backend al guardar, vía
    // isValidArsSyncCursorConfig) — mismo criterio "confía en lo que ya persistió" que el resto de
    // estos getUserSetting.
    getUserSetting(CURSOR_SETTINGS_VIEW).then((setting) => {
      if (setting) setCursorConfig(setting);
    });
  };

  useEffect(() => {
    loadUserSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleOverlay = (key) => {
    setOverlaysSaved(false);
    setSelectedOverlays((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Pedido del usuario: "PREVIEW ON YOUTUBE" (VRNewSongAf.js, dentro del overlay `karaoke`) debe
  // abrir el overlay real "Youtube Video" en vez de su propio panel flotante. A diferencia de
  // `toggleOverlay` (togglea on/off, usado por el checkbox del menú), esto es una activación —
  // solo agrega la clave si todavía no está seleccionada, nunca la apaga (un click en "PREVIEW"
  // repetido no debería desactivar el overlay que el propio usuario recién pidió ver).
  const activateOverlay = (key) => {
    setSelectedOverlays((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setOverlaysSaved(false);
  };

  // Guardado explícito (botón "Guardar" al inicio de la lista de overlays, no autosave al
  // togglear) — el usuario pidió que la selección se guarde bajo su propia acción, no en cada
  // click de checkbox. El botón se pone gris solo si el guardado terminó en éxito (200), no de
  // forma optimista.
  // Requerimiento 013 (hallazgo): lee de `configStateRef.current` (no del closure `selectedOverlays`)
  // porque `handleMessage` se registra UNA sola vez (deps `[]`) y captura la referencia de esta
  // función del PRIMER render — con el closure habría guardado siempre el default `['camera',
  // 'video']`, no la selección actual del usuario (confirmado en DB: la fila quedó con el default).
  const saveSelectedOverlays = () => {
    const overlays = configStateRef.current ? configStateRef.current.selectedOverlays : selectedOverlays;
    saveUserSetting(OVERLAYS_SETTINGS_VIEW, { selectedOverlays: overlays }).then((ok) => {
      if (ok) setOverlaysSaved(true);
    });
  };

  // Wrappers de los sliders (en vez de pasar los setters de useState directo, como antes): marcan
  // la config como "no guardada" (botón vuelve a verde) apenas se mueve cualquier slider — mismo
  // criterio que `toggleOverlay` con `overlaysSaved`.
  const updateSeparation = (value) => { setConfigSaved(false); setSeparation(value); };
  const updateWidth = (value) => { setConfigSaved(false); setPanelWidth(value); };
  const updateHeight = (value) => { setConfigSaved(false); setPanelHeight(value); };
  const toggleDualPanel = () => { setConfigSaved(false); setDualPanel((prev) => !prev); };

  const saveConfig = () => {
    // Requerimiento 013 (hallazgo): mismo motivo que `saveSelectedOverlays` — leer del ref, no del
    // closure, porque `handleMessage` captura esta función del primer render (deps `[]`).
    const current = configStateRef.current;
    const separationVal = current ? current.separation : separation;
    const widthVal = current ? current.width : panelWidth;
    const heightVal = current ? current.height : panelHeight;
    const dualPanelVal = current ? current.dualPanel : dualPanel;
    saveUserSetting(CONFIG_SETTINGS_VIEW, { separation: separationVal, panelWidth: widthVal, panelHeight: heightVal, dualPanel: dualPanelVal }).then((ok) => {
      if (ok) setConfigSaved(true);
    });
  };

  // Requerimiento 013 (ampliación): las porciones "Volver"/"Cerrar sesión" de la brújula
  // reemplazan al botón "Volver" que tenía esta vista (`closeButtonStyle`, quitado) y al botón
  // "← Volver a inicio" de ARTestMirrorButton.jsx (oculto mientras AR-SYNC está abierto, ver ese
  // archivo) — "cerrar sesión" de verdad borra la credencial guardada, no es solo un alias de
  // "volver a inicio".
  const doLogout = () => {
    try { localStorage.removeItem('apprendevr_auth'); } catch (e) { /* localStorage no disponible */ }
    exitFullscreen();
    window.location.href = '/';
  };

  // Requerimiento 013 (ampliación, login-test): inicia sesión con el usuario de prueba sin salir
  // de la vista AR-SYNC, para recargar sus configuraciones al toque (pedido del usuario: "para no
  // tener que salir de la vista y cargar las configuraciones a este usuario"). Mismo contrato del
  // login 3D (App.jsx submitLogin): POST /api/auth/login (vía proxy Vite) devuelve
  // `{ access_token, user }`, que se guarda en localStorage['apprendevr_auth'] y alimenta
  // getUserSetting/saveUserSetting (vrAuth.util.js). Tras guardar, se actualiza el email y se
  // recargan las tres vistas de ajustes del nuevo usuario.
  const doLoginTest = async () => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'prueba@gmail.com', password: '123456' }),
      });
      if (!res.ok) {
        console.warn(`login-test: /api/auth/login devolvió ${res.status}.`);
        return;
      }
      const data = await res.json();
      localStorage.setItem('apprendevr_auth', JSON.stringify(data));
      setUserEmail(data?.user?.email || 'prueba@gmail.com');
      loadUserSettings();
    } catch (e) {
      // Mismo motivo típico que getUserSetting: certificado HTTPS autofirmado sin confiar en el
      // dispositivo — el login no llega a ejecutarse.
      console.warn('login-test: falló la llamada de login (¿HTTPS autofirmado sin confiar?).', e);
    }
  };

  // Requerimiento 013 (panel 3D): empuja el estado actual a las dos instancias de la brújula cada
  // vez que algo que el panel muestra cambia — cubre tanto los cambios que salen DEL panel (llegan
  // acá como `compass-update-*`/`compass-toggle-overlay`, ver `handleMessage`, y el nuevo estado
  // resultante se reenvía en este mismo efecto) como los que ya venían de otro lado (p. ej. la
  // carga inicial de `getUserSetting`, que no pasa por la brújula). El "avance" para una brújula
  // que todavía no cargó (antes de mandar su primer `compass-ready`) lo cubre el propio handler de
  // `compass-ready` más abajo, así que perder este primer broadcast no es un problema.
  useEffect(() => {
    // Hallazgo real (reportado por el usuario: el d-pad de posición "se desvinculaba" solo al
    // moverlo): este broadcast periódico NO incluía `positionMode` — cualquier cambio de los
    // otros campos (guardar overlays, tocar separación, etc.) mientras el d-pad estaba abierto
    // reenviaba un `compass-config-state` con `positionMode` ausente, y `refreshDisplay()` del
    // lado de la brújula lo leía como `false` y ocultaba el d-pad (`hidePositionDpad()`).
    // `positionModeRef` es un ref (no dispara este efecto por sí solo, no puede ir en deps), pero
    // se lee su valor vigente cada vez que el efecto corre por cualquier otro motivo.
    const state = { separation, width: panelWidth, height: panelHeight, dualPanel, positionMode: positionModeRef.current, configSaved, selectedOverlays, overlaysSaved, deviceType, userEmail, cursorConfig };
    [leftCompassRef.current?.contentWindow, rightCompassRef.current?.contentWindow]
      .filter(Boolean)
      .forEach((w) => w.postMessage({ source: 'ars-sync-test', action: 'compass-config-state', ...state }, '*'));
  }, [separation, panelWidth, panelHeight, dualPanel, configSaved, selectedOverlays, overlaysSaved, deviceType, userEmail, cursorConfig]);

  useEffect(() => {
    const handleMessage = (ev) => {
      const msg = ev.data;
      if (!msg || msg.source !== 'ars-sync-test') return;

      // Requerimiento 013 (ampliación): acciones inmediatas de la brújula (Volver/Cerrar sesión) —
      // no abren ningún panel, solo disparan la acción correspondiente.
      if (msg.action === 'compass-do-action') {
        if (msg.name === 'back') onClose();
        else if (msg.name === 'logout') doLogout();
        else if (msg.name === 'login-test') doLoginTest();
        return;
      }

      // Requerimiento 013 (panel 3D): deltas de los steppers +/- de "Configuración" — se acotan acá
      // (`CONFIG_RANGES`, la brújula no conoce los límites) y se aplican con la forma funcional de
      // `setState` para no depender del valor capturado en el closure de este `handleMessage`
      // (registrado una sola vez, `deps: []`).
      if (msg.action === 'compass-update-separation') {
        updateSeparation((prev) => clamp(prev + msg.delta, CONFIG_RANGES.separation.min, CONFIG_RANGES.separation.max));
        return;
      }
      if (msg.action === 'compass-update-width') {
        updateWidth((prev) => clamp(prev + msg.delta, CONFIG_RANGES.width.min, CONFIG_RANGES.width.max));
        return;
      }
      if (msg.action === 'compass-update-height') {
        updateHeight((prev) => clamp(prev + msg.delta, CONFIG_RANGES.height.min, CONFIG_RANGES.height.max));
        return;
      }
      if (msg.action === 'compass-toggle-dual-panel') {
        // Mismo antirebote que 'compass-toggle-overlay': los dos paneles disparan este mensaje
        // casi a la vez (cámaras sincronizadas) — sin esto, el segundo toggle instantáneo lo
        // dejaría como estaba.
        const now = Date.now();
        if (now - lastDualPanelToggleAtRef.current < OVERLAY_TOGGLE_DEBOUNCE_MS) return;
        lastDualPanelToggleAtRef.current = now;
        toggleDualPanel();
        return;
      }
      // Pedido del usuario (ampliación, sección 11): fila "Position" — mismo antirebote que
      // "Doble panel" (los dos ojos sincronizados pueden disparar el dwell casi a la vez).
      // A diferencia de 'compass-section-changed', esto SÍ necesita empujar un
      // 'compass-config-state' fresco de una (no alcanza con esperar el próximo broadcast
      // reactivo: `positionModeRef` es un ref, no dispara el efecto de arriba solo) para que el
      // check de la fila se vea al toque en las dos brújulas, y además avisa a TODOS los overlays
      // de contenido de ambos paneles para mostrar/ocultar sus marcadores rojos.
      //
      // Hallazgo real (reportado por el usuario: "no muestra el icono rojo para editar la
      // ubicacion desde interface position" en el overlay "Youtube Video"): este reenvío (y los
      // de 'position-element-selected'/'position-move'/'position-save'/'position-reset'/
      // 'position-step' de más abajo) estaban hardcodeados a `refs.current.karaoke` — el único
      // overlay de contenido que existía cuando se escribió esta lógica (Requerimiento 013). Al
      // agregar `youtube-video.html` como una página NUEVA y SEPARADA con su propio
      // `initPositionControl()` (Requerimiento 015), sus mensajes de modo posición nunca llegaban
      // ahí. Se itera `Object.keys(SYNCABLE_OVERLAYS)` (igual que ya hace el relevo genérico más
      // abajo del archivo) en vez de nombrar `karaoke` a mano — un overlay sin
      // `initPositionControl()` (video/cono) simplemente no tiene ningún listener para estas
      // acciones, así que recibirlas ahí es un no-op inofensivo.
      if (msg.action === 'compass-toggle-position-mode') {
        const now = Date.now();
        if (now - lastPositionModeToggleAtRef.current < OVERLAY_TOGGLE_DEBOUNCE_MS) return;
        lastPositionModeToggleAtRef.current = now;
        positionModeRef.current = !positionModeRef.current;
        // Apagar el modo posición sin una selección vigente no tiene sentido: el marcador que la
        // generó deja de ser clickeable/visible.
        if (!positionModeRef.current) positionSelectedRef.current = null;
        const freshState = { ...configStateRef.current, positionMode: positionModeRef.current };
        [leftCompassRef.current?.contentWindow, rightCompassRef.current?.contentWindow]
          .filter(Boolean)
          .forEach((w) => w.postMessage({ source: 'ars-sync-test', action: 'compass-config-state', ...freshState, deviceType, userEmail }, '*'));
        [leftRefs, rightRefs].forEach((refs) => {
          Object.keys(SYNCABLE_OVERLAYS).forEach((key) => {
            refs.current[key]?.current?.contentWindow?.postMessage(
              { source: 'ars-sync-test', action: 'position-mode-changed', enabled: positionModeRef.current },
              '*',
            );
          });
        });
        return;
      }
      // Un marcador rojo del overlay real se clickeó (o dejó de estar seleccionado) — se guarda
      // como fuente de verdad y se rebroadcastea a AMBAS brújulas: es configuración compartida
      // (qué elemento se está editando), no un input transitorio de un solo panel.
      if (msg.action === 'position-element-selected') {
        positionSelectedRef.current = { key: msg.key, position: msg.position, rotation: msg.rotation || [0, 0, 0], scale: typeof msg.scale === 'number' ? msg.scale : 1 };
        [leftCompassRef.current?.contentWindow, rightCompassRef.current?.contentWindow]
          .filter(Boolean)
          .forEach((w) => w.postMessage(msg, '*'));
        // Pedido del usuario (ampliación): también se reenvía a TODOS los overlays de contenido de
        // AMBOS paneles (ver hallazgo grande de arriba), para que pinten azul el marcador del
        // elemento seleccionado (y rojo el resto) — ver vrPositionControl.js
        // 'position-element-selected'. Sin esto, el panel hermano (o el propio, que no recibe su
        // propio postMessage) no enteraría el cambio de selección visual.
        [leftRefs, rightRefs].forEach((refs) => {
          Object.keys(SYNCABLE_OVERLAYS).forEach((key) => {
            refs.current[key]?.current?.contentWindow?.postMessage(msg, '*');
          });
        });
        return;
      }
      // Un +/- (o Guardar) del d-pad genérico de la brújula — se reenvía a TODOS los overlays de
      // contenido de AMBOS paneles (ahí vive el elemento real que hay que mover/guardar, ver
      // hallazgo grande de arriba), no solo al opuesto: mismo criterio que
      // 'position-element-selected'.
      if (msg.action === 'position-move' || msg.action === 'position-save' || msg.action === 'position-reset' || msg.action === 'position-step') {
        if (msg.action === 'position-move' && positionSelectedRef.current && positionSelectedRef.current.key === msg.key) {
          // Pedido del usuario: la escala es un solo delta, sin eje — se resuelve antes del
          // cálculo de axisIndex de abajo (posición/rotación, que sí lo necesitan).
          if (msg.kind === 'scale') {
            const nextScale = Math.max(0.1, +((positionSelectedRef.current.scale ?? 1) + msg.delta).toFixed(2));
            positionSelectedRef.current = { ...positionSelectedRef.current, scale: nextScale };
          } else {
            const axisIndex = ['x', 'y', 'z'].indexOf(msg.axis);
            if (axisIndex !== -1) {
              // Pedido del usuario (ampliación): `kind` distingue qué campo del elemento
              // seleccionado hay que actualizar en la fuente de verdad — mismo criterio que ya usa
              // vrPositionControl.js para aplicar el delta real.
              if (msg.kind === 'rotation') {
                const nextRot = (positionSelectedRef.current.rotation || [0, 0, 0]).slice();
                nextRot[axisIndex] = +(nextRot[axisIndex] + msg.delta).toFixed(2);
                positionSelectedRef.current = { ...positionSelectedRef.current, rotation: nextRot };
              } else {
                const nextPos = positionSelectedRef.current.position.slice();
                nextPos[axisIndex] = +(nextPos[axisIndex] + msg.delta).toFixed(2);
                positionSelectedRef.current = { ...positionSelectedRef.current, position: nextPos };
              }
            }
          }
        }
        [leftRefs, rightRefs].forEach((refs) => {
          Object.keys(SYNCABLE_OVERLAYS).forEach((key) => {
            refs.current[key]?.current?.contentWindow?.postMessage(msg, '*');
          });
        });
        return;
      }
      if (msg.action === 'compass-save-config') {
        saveConfig();
        return;
      }
      if (msg.action === 'compass-toggle-overlay') {
        // Requerimiento 013 (antirebote): los dos paneles estéreo disparan este mensaje casi a la
        // vez (cámaras sincronizadas), así que se descarta el segundo toggle de la misma clave
        // dentro de OVERLAY_TOGGLE_DEBOUNCE_MS — evita el "se activa y se desactiva" instantáneo.
        const now = Date.now();
        const last = lastOverlayToggleAtRef.current[msg.key] || 0;
        if (now - last < OVERLAY_TOGGLE_DEBOUNCE_MS) return;
        lastOverlayToggleAtRef.current[msg.key] = now;
        toggleOverlay(msg.key);
        return;
      }
      if (msg.action === 'compass-save-overlays') {
        saveSelectedOverlays();
        return;
      }
      if (msg.action === 'activate-overlay') {
        // Enviado por VRNewSongAf.js (dentro del overlay `karaoke`) al pulsar "PREVIEW ON
        // YOUTUBE" — la URL ya viaja por `localStorage` (mismo puente de campos de
        // aframe-overlay-modules.js que sincroniza el panel New Song entre paneles), acá solo
        // hace falta asegurarse de que el overlay quede seleccionado para que se monte y la lea.
        activateOverlay(msg.key);
        return;
      }

      // Requerimiento 013 (ampliación): widget de posición de la brújula. `compass-ready` lo
      // manda cada instancia al montar (no puede leer la DB directo, ver SyncConfigCompassMenu.jsx)
      // — se le contesta solo a ELLA (`ev.source`, no broadcast) con la última posición conocida,
      // ya sea la recién cargada de `getUserSetting` o la que ya esté en memoria, y con el estado
      // actual del panel 3D (separación/ancho/alto/overlays/guardado/sesión) para que lo muestre
      // apenas termine de cargar, sin esperar al próximo cambio.
      if (msg.action === 'compass-ready') {
        ev.source.postMessage(
          { source: 'ars-sync-test', action: 'compass-set-position', ...compassPositionRef.current },
          '*',
        );
        ev.source.postMessage(
          { source: 'ars-sync-test', action: 'compass-config-state', ...configStateRef.current, deviceType, userEmail },
          '*',
        );
        // Pedido del usuario: además, con qué sección de Configuración/Overlays está vigente
        // ahora mismo (o ninguna) — para que un panel recién montado abra/cierre el mismo panel
        // de ajustes que ya tiene el hermano, en vez de arrancar siempre cerrado.
        ev.source.postMessage(
          { source: 'ars-sync-test', action: 'compass-section-changed', section: compassSectionRef.current },
          '*',
        );
        // Pedido del usuario (ampliación, sección 11): si hay un elemento seleccionado para mover
        // ahora mismo, una brújula recién montada también debe ver su d-pad, no perder la
        // selección al activar "Doble panel".
        if (positionSelectedRef.current) {
          ev.source.postMessage(
            { source: 'ars-sync-test', action: 'position-element-selected', ...positionSelectedRef.current },
            '*',
          );
        }
        // Requerimiento 013 (sync): también se contesta con la visibilidad actual de la dona, para
        // que una brújula que monte/remonte en desfasaje se alinee al estado vigente.
        ev.source.postMessage(
          { source: 'ars-sync-test', action: 'compass-wheel-visibility', visible: compassWheelVisibleRef.current },
          '*',
        );
        return;
      }
      // Requerimiento 013 (sync de visibilidad): la X de una brújula solo emite la intención de
      // alternar ('compass-wheel-visibility-toggle'). El padre es la fuente de verdad: antirebote de
      // 1s (ignora el doble disparo de los dos ojos/cámaras sincronizadas), alterna el estado y lo
      // rebroadcastea a AMBAS instancias — la que clickeó NO aplica nada localmente, ambas esperan
      // este mensaje, así quedan siempre alineadas.
      if (msg.action === 'compass-wheel-visibility-toggle') {
        const now = Date.now();
        if (now - compassWheelToggleAtRef.current < COMPASS_WHEEL_TOGGLE_DEBOUNCE_MS) return;
        compassWheelToggleAtRef.current = now;
        compassWheelVisibleRef.current = !compassWheelVisibleRef.current;
        const nextVisible = compassWheelVisibleRef.current;
        [leftCompassRef.current?.contentWindow, rightCompassRef.current?.contentWindow]
          .filter(Boolean)
          .forEach((w) => w.postMessage({ source: 'ars-sync-test', action: 'compass-wheel-visibility', visible: nextVisible }, '*'));
        return;
      }
      // Pedido del usuario: una brújula abre/cierra su panel de Configuración/Overlays
      // (`__activateSettingsSection`/`closeSettingsPanel`, ver SyncConfigCompassMenu.jsx) y avisa
      // acá con la sección resultante ('config' | 'overlays' | null). El padre guarda ese valor
      // como fuente de verdad (mismo criterio que `compass-wheel-visibility-toggle`: SIEMPRE
      // rebroadcastea a las DOS instancias, incluida la que originó el cambio — aplicar la misma
      // sección otra vez es un no-op idempotente ahí, así que no hace falta excluir al emisor) y
      // así ambos paneles quedan con el mismo panel de ajustes abierto o cerrado.
      if (msg.action === 'compass-section-changed') {
        compassSectionRef.current = msg.section;
        [leftCompassRef.current?.contentWindow, rightCompassRef.current?.contentWindow]
          .filter(Boolean)
          .forEach((w) => w.postMessage({ source: 'ars-sync-test', action: 'compass-section-changed', section: msg.section }, '*'));
        return;
      }

      // Pedido del usuario: el padre lleva su PROPIO reloj de "en qué segundo va el karaoke" en
      // vez de que los paneles lo reporten (ver `getKaraokeCurrentTime` más arriba de este
      // efecto) — play/pause/seek son los ÚNICOS 3 momentos en que ese reloj se actualiza. A
      // diferencia de 'compass-section-changed', el reenvío del evento en sí (play/pause) SÍ
      // excluye al panel que lo originó: no es idempotente (video.play() en un video que ya está
      // reproduciendo no vuelve a disparar el evento 'play', así que la bandera
      // `suppressNextPlay` del panel emisor quedaría trabada en `true` — ver wireVideo() en
      // aframe-overlay-modules.js — y silenciaría el próximo evento real de ESE panel). El panel
      // recién montado se pone al día por separado con 'karaoke-ready' (más abajo), no por eco.
      //
      // Hallazgo real (reportado por el usuario: "no aun no se sincronizan, quedamos en que esto
      // lo manejaria un padre y cada panel validaria con el"): el destino del reenvío se elegía
      // comparando `ev.source` (el `window` del iframe emisor) contra
      // `leftRefs.current.karaoke.current.contentWindow` por IGUALDAD DE REFERENCIA — fragil: el
      // padre es quien tiene que decidir con una fuente de verdad propia (los refs por lado,
      // `leftRefs`/`rightRefs`, que él mismo arma en `renderPanel('left'|'right', ...)`), no
      // depender de que el objeto `window` que llegó en el mensaje siga siendo bit-a-bit el mismo
      // que el guardado en el ref (basta con que la referencia del ref esté un tick desactualizada
      // para que NINGUNA de las dos comparaciones matchee y el mensaje no se reenvíe a ningún
      // lado). Ahora cada bridge (`aframe-overlay-modules.js`) etiqueta su propio mensaje con
      // `fromRight` (ya sabe si es el panel derecho por el query string `isRightPanel`) y acá se
      // elige el destino DIRECTO por ese dato, sin comparar `ev.source` contra nada.
      // Pedido del usuario: "al seleccionar desde la lista de canciones aun no sincronizan, debe
      // funcionar como un stop que pare cualquier cancion que este sonando y reinicie la
      // seleccionada desde el comienzo" — una selección de canción es, para el reloj del padre,
      // un "stop": se resetea a 0 (no se "congela" el segundo actual como hace play/pause, la
      // canción NUEVA no tiene relación con dónde iba la anterior). Mismo criterio de destino por
      // `fromRight` que play/pause — ver el hallazgo grande de acá arriba.
      //
      // Hallazgo real (verificado en vivo: al medir `currentTime` en ambos paneles tras una
      // selección quedaban ~18s desincronizados entre sí): `loadVideo(..., { countdown: true })`
      // en VRKaraokeAf.js NO reproduce al instante — cada panel corre su PROPIO countdown local de
      // 3 segundos antes de llamar a `video.play()` de verdad. Marcar acá
      // `karaokePlayingRef.current = true` de una (asumiendo que "seleccionar" == "ya está
      // reproduciendo desde ahora") hacía que el reloj del padre avanzara DURANTE esos 3 segundos
      // de countdown de cada panel; si un tercer momento pedía 'karaoke-ready' mientras tanto (o
      // el propio countdown tardaba de más por carga de red), `getKaraokeCurrentTime()` ya
      // devolvía varios segundos de más y el panel arrancaba adelantado en vez de en 0:00. Se deja
      // en `false` acá — el reloj queda en 0 y PAUSADO (fiel al pedido del usuario: "un stop") — y
      // es el evento 'karaoke-play' REAL (el que ya dispara cada panel solo, cuando su propio
      // countdown termina y de verdad llama a `video.play()`, ver el handler de arriba) el que
      // recién ahí marca `karaokePlayingRef.current = true` con el instante real en que empezó a
      // sonar — mismo mecanismo ya usado y verificado para el botón Play, sin duplicar lógica.
      if (msg.action === 'karaoke-song-select') {
        karaokeSongRef.current = msg.fileName;
        karaokeTimeAtRef.current = 0;
        karaokeTimeSetAtRef.current = Date.now();
        karaokePlayingRef.current = false;
        const targetRefs = msg.fromRight ? leftRefs : rightRefs;
        targetRefs.current.karaoke?.current?.contentWindow?.postMessage(msg, '*');
        return;
      }

      if (msg.action === 'karaoke-play' || msg.action === 'karaoke-pause') {
        const isPlaying = msg.action === 'karaoke-play';
        // [PLAY-DEBUG] Log temporal pedido por el usuario — el padre es el único lugar que ve
        // AMBOS lados a la vez, útil para correlacionar con los logs de cada bridge/panel.
        console.log('[PLAY-DEBUG] padre RECIBE', msg.action, 'de', msg.fromRight ? 'DERECHO' : 'IZQUIERDO', '→ reenvía a', msg.fromRight ? 'IZQUIERDO' : 'DERECHO');
        // Al pasar de pausado a reproduciendo, o de reproduciendo a pausado, se "congela" el
        // segundo actual (calculado con el estado ANTERIOR) como nueva referencia, y se reinicia
        // el cronómetro desde ahora — getKaraokeCurrentTime() sigue siendo correcto en cualquier
        // momento posterior sin importar cuántos play/pause hayan pasado en el medio.
        karaokeTimeAtRef.current = getKaraokeCurrentTime();
        karaokeTimeSetAtRef.current = Date.now();
        karaokePlayingRef.current = isPlaying;
        // El `currentTime` real del panel que originó el pause (ver comentario junto a
        // `pendingPauseOriginTimeRef`) — se espera la confirmación del hermano
        // ('karaoke-pause-landed') para reconciliar ambos al MENOR de los dos.
        pendingPauseOriginTimeRef.current = (!isPlaying && typeof msg.time === 'number') ? msg.time : null;
        const targetRefs = msg.fromRight ? leftRefs : rightRefs;
        targetRefs.current.karaoke?.current?.contentWindow?.postMessage(msg, '*');
        return;
      }
      // Pedido del usuario: "al poner pause el tiempo se iguale al menor tiempo de ambos
      // paneles... el usuario no puede ver numeros diferentes en ambos paneles". El panel que
      // acaba de aplicar un pause REMOTO (ver `applyPlayCommand` en aframe-overlay-modules.js)
      // reporta acá dónde quedó su `currentTime` real. Con el tiempo del panel que ORIGINÓ el
      // pause (guardado arriba) ya se tienen los dos — se fija a AMBOS paneles el MENOR de los
      // dos con un `karaoke-seek` explícito, en vez de dejar que cada uno se congele en su propio
      // `currentTime` (que puede diferir unas pocas centésimas entre los dos <video> reales).
      if (msg.action === 'karaoke-pause-landed') {
        const originTime = pendingPauseOriginTimeRef.current;
        pendingPauseOriginTimeRef.current = null;
        if (originTime === null || typeof msg.time !== 'number') return;
        const minTime = Math.min(originTime, msg.time);
        karaokeTimeAtRef.current = minTime;
        karaokeTimeSetAtRef.current = Date.now();
        [leftRefs, rightRefs].forEach((refs) => {
          refs.current.karaoke?.current?.contentWindow?.postMessage(
            { source: 'ars-sync-test', action: 'karaoke-seek', time: minTime },
            '*',
          );
        });
        return;
      }
      // Un scrub manual (arrastre de la línea de progreso) también actualiza la referencia del
      // reloj — y, a diferencia de play/pause, sigue cayendo en el relevo genérico de más abajo
      // (no hace `return` acá) para llegar al panel hermano exactamente igual que ya hacía antes
      // de este cambio.
      if (msg.action === 'karaoke-seek') {
        karaokeTimeAtRef.current = msg.time;
        karaokeTimeSetAtRef.current = Date.now();
      }

      // Un panel de karaoke recién (re)montado (montaje inicial o cambio de canción, ver
      // wireVideo() en aframe-overlay-modules.js) pregunta UNA sola vez al montar en vez de
      // arrancar siempre en pausa y desde 0:00 — se le contesta solo a ÉL (`ev.source`, no
      // broadcast), mismo patrón que 'compass-ready'. Primero el tiempo (calculado ahora mismo,
      // no el de la última vez que cambió algo), después play/pause: así si ya estaba
      // reproduciendo, arranca a reproducir DESDE la posición correcta en vez de un salto visible
      // desde 0:00 al segundo siguiente.
      if (msg.action === 'karaoke-ready') {
        // Si el panel hermano ya había elegido una canción antes de que ESTE panel existiera
        // (p.ej. se activó "Doble panel" después de elegir una canción en modo un solo panel),
        // este panel recién montado arrancó con la canción por defecto de su propia lista — se le
        // avisa cuál es la vigente ANTES del seek/play, para que la busque y la cargue.
        if (karaokeSongRef.current) {
          // Pedido del usuario: "al cargar la pagina no muestres cuenta regresiva el video
          // inicia detenido hasta que el usuario de play o seleccione cancion de la lista" —
          // `silent: true` porque este catch-up NO es una selección real del usuario, es solo la
          // reconciliación de arranque de un panel recién montado con el hermano; sin esto, ese
          // panel disparaba un countdown+autoplay no pedido al simplemente abrir AR-SYNC (ver
          // `evt.silent` en VRKaraokeAf.js).
          ev.source.postMessage(
            { source: 'ars-sync-test', action: 'karaoke-song-select', fileName: karaokeSongRef.current, silent: true },
            '*',
          );
        }
        ev.source.postMessage(
          { source: 'ars-sync-test', action: 'karaoke-seek', time: getKaraokeCurrentTime() },
          '*',
        );
        ev.source.postMessage(
          { source: 'ars-sync-test', action: karaokePlayingRef.current ? 'karaoke-play' : 'karaoke-pause' },
          '*',
        );
        // Pedido del usuario (ampliación, sección 11): también la visibilidad vigente de los
        // marcadores rojos — un panel de karaoke recién montado no debería mostrarlos si el modo
        // posición está apagado, ni ocultarlos si ya estaba encendido en el panel hermano.
        ev.source.postMessage(
          { source: 'ars-sync-test', action: 'position-mode-changed', enabled: positionModeRef.current },
          '*',
        );
        return;
      }

      // `compass-save-position` sí se guarda y además se reenvía a AMBAS brújulas (izquierda y
      // derecha) — si el usuario reposicionó la del panel izquierdo, la derecha debe verse igual
      // sin esperar a que alguien recargue la página.
      if (msg.action === 'compass-save-position') {
        const nextPosition = { x: msg.x, y: msg.y, z: msg.z };
        setCompassPosition(nextPosition);
        saveUserSetting(COMPASS_POSITION_VIEW, nextPosition);
        [leftCompassRef.current?.contentWindow, rightCompassRef.current?.contentWindow]
          .filter(Boolean)
          .forEach((w) => w.postMessage({ source: 'ars-sync-test', action: 'compass-set-position', ...nextPosition }, '*'));
        return;
      }

      // Pedido del usuario: la sincronización entre los dos paneles de "Doble panel" debe pasar
      // por el padre relayando el mensaje de inmediato a ambas brújulas, no por un cambio de
      // estado de React (más lento y, en algunos timings, no se reflejaba en el panel opuesto
      // hasta guardar) — mismo criterio que ya usa 'position-move' para el d-pad de Position.
      // Reenvío directo, sin pasar por setCursorConfig/configStateRef (eso solo aplica al valor ya
      // GUARDADO, ver compass-save-cursor abajo): un edit en curso todavía no está guardado.
      if (msg.action === 'compass-cursor-live') {
        [leftCompassRef.current?.contentWindow, rightCompassRef.current?.contentWindow]
          .filter(Boolean)
          .forEach((w) => w.postMessage({ source: 'ars-sync-test', action: 'cursor-live-apply', config: msg.config }, '*'));
        return;
      }

      // Requerimiento 016: "Cursor" — guardar sí actualiza el estado de React (`cursorConfig`),
      // que el efecto de compass-config-state ya rebroadcastea a ambas brújulas (ver
      // configStateRef) — no hace falta relayar 'compass-save-cursor' a mano como con
      // compass-cursor-live, porque ese broadcast periódico ya cubre este caso (mismo criterio que
      // compass-save-position, que si actualiza el estado del padre).
      if (msg.action === 'compass-save-cursor') {
        setCursorConfig(msg.config);
        saveUserSetting(CURSOR_SETTINGS_VIEW, msg.config);
        return;
      }

      // Requerimiento 013 (hallazgo, revertido): reenviar la `camera-rotation`/`camera-position`
      // de la brújula a los overlays de contenido (video/cono/karaoke) pisaba el pitch propio que
      // cada uno calcula para apuntar a su propio plano (ver VRLocalVideoOverlaySync.jsx,
      // `initialCursorPitch`), y como cada panel lo recibía en un instante distinto, el video
      // quedaba en una altura distinta en cada panel (reportado por el usuario: "en el panel
      // izquierdo veo el video abajo, en el derecho arriba del menú"). La brújula ahora solo
      // relaya su propia rotación entre sus dos instancias (izquierda/derecha) — igual criterio
      // que el resto de overlays, nunca cruzando a un tipo distinto.
      if (msg.action === 'camera-rotation' || msg.action === 'camera-position') {
        const leftCompassWindow = leftCompassRef.current?.contentWindow;
        const rightCompassWindow = rightCompassRef.current?.contentWindow;
        if (ev.source === leftCompassWindow && rightCompassWindow) {
          rightCompassWindow.postMessage(msg, '*');
          return;
        }
        if (ev.source === rightCompassWindow && leftCompassWindow) {
          leftCompassWindow.postMessage(msg, '*');
          return;
        }
      }

      // Pedido del usuario: mover la cámara con el mouse en web (mismo criterio que el giroscopio
      // en mobile, sin tocarlo). La brújula (SyncConfigCompassMenu.jsx) es la única capa que
      // recibe el mousedown/mousemove real (está encima de todo, ver renderPanel), así que
      // reenvía acá el DELTA crudo del drag (`mouse-look-delta`) — nunca una rotación absoluta —
      // para que el overlay de contenido SELECCIONADO en ese MISMO panel lo sume a su propia
      // cámara con su propia fórmula. No cruza al panel opuesto: eso ya lo resuelve el propio
      // puente de cada overlay (pollCameraMovement, más abajo en el loop genérico), igual que ya
      // hace hoy con la rotación que llega del giroscopio.
      if (msg.action === 'mouse-look-delta') {
        const leftCompassWindow = leftCompassRef.current?.contentWindow;
        const rightCompassWindow = rightCompassRef.current?.contentWindow;
        const sameSideRefs =
          ev.source === leftCompassWindow ? leftRefs :
          ev.source === rightCompassWindow ? rightRefs :
          null;
        if (sameSideRefs) {
          Object.keys(SYNCABLE_OVERLAYS).forEach((key) => {
            sameSideRefs.current[key].current?.contentWindow?.postMessage(msg, '*');
          });
        }
        return;
      }

      // Pedido del usuario: flechas para mover la cámara del overlay de contenido, sin mover la
      // de la brújula (ver wasd-controls="enabled: false" en SyncConfigCompassMenu.jsx).
      // A diferencia de 'mouse-look-delta' (solo al panel que generó el evento — el mouse solo
      // "está" en un panel a la vez), acá el usuario pidió explícitamente que en modo "Doble
      // panel" el movimiento se aplique a LOS DOS paneles a la vez, no solo al que tiene el
      // teclado: se reenvía el MISMO delta a ambos lados (izquierdo y derecho), cada uno lo suma
      // a su propia cámara de forma independiente — nunca se cruza una posición/rotación absoluta
      // entre paneles (eso fue lo que se revirtió más arriba, ver el comentario de
      // 'camera-rotation'/'camera-position'), así que no reintroduce ese bug.
      if (msg.action === 'camera-zoom-delta') {
        const leftCompassWindow = leftCompassRef.current?.contentWindow;
        const rightCompassWindow = rightCompassRef.current?.contentWindow;
        const isFromCompass = ev.source === leftCompassWindow || ev.source === rightCompassWindow;
        if (isFromCompass) {
          [leftRefs, rightRefs].forEach((refs) => {
            Object.keys(SYNCABLE_OVERLAYS).forEach((key) => {
              refs.current[key].current?.contentWindow?.postMessage(msg, '*');
            });
          });
        }
        return;
      }

      // Pedido del usuario: el único círculo visible (el de la brújula) tampoco se ponía rojo al
      // apuntar un botón real de un overlay de contenido (hoy: karaoke) — ese overlay ya calcula
      // su propio hover/progreso de dwell (ver aframe-overlay-modules.js), pero vive en OTRO
      // iframe que la brújula no puede intersectar (el raycasting no cruza iframes). Se reenvía
      // el aviso a la brújula del MISMO panel — nunca al panel opuesto ni a otro tipo de overlay
      // — para que pinte SU propio círculo con ese estado, sin duplicar la lógica de raycasting.
      if (msg.action === 'gaze-hover') {
        const isFromLeftContent = Object.keys(SYNCABLE_OVERLAYS).some(
          (key) => ev.source === leftRefs.current[key].current?.contentWindow
        );
        const isFromRightContent = Object.keys(SYNCABLE_OVERLAYS).some(
          (key) => ev.source === rightRefs.current[key].current?.contentWindow
        );
        const targetCompassWindow = isFromLeftContent
          ? leftCompassRef.current?.contentWindow
          : isFromRightContent
          ? rightCompassRef.current?.contentWindow
          : null;
        targetCompassWindow?.postMessage(msg, '*');
        return;
      }

      // Requerimiento 014 (ampliación): "New Song" es ahora un overlay separado de "karaoke"
      // (antes vivían en el mismo iframe, y relayar al panel opuesto alcanzaba porque el propio
      // panel ya tenía la lista en el mismo documento). El relevo genérico de más abajo solo
      // reenvía "mismo overlay, panel opuesto" — un aviso que sale del overlay "newSong" nunca
      // llegaría a ningún "karaoke" por esa vía. Se hace un fan-out explícito a las 4 combinaciones
      // posibles de panel × instancia de "karaoke" (el propio panel también necesita enterarse,
      // ver VRKaraokeAf.js: ya no está en el mismo documento que quien guardó la canción).
      if (msg.action === 'cancion-agregada') {
        [leftRefs, rightRefs].forEach((refs) => {
          refs.current.karaoke?.current?.contentWindow?.postMessage(msg, '*');
        });
        return;
      }

      for (const key of Object.keys(SYNCABLE_OVERLAYS)) {
        const leftWindow = leftRefs.current[key].current?.contentWindow;
        const rightWindow = rightRefs.current[key].current?.contentWindow;
        if (ev.source === leftWindow && rightWindow) {
          rightWindow.postMessage(msg, '*');
          return;
        }
        if (ev.source === rightWindow && leftWindow) {
          leftWindow.postMessage(msg, '*');
          return;
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const panelStyle = {
    position: 'relative',
    width: panelWidth,
    height: panelHeight,
    background: '#111',
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid rgba(79,195,247,0.2)',
  };

  const renderPanel = (side, refs, compassRef) => (
    <div style={panelStyle}>
      {selectedOverlays.includes('camera') && (
        <div style={layerStyle}><CameraOverlaySync /></div>
      )}
      {selectedOverlays
        .filter((key) => SYNCABLE_OVERLAYS[key])
        .map((key) => {
          const OverlayComponent = SYNCABLE_OVERLAYS[key];
          return (
            <div key={key} style={layerStyle}>
              <OverlayComponent
                ref={refs.current[key]}
                isPrimaryPanel={side === 'left'}
                isRightPanel={side === 'right'}
                singlePanel={!dualPanel}
                cursorFuseTimeout={cursorConfig?.fuseTimeout}
              />
            </div>
          );
        })}
      {/* Requerimiento 013: brújula 3D siempre activa, última en el DOM (capa más externa) — ver
          handleMessage para el reenvío de su cámara al resto de overlays de este panel. El panel
          de la sección activa (Configuración/Overlays) es geometría A-Frame DENTRO de esta misma
          brújula (pedido explícito del usuario: "un elemento 3D, no 2D, interactuable con el
          raycaster") — no un componente React aparte, ver SyncConfigCompassMenu.jsx. */}
      <div style={layerStyle}>
        <SyncConfigCompassMenu ref={compassRef} cursorFuseTimeout={cursorConfig?.fuseTimeout} />
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'black',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: separation,
      }}
    >
      {renderPanel('left', leftRefs, leftCompassRef)}
      {/* Pedido del usuario: "Doble panel" desactivado deja un solo panel (el izquierdo/primario)
          para probar sin gafas VR, sin desmontar nada del lado izquierdo. El derecho se desmonta
          por completo (no display:none) — mismo criterio que ya usa esta vista para los overlays
          individuales (selectedOverlays.map): togglear vuelve a montar su iframe desde cero. */}
      {dualPanel && renderPanel('right', rightRefs, rightCompassRef)}
    </div>
  );
};

export default SyncStereoTestView;
