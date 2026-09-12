import React, { useEffect, useRef, useState } from 'react';
import CameraOverlaySync from './CameraOverlaySync';
import VRLocalVideoOverlaySync from './VRLocalVideoOverlaySync';
import VRConeOverlaySync from './VRConeOverlaySync';
import VRKaraokeOverlaySync from './VRKaraokeOverlaySync';
import SyncConfigCompassMenu from './SyncConfigCompassMenu';
import { getUserSetting, saveUserSetting, detectDeviceType } from '../../../../A-frame/vrUserSettingsApi.util.js';
import { getStoredAuth } from '../../../../A-frame/vrAuth.util.js';
import { exitFullscreen } from './fullscreenHelper.js';

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
  // Requerimiento 013 (sync de visibilidad del menú, pedido por el usuario): estado fuente de
  // verdad de si la dona (`#compass-wheel`) está visible. Ambas brújulas arrancan visibles; cada
  // vez que una cambia el estado, el padre lo guarda acá y lo relaya a la otra, así nunca se
  // desincronizan. Ref (no estado) porque `handleMessage` está registrado con deps `[]`.
  const compassWheelVisibleRef = useRef(true);
  // Requerimiento 013 (antirebote del toggle de la X, ver COMPASS_WHEEL_TOGGLE_DEBOUNCE_MS): último
  // timestamp del toggle de visibilidad. Ref por el mismo motivo que `compassWheelVisibleRef`.
  const compassWheelToggleAtRef = useRef(0);
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
    configStateRef.current = { separation, width: panelWidth, height: panelHeight, configSaved, selectedOverlays, overlaysSaved };
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
    setSelectedOverlays(['camera', 'video']);
    setOverlaysSaved(false);
    setConfigSaved(false);

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
        setConfigSaved(true);
      }
    });
    getUserSetting(COMPASS_POSITION_VIEW).then((setting) => {
      const hasValidPosition = setting &&
        typeof setting.x === 'number' && typeof setting.y === 'number' && typeof setting.z === 'number';
      if (hasValidPosition) setCompassPosition({ x: setting.x, y: setting.y, z: setting.z });
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

  const saveConfig = () => {
    // Requerimiento 013 (hallazgo): mismo motivo que `saveSelectedOverlays` — leer del ref, no del
    // closure, porque `handleMessage` captura esta función del primer render (deps `[]`).
    const current = configStateRef.current;
    const separationVal = current ? current.separation : separation;
    const widthVal = current ? current.width : panelWidth;
    const heightVal = current ? current.height : panelHeight;
    saveUserSetting(CONFIG_SETTINGS_VIEW, { separation: separationVal, panelWidth: widthVal, panelHeight: heightVal }).then((ok) => {
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
    const state = { separation, width: panelWidth, height: panelHeight, configSaved, selectedOverlays, overlaysSaved, deviceType, userEmail };
    [leftCompassRef.current?.contentWindow, rightCompassRef.current?.contentWindow]
      .filter(Boolean)
      .forEach((w) => w.postMessage({ source: 'ars-sync-test', action: 'compass-config-state', ...state }, '*'));
  }, [separation, panelWidth, panelHeight, configSaved, selectedOverlays, overlaysSaved, deviceType, userEmail]);

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
        <SyncConfigCompassMenu ref={compassRef} />
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
      {renderPanel('right', rightRefs, rightCompassRef)}
    </div>
  );
};

export default SyncStereoTestView;
