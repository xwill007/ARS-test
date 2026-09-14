// Requerimiento 011: entrada de esta página. Importa el componente A-Frame REAL de
// src/views/A-frame (arrastra VRNewSongAf.js, que VRKaraokeAf.js ya importa) — no se copia ni
// reescribe código, es el mismo módulo que usa la vista A-Frame de producción.
//
// Patrón a seguir para exponer un nuevo componente A-Frame como overlay de "AR-SYNC"
// (SyncStereoTestView.jsx) en mirror-fix:
// 1. Crear un `<nombre>.html` en esta carpeta que cargue /libs/aframe.min.js + este tipo de
//    script de entrada, y declare las entidades a-entity necesarias (ver aframe-overlay-modules.html).
// 2. Este .js importa el/los componente(s) reales por su ruta relativa dentro de
//    src/views/A-frame/components/... (sin copiar su código), y agrega el puente de sincronización
//    de cámara (abajo) si el overlay debe reaccionar al giroscopio/acelerómetro igual que los
//    demás overlays de AR-SYNC.
// 3. Registrar el nuevo .html en vite.config.js -> build.rollupOptions.input.
// 4. Crear un componente React `<Nombre>OverlaySync.jsx` (ver VRKaraokeOverlaySync.jsx) que monte
//    ese .html en un <iframe src="..."> real (no srcDoc) con forwardRef, y agregarlo a
//    SYNCABLE_OVERLAYS en SyncStereoTestView.jsx + OVERLAY_OPTIONS en SyncConfigMenu.jsx.
import '../../../../A-frame/components/VRKaraokeAf/VRKaraokeAf.js';
// Requerimiento 011 (siguiente iteración) / 011: panel de evaluación de pronunciación. No se
// declara como entidad estática — VRKaraokeAf.js lo crea/actualiza dinámicamente al pulsar
// "EVALUATE SONG" (evaluateSong() en VRKaraokeAf.js), igual que en la vista A-Frame original.
// Sin este import, vr-evaluacion-af no está registrado y ese setAttribute no hace nada.
import '../../../../A-frame/components/VREvaluacionAf/VREvaluacionAf.js';
// Requerimiento 012: `initPositionControl()` (Requerimiento 010) — arma el marcador rojo 📍 +
// d-pad + botón GUARDAR de cada elemento posicionable (karaoke, agregar-canción, y el de
// VREvaluacionAf.js que se registra solo al crearse) y, sobre todo, el ÚNICO listener
// `window.addEventListener('pointerdown', ...)` que hace el raycast y procesa esos clicks — sin
// llamar a esta función esos marcadores existen (VREvaluacionAf.js los crea igual) pero ningún
// click les llega, porque nunca se armó el listener que los escucha. Mismo patrón que
// `index.js` de la vista A-Frame original: esperar a que la escena termine de cargar antes de
// llamarla (necesita `sceneEl.camera`/`sceneEl.canvas` ya listos).
import { initPositionControl } from '../../../../A-frame/vrPositionControl.js';
// Pedido del usuario (ampliación, Requerimiento 013 sección 11): `external: true` — en mirror-fix
// los marcadores arrancan ocultos (los muestra el toggle "Position" de la sección "Interfaz" de
// la brújula) y, al clickearlos, ya no abren un d-pad local acá — mandan la selección a la
// brújula por postMessage, que arma su propio d-pad al lado del menú. Ver el comentario grande
// junto a `createWidget`/`initPositionControl` en vrPositionControl.js para el detalle de por qué
// este flag existe (la vista de producción sigue usando el d-pad local, sin cambios).
(function () {
  const sceneEl = document.querySelector('a-scene');
  if (sceneEl.hasLoaded) {
    initPositionControl({ external: true });
  } else {
    sceneEl.addEventListener('loaded', () => initPositionControl({ external: true }));
  }
})();

// Puente de sincronización de rotación de cámara entre los paneles izquierdo/derecho de AR-SYNC —
// mismo patrón que el bloque final de VRLocalVideoOverlaySync.jsx / VRConeOverlaySync.jsx (ver
// esos archivos para el detalle de por qué se escribe directo en yawObject/pitchObject de
// look-controls en vez de con setAttribute, y por qué se compara contra el último valor RECIBIDO
// en vez del último enviado, para no reenviar en loop lo que se acaba de aplicar de forma remota).
// Solo se sincroniza rotación (no posición): la cámara de esta escena es estática, sin
// wasd-controls deshabilitado explícitamente pero sin motivo para moverse.
(function () {
  function send(msg) {
    window.parent.postMessage(Object.assign({ source: 'ars-sync-test' }, msg), '*');
  }

  let cameraEl = null;
  let lookControls = null;
  let lastSentYaw = null, lastSentPitch = null;
  let lastReceivedYaw = null, lastReceivedPitch = null;
  const EPS = 0.001;

  function findCamera() {
    cameraEl = document.querySelector('a-camera');
    if (cameraEl && cameraEl.components && cameraEl.components['look-controls']) {
      lookControls = cameraEl.components['look-controls'];
      setInterval(pollCameraRotation, 16);
    } else {
      setTimeout(findCamera, 100);
    }
  }
  findCamera();

  function pollCameraRotation() {
    if (!lookControls || !lookControls.yawObject || !lookControls.pitchObject) return;
    const yaw = lookControls.yawObject.rotation.y;
    const pitch = lookControls.pitchObject.rotation.x;
    const matchesReceived = lastReceivedYaw !== null &&
      Math.abs(yaw - lastReceivedYaw) < EPS && Math.abs(pitch - lastReceivedPitch) < EPS;
    const changed = lastSentYaw === null ||
      Math.abs(yaw - lastSentYaw) > EPS || Math.abs(pitch - lastSentPitch) > EPS;
    if (!matchesReceived && changed) {
      lastSentYaw = yaw; lastSentPitch = pitch;
      send({ action: 'camera-rotation', yaw, pitch });
    }
  }

  window.addEventListener('message', function (ev) {
    const msg = ev.data;
    if (!msg || msg.source !== 'ars-sync-test' || !lookControls) return;
    if (msg.action === 'camera-rotation') {
      lastReceivedYaw = msg.yaw;
      lastReceivedPitch = msg.pitch;
      lookControls.yawObject.rotation.y = msg.yaw;
      lookControls.pitchObject.rotation.x = msg.pitch;
    } else if (msg.action === 'mouse-look-delta' && lookControls.yawObject && lookControls.pitchObject) {
      // Pedido del usuario: drag de mouse en web (reenviado por SyncConfigCompassMenu.jsx, la
      // única capa que recibe el mousedown/mousemove real — ver SyncStereoTestView.jsx). Mismo
      // criterio que VRLocalVideoOverlaySync.jsx/VRConeOverlaySync.jsx: se suma el delta con la
      // fórmula de look-controls (sensibilidad 0.002) en vez de recibir un valor absoluto.
      const PI_2 = Math.PI / 2;
      lookControls.yawObject.rotation.y -= 0.002 * msg.dx;
      lookControls.pitchObject.rotation.x -= 0.002 * msg.dy;
      lookControls.pitchObject.rotation.x = Math.max(-PI_2, Math.min(PI_2, lookControls.pitchObject.rotation.x));
    } else if (msg.action === 'camera-zoom-delta' && cameraEl) {
      // Pedido del usuario: las 4 flechas (reenviadas por SyncConfigCompassMenu.jsx, ver
      // wasd-controls="enabled: false" ahí — la brújula ya no se mueve con las flechas, solo
      // reenvía el delta) mueven ESTA cámara respecto a los paneles del overlay (video/lista/
      // New Song), en vez de mover la de la brújula: ↑/↓ (`axis: 'forward'`) adelante/atrás a lo
      // largo de hacia dónde MIRA la cámara ahora mismo (no un eje fijo world -Z, para que
      // "acercarse" tenga sentido sin importar hacia dónde giró con el mouse/giroscopio);
      // ←/→ (`axis: 'strafe'`) lateral, perpendicular a esa misma dirección y sin componente Y
      // (no sube/baja al mirar hacia arriba/abajo, mismo criterio que un strafe FPS estándar).
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
        // Hallazgo real (reportado por el usuario tras probar): sin negar, ArrowUp alejaba la
        // cámara de los paneles del overlay en vez de acercarla — getWorldDirection() da el eje
        // +Z local del objeto en espacio mundo, que para esta cámara resulta ser el sentido
        // contrario a "hacia donde mira"/"adelante". Se niega para que ArrowUp acerque.
        cameraEl.object3D.getWorldDirection(move);
        move.negate();
      }
      cameraEl.object3D.position.addScaledVector(move, msg.delta * STEP);
    }
  });
})();

// Puente de sincronización de play/pause/seek del video interno de vr-karaoke-af — mismo patrón
// que el bloque de video de VRLocalVideoOverlaySync.jsx (mismo canal 'ars-sync-test', ver ese
// archivo para el detalle del workaround de silenciar antes de play() remoto: el panel que RECIBE
// el mensaje nunca tuvo un gesto real en su propio iframe, y los navegadores bloquean
// video.play() programático sin gesto salvo que esté muted).
//
// Diferencia clave con VRLocalVideoOverlaySync: acá no hay un <video> fijo — VRKaraokeAf.js
// recrea su `<video>` real (this._htmlVideo, ver loadVideo() en VRKaraokeAf.js) cada vez que
// cambia la canción seleccionada, así que hay que re-engancharse cada vez que cambia esa
// referencia, no una sola vez. Se lee `_htmlVideo` (campo por convención "privado", no expuesto
// como API pública) en vez de tocar VRKaraokeAf.js — mismo principio de no modificar el
// componente real que ya sigue el resto de este archivo; si VRKaraokeAf.js renombra ese campo en
// el futuro, este puente deja de encontrar el video (se degrada a "sin sync", no rompe nada).
(function () {
  function send(msg) {
    window.parent.postMessage(Object.assign({ source: 'ars-sync-test' }, msg), '*');
  }

  // Requerimiento 012: volumen por panel para evitar eco (mismo criterio que
  // VRLocalVideoOverlaySync.jsx — ambos paneles de AR-SYNC suenan por el mismo dispositivo
  // físico). isPrimaryPanel/isRightPanel/singlePanel llegan como query string desde
  // VRKaraokeOverlaySync.jsx (esta página no puede recibir props de React directamente).
  const params = new URLSearchParams(window.location.search);
  const isPrimaryPanel = params.get('isPrimaryPanel') !== 'false';
  const isRightPanel = params.get('isRightPanel') === 'true';
  // Hallazgo real (reportado por el usuario): con "Doble panel" desactivado, este es el ÚNICO
  // panel que existe — pero por default cae en la rama "izquierdo/primario" de abajo, que lo deja
  // casi mudo (0.01) pensando que el otro panel (derecho, 100%) se va a encargar del audio. Sin
  // este caso, el audio "subía" recién al activar el segundo panel en vez de sonar fuerte desde
  // el principio.
  const isSinglePanel = params.get('singlePanel') === 'true';

  let karaokeComp = null;
  let video = null;
  let suppressNextPlay = false;
  let suppressNextPause = false;
  let suppressNextSeeked = false;
  // Hallazgo real (reportado por el usuario: "al iniciar le di al boton play y solo inicio el
  // video en un panel"): un 'karaoke-play'/'karaoke-pause' remoto que llega ANTES de que este
  // panel termine de wirear su propio `video` (carrera real al recién abrir AR-SYNC: el panel
  // hermano puede reaccionar al click del usuario más rápido de lo que este panel tarda en montar
  // A-Frame + encontrar `#karaoke-vr-component`) se descartaba en silencio (`if (!video) return`
  // más abajo) y no tenía ninguna segunda oportunidad de aplicarse — dependía por completo de que
  // el propio 'karaoke-ready' de este panel (ver wireVideo) alcanzara a este mismo mensaje, lo
  // cual no está garantizado si el wireo tarda. Se guarda el ÚLTIMO comando recibido mientras
  // `video` es null y se aplica en cuanto `wireVideo()` corre, en vez de perderlo.
  let pendingPlayCommand = null; // true = play, false = pause, null = nada pendiente
  // Pedido del usuario: "al seleccionar desde la lista de canciones aun no sincronizan, debe
  // funcionar como un stop que pare cualquier cancion que este sonando y reinicie la seleccionada
  // desde el comienzo" — hasta ahora este puente solo sincronizaba play/pause/seek del video YA
  // cargado, nunca CUÁL canción está cargada: clickear una canción en la lista de un panel solo
  // recreaba el `<video>` de ESE panel (ver loadVideo() en VRKaraokeAf.js), el hermano seguía con
  // lo que tenía. `lastReportedFileName` guarda la última canción que ESTE panel ya le avisó al
  // padre (o que el padre le aplicó a este panel), para detectar solo cambios REALES de canción
  // (no cada rebuild de video) y no re-reportar en loop una selección que llegó por mensaje.
  let lastReportedFileName = null;
  let suppressNextSongReport = false;

  function findKaraokeComponent() {
    const entity = document.querySelector('#karaoke-vr-component');
    karaokeComp = entity && entity.components && entity.components['vr-karaoke-af'];
    if (karaokeComp) {
      setInterval(watchVideoElement, 300);
    } else {
      setTimeout(findKaraokeComponent, 200);
    }
  }
  findKaraokeComponent();

  // vr-karaoke-af reemplaza this._htmlVideo en cada cambio de canción — comparar por referencia
  // para reenganchar los listeners cuando cambia, en vez de asumir que sigue siendo el mismo video.
  //
  // Hallazgo real (verificado en vivo: tras seleccionar una canción nueva, el panel que la eligió
  // terminaba reproduciendo esa canción pero en un `currentTime` heredado de la ANTERIOR, en vez
  // de 0): el chequeo de "cambió la canción" corría DESPUÉS de `wireVideo(video)` — y
  // `wireVideo()` manda 'karaoke-ready' (le pregunta al padre "¿qué debería estar reproduciendo
  // ahora?"). Como los mensajes a un mismo destino se procesan en el orden en que llegan, si
  // 'karaoke-ready' salía ANTES que 'karaoke-song-select', el padre todavía no sabía que la
  // canción había cambiado (`karaokeSongRef`/el reloj seguían reflejando la ANTERIOR, que podía
  // estar reproduciendo) y contestaba con ESE estado viejo — este panel aplicaba esa respuesta
  // (volvía a la canción vieja, en el segundo donde iba) y recién en un ciclo posterior se
  // terminaba corrigiendo solo, de forma no determinística. Se invierte el orden: primero se
  // avisa el cambio de canción (si lo hay) y recién después se wirea/pide 'karaoke-ready' — así
  // la respuesta que este panel reciba ya refleja el cambio que él mismo acaba de reportar.
  function watchVideoElement() {
    // Independiente de si el <video> cambió justo en este tick (puede haber cambiado un tick
    // antes, junto con el video, o quedar sin cambios si el rebuild de la lista no disparó
    // `loadVideo()` — ver el fix de `_buildSongListUI` en VRKaraokeAf.js): se chequea la canción
    // vigente por separado, comparando SIEMPRE contra la última reportada.
    const currentFileName = karaokeComp && karaokeComp._currentSong && karaokeComp._currentSong.fileName;
    if (currentFileName && currentFileName !== lastReportedFileName) {
      const isEcho = suppressNextSongReport;
      lastReportedFileName = currentFileName;
      suppressNextSongReport = false;
      if (!isEcho) {
        send({ action: 'karaoke-song-select', fileName: currentFileName, fromRight: isRightPanel });
      }
    }
    const current = karaokeComp && karaokeComp._htmlVideo;
    if (current && current !== video) {
      video = current;
      wireVideo(video);
    }
  }

  function wireVideo(v) {
    v.muted = false;
    if (isSinglePanel) {
      // Único panel activo (Doble panel desactivado): nada más con quien hacer eco, siempre
      // fuerte sin importar si este panel "sería" el izquierdo o el derecho.
      v.volume = 1.0;
    } else if (isPrimaryPanel && !isRightPanel) {
      // Bajar el volumen del panel izquierdo (primario) para no escuchar las dos pistas
      // superpuestas — mismo valor que usa VRLocalVideoOverlaySync.jsx para su video.
      v.volume = 0.01;
    } else if (isRightPanel) {
      v.volume = 1.0;
    } else {
      v.volume = 0.05;
    }
    v.addEventListener('play', function () {
      // [PLAY-DEBUG] Log temporal pedido por el usuario — panel (izq/der) + si se reenvía o se
      // absorbe como eco. Buscar "[PLAY-DEBUG]" en consola.
      console.log('[PLAY-DEBUG] bridge (' + (isRightPanel ? 'DERECHO' : 'IZQUIERDO') + ') evento "play" — suppressNextPlay=' + suppressNextPlay + ' currentTime=' + v.currentTime.toFixed(2));
      if (suppressNextPlay) { suppressNextPlay = false; return; }
      // `fromRight` (ya conocido por el query string, ver arriba): le dice al padre de qué lado
      // vino este mensaje SIN que el padre tenga que comparar `ev.source` contra sus propios refs
      // por igualdad de referencia — ver el hallazgo grande en SyncStereoTestView.jsx sobre por
      // qué esa comparación podía fallar y dejar el mensaje sin reenviar a ningún panel.
      send({ action: 'karaoke-play', fromRight: isRightPanel });
    });
    v.addEventListener('pause', function () {
      console.log('[PLAY-DEBUG] bridge (' + (isRightPanel ? 'DERECHO' : 'IZQUIERDO') + ') evento "pause" — suppressNextPause=' + suppressNextPause + ' currentTime=' + v.currentTime.toFixed(2));
      if (suppressNextPause) { suppressNextPause = false; return; }
      send({ action: 'karaoke-pause', fromRight: isRightPanel });
    });
    v.addEventListener('seeked', function () {
      if (suppressNextSeeked) { suppressNextSeeked = false; return; }
      send({ action: 'karaoke-seek', time: v.currentTime });
    });

    // Pedido del usuario: al activar "Doble panel" (o al recrear este video por cambio de
    // canción), este panel puede arrancar en pausa mientras el panel hermano ya venía
    // reproduciendo — hasta ahora solo se sincronizaba por EVENTOS (play/pause/seek disparados
    // en el momento), sin ninguna forma de que un panel recién montado se ponga al día del
    // estado YA vigente. SyncStereoTestView.jsx es la única fuente de verdad de "¿está
    // reproduciendo?" (ver karaokePlayingRef ahí) — se le pide el estado actual acá, mismo
    // patrón que 'compass-ready'/'compass-config-state'.
    send({ action: 'karaoke-ready' });

    // Si mientras este panel todavía no tenía `video` wireado llegó un comando remoto de
    // play/pause (ver `pendingPlayCommand` más arriba), aplicarlo ahora — no hace falta esperar
    // a la respuesta de 'karaoke-ready' de arriba (que igual también corregiría el estado, pero
    // recién en el próximo tick de mensajes).
    if (pendingPlayCommand !== null) {
      applyPlayCommand(pendingPlayCommand);
      pendingPlayCommand = null;
    }
  }

  // Hallazgo real (reportado por el usuario tras probar play/pause repetido entre paneles: "no
  // aun no se sincronizan"): con clicks seguidos (play, pause, play... en cualquiera de los dos
  // paneles, en sucesión rápida), el navegador puede ABORTAR un `video.play()` en curso si llega
  // un `pause()` antes de que la promesa resuelva (visto en consola como
  // "AbortError: The play() request was interrupted by a call to pause()"). Cuando eso pasa, el
  // evento nativo 'play' NUNCA llega a disparar en ese panel — y como `suppressNextPlay` recién se
  // libera DENTRO de ese listener (ver `wireVideo` más abajo), quedaba trabado en `true` para
  // siempre: el PRÓXIMO click real del usuario en ese mismo panel dejaba de reenviarse al hermano
  // en silencio, sin ningún error visible. Por eso el fallo era intermitente (dependía de qué tan
  // rápido se alternaran los clicks), no de la ruta del mensaje en sí (`fromRight`, ya verificada
  // por separado). Se libera la bandera explícitamente en el `catch` (se sabe ahí mismo que el
  // evento no va a disparar) y además con un timeout de red de seguridad por si el navegador no
  // llega a rechazar la promesa pero el evento tampoco dispara por algún otro motivo — en el caso
  // normal (el evento sí dispara) el timeout no hace nada, porque el propio listener ya dejó la
  // bandera en `false` antes de que el timeout corra.
  function applyPlayCommand(shouldPlay) {
    if (shouldPlay) {
      suppressNextPlay = true;
      const wasMuted = video.muted;
      video.muted = true;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(function () { video.muted = wasMuted; })
          .catch(function (err) {
            video.muted = wasMuted;
            suppressNextPlay = false;
            console.warn('vr-karaoke-af: play remoto bloqueado/abortado por el navegador incluso muted:', err);
          });
      } else {
        video.muted = wasMuted;
      }
      setTimeout(function () { suppressNextPlay = false; }, 800);
    } else {
      suppressNextPause = true;
      video.pause();
      setTimeout(function () { suppressNextPause = false; }, 800);
    }
  }

  // Aplica remotamente la selección de una canción por `fileName`, reusando el MISMO camino que
  // ya usa el sistema de gaze/dwell más abajo en este archivo para clickear botones de la lista
  // por fuera de un click real (`btnEl._activateSelection(...)`, expuesto por VRKaraokeAf.js en
  // cada botón) — así el "stop y reinicio desde el comienzo" pedido por el usuario lo hace el
  // propio `loadVideo()` real del componente (recrea el `<video>` desde 0, con su mismo
  // countdown/autoplay), sin duplicar esa lógica acá ni tocar VRKaraokeAf.js.
  function applySongSelect(fileName) {
    const buttons = (karaokeComp && karaokeComp._songButtons) || [];
    const button = buttons.find(function (b) { return b._fileName === fileName; });
    if (!button || typeof button._activateSelection !== 'function') {
      // La lista de este panel todavía no tiene esa canción (getSongs() no respondió todavía, o
      // difiere por alguna razón) — no hay nada que activar; se degrada a "sin sync" para esta
      // selección puntual en vez de romper, mismo criterio que el resto de este archivo.
      console.warn('vr-karaoke-af: no se encontró el botón de la canción remota para sincronizar:', fileName);
      return;
    }
    suppressNextSongReport = true;
    button._activateSelection({ type: 'pointerdown', defaultPrevented: false });
  }

  window.addEventListener('message', function (ev) {
    const msg = ev.data;
    if (!msg || msg.source !== 'ars-sync-test') return;
    if (msg.action === 'karaoke-play' || msg.action === 'karaoke-pause') {
      const shouldPlay = msg.action === 'karaoke-play';
      // [PLAY-DEBUG] Log temporal pedido por el usuario — distingue un comando REMOTO (llegó por
      // postMessage, originado en el OTRO panel) de un evento nativo local (log de arriba).
      console.log('[PLAY-DEBUG] bridge (' + (isRightPanel ? 'DERECHO' : 'IZQUIERDO') + ') RECIBE remoto:', msg.action, 'video wireado=' + !!video);
      if (!video) {
        // Este panel todavía no terminó de montar/wirear su video — no hay nada que pausar/
        // reproducir todavía. Se guarda la intención para aplicarla en cuanto `wireVideo()` corra
        // (ver ahí), en vez de perderla como antes de este fix.
        pendingPlayCommand = shouldPlay;
        return;
      }
      applyPlayCommand(shouldPlay);
      return;
    }
    if (msg.action === 'karaoke-song-select') {
      if (msg.fileName === lastReportedFileName) return; // ya es esta canción, nada que hacer
      applySongSelect(msg.fileName);
      return;
    }
    if (!video) return;
    if (msg.action === 'karaoke-seek') {
      suppressNextSeeked = true;
      video.currentTime = msg.time;
    }
  });
})();

// Requerimiento 012: hover/dwell/click propio para el puntero estático (#mirror-fix-pointer) de
// este overlay — mismo patrón de gaze+fuse que VRLocalVideoOverlaySync.jsx/VRConeOverlaySync.jsx
// (ver esos archivos), pero con SU PROPIO raycasting THREE.js directo en vez de un <a-cursor
// raycaster="...">: los botones de VRKaraokeAf.js (this._karaokeButtons) y VRNewSongAf.js
// (this._clickableEls) no están marcados .clickable/.raycastable — hacen su propio raycasting
// manual por mouse (ver Requerimiento 011) — así que no hay nada que un <a-cursor> nativo pudiera
// intersectar. Se leen esos dos campos "privados" por convención para reusar exactamente los
// mismos botones/callbacks que ya usa el click manual, sin tocar ninguno de los dos componentes
// reales — si algún día renombran esos campos, esto se degrada a "sin auto-click", no rompe nada.
(function () {
  const pointerEl = document.getElementById('mirror-fix-pointer');
  if (!pointerEl) return;
  const FUSE_MS = 2500;
  // Pedido del usuario: el círculo visible (el de SyncConfigCompassMenu.jsx, siempre encima —
  // ver aframe-overlay-modules.html) no se pone rojo al apuntar un botón real de karaoke, porque
  // su raycaster vive en OTRO iframe y no puede intersectar estos meshes (el raycasting no cruza
  // iframes). Se avisa acá, por postMessage, el estado de hover/progreso de dwell que YA calcula
  // este tick() — SyncStereoTestView.jsx lo relaya a la brújula del MISMO panel, que pinta SU
  // PROPIO círculo (el único visible) en rojo con el mismo progreso, sin duplicar la lógica de
  // raycasting ni el FUSE_MS acá.
  function send(msg) {
    window.parent.postMessage(Object.assign({ source: 'ars-sync-test' }, msg), '*');
  }
  // Requerimiento 012 (corrección de bug real): antirebote tras cualquier activación — el
  // usuario reportó que un click (manual o por dwell) sobre el botón de play a veces se veía
  // "cancelarse solo" como si fuera un doble click. Causa encontrada: el `key` que identificaba
  // el objetivo era el `uuid` del MESH individual intersectado, pero un mismo botón lógico
  // (btnEl) puede tener varios sub-meshes (fondo + texto/ícono) — si el raycaster alternaba de
  // cuál sub-mesh intersectaba entre un tick y el siguiente (¡mismo botón!), el código lo leía
  // como "cambió de objetivo" y podía re-disparar. Se corrige agrupando por el ELEMENTO (btnEl/
  // entry.el), no por mesh individual, y además se agrega este cooldown explícito como red de
  // seguridad adicional: ninguna activación nueva se procesa hasta pasado COOLDOWN_MS desde la
  // última, sin importar el objetivo.
  const COOLDOWN_MS = 600;
  // Hallazgo real (reportado por el usuario, confirmado con logs "[PLAY-DEBUG]" en vivo, moviendo
  // la cámara con el raycaster real): el botón Play/Pause del karaoke se togglea solo poco
  // después de usarlo — no es un bug de sincronización entre paneles (esos logs mostraban el
  // reenvío funcionando bien), sino este mismo sistema de dwell disparándose una SEGUNDA vez.
  // Causa: `lockedEl` solo evita repetir la activación mientras el reticle sigue exactamente
  // sobre el mismo elemento — apenas el raycaster deja de intersectarlo por UN solo tick (50ms,
  // un micro-movimiento normal de cámara) se limpia `lockedEl`, y si vuelve a caer sobre el MISMO
  // botón un instante después (típicamente porque el usuario se quedó mirando el resultado de su
  // propio click), arranca un fuse COMPLETAMENTE NUEVO de `FUSE_MS` — pero como el usuario ya
  // estaba "parado" ahí desde antes, ese fuse se completa casi de inmediato en términos
  // perceptivos y el botón se re-activa solo, deshaciendo lo que el usuario acababa de hacer. Para
  // un botón de una sola acción (p.ej. "Guardar") esto ya era una molestia menor; para un TOGGLE
  // como Play/Pause es directamente disruptivo (arranca y se detiene solo). `lastActivatedEl`
  // guarda QUÉ elemento se activó por última vez además de CUÁNDO — se usa más abajo para no
  // arrancar un fuse nuevo sobre ESE MISMO elemento hasta pasado `REACTIVATION_GRACE_MS`, aunque
  // el reticle lo haya perdido y recuperado en el medio.
  const REACTIVATION_GRACE_MS = 2000;
  let camera = null;
  let raycaster = null;
  let hoveredEl = null;
  let fuseStart = null;
  let lockedEl = null;
  let lastActivationAt = 0;
  let lastActivatedEl = null;

  function collectTargets() {
    const targets = [];
    // Elementos ya cubiertos por los bloques específicos de abajo (karaoke/newSong/eval) — el
    // bloque genérico `.clickable` de más abajo los salta. Hallazgo real durante la verificación
    // de este fix: `.clickable` NO es exclusivo de los widgets de posición como se asumió al
    // escribir el bloque genérico — VRKaraokeAf.js, VRNewSongAf.js y VREvaluacionAf.js también
    // marcan sus propios botones con esa clase (confirmado por grep). Sin este Set, esos botones
    // quedarían duplicados en `targets` (una vez con su `activate` específico, otra con el
    // genérico `dispatchCenterPointerdown`) — `Array.find` igual habría elegido la entrada
    // específica por orden de inserción, así que no había bug funcional, pero sí una lista de
    // raycast innecesariamente grande recorrida cada 50ms.
    const coveredEls = new Set();
    const karaokeEntity = document.querySelector('#karaoke-vr-component');
    const karaokeComp = karaokeEntity && karaokeEntity.components && karaokeEntity.components['vr-karaoke-af'];
    (karaokeComp && karaokeComp._karaokeButtons || []).forEach((btnEl) => {
      if (!btnEl.object3D) return;
      coveredEls.add(btnEl);
      btnEl.object3D.traverse((obj) => {
        if (obj.isMesh) {
          targets.push({
            mesh: obj,
            el: btnEl,
            activate: (intersection) => {
              if (typeof btnEl._activateSelection === 'function') {
                btnEl._activateSelection({ type: 'pointerdown', defaultPrevented: false, detail: { intersection } });
              } else {
                btnEl.dispatchEvent(new CustomEvent('click', { bubbles: true, cancelable: true, detail: { intersection } }));
              }
            },
          });
        }
      });
    });
    const newSongEntity = document.querySelector('#new-song-component');
    const newSongComp = newSongEntity && newSongEntity.components && newSongEntity.components['vr-new-song-af'];
    (newSongComp && newSongComp._clickableEls || []).forEach((entry) => {
      if (!entry.el || !entry.el.object3D) return;
      coveredEls.add(entry.el);
      entry.el.object3D.traverse((obj) => {
        if (obj.isMesh) {
          targets.push({ mesh: obj, el: entry.el, activate: () => entry.onClick() });
        }
      });
    });

    // VREvaluacionAf.js (panel de evaluación, creado dinámicamente al pulsar "EVALUATE SONG"):
    // a diferencia de vr-karaoke-af/vr-new-song-af, su lógica de qué botón hace qué vive DENTRO
    // de un listener privado (`_onPointerDown`, `window.addEventListener('pointerdown', ...)`) —
    // no expone un método por botón que se pueda invocar desde afuera. En vez de duplicar esa
    // lógica acá (frágil: seleccionar nivel, cerrar, scroll de fallidos, etc. — varios `types`
    // distintos con ramas internas), se deja que EL PROPIO componente decida: se registran sus
    // botones como objetivos del gaze (para el hover/dwell visual), y al completar el dwell se
    // dispara un `pointerdown` sintético real en `window` apuntando al centro del canvas — la
    // misma posición que ya usa internamente `getPointerNDC` para el gaze (NDC 0,0) — y el propio
    // `_onPointerDown` de VREvaluacionAf.js hace su raycasting real y decide qué botón activar,
    // exactamente igual que si fuera un click real de mouse en el centro de la pantalla.
    const evalEntity = document.querySelector('[vr-evaluacion-af]');
    const evalComp = evalEntity && evalEntity.components && evalEntity.components['vr-evaluacion-af'];
    if (evalComp) {
      const evalButtons = [];
      if (evalComp._closeBtn) evalButtons.push(evalComp._closeBtn);
      (evalComp._numButtons || []).forEach((b) => evalButtons.push(b));
      if (evalComp._pronListenBtn) evalButtons.push(evalComp._pronListenBtn);
      if (evalComp._scrollUpBtn) evalButtons.push(evalComp._scrollUpBtn);
      if (evalComp._scrollDownBtn) evalButtons.push(evalComp._scrollDownBtn);
      (evalComp._optionButtons || []).forEach((b) => evalButtons.push(b));
      if (evalComp._evalBtn) evalButtons.push(evalComp._evalBtn);
      evalButtons.forEach((btnEl) => {
        if (!btnEl || !btnEl.object3D) return;
        coveredEls.add(btnEl);
        btnEl.object3D.traverse((obj) => {
          if (obj.isMesh) {
            targets.push({ mesh: obj, el: btnEl, activate: dispatchCenterPointerdown });
          }
        });
      });
    }

    // Widgets de posición (Requerimiento 010, vía initPositionControl() más arriba): marcador
    // rojo 📍 + d-pad + GUARDAR de karaoke, agregar-canción, y el de VREvaluacionAf.js. Su click
    // real ya funciona con initPositionControl() (raycast propio compartido, mismo patrón
    // window+pointerdown que VREvaluacionAf.js), así que se activan igual: dwell + pointerdown
    // sintético al centro. `createWidget()`/vrPositionControl.js marca sus propios elementos con
    // `.clickable`, pero esa misma clase también la usan los botones de vr-karaoke-af/
    // VRNewSongAf.js/VREvaluacionAf.js (ya cubiertos arriba) — se saltan vía `coveredEls` para no
    // duplicar targets, así este bloque solo termina agregando los widgets de posición en sí.
    document.querySelectorAll('.clickable').forEach((btnEl) => {
      if (!btnEl.object3D || coveredEls.has(btnEl)) return;
      btnEl.object3D.traverse((obj) => {
        if (obj.isMesh) {
          targets.push({ mesh: obj, el: btnEl, activate: dispatchCenterPointerdown });
        }
      });
    });
    return targets;
  }

  function dispatchCenterPointerdown() {
    const sceneEl = document.querySelector('a-scene');
    const canvas = sceneEl && sceneEl.canvas;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = rect.left + rect.width / 2;
    const clientY = rect.top + rect.height / 2;
    window.dispatchEvent(new PointerEvent('pointerdown', {
      clientX,
      clientY,
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: 'mouse',
    }));
  }

  function setPointerVisual(color, sizePx) {
    pointerEl.style.borderColor = color;
    pointerEl.style.width = sizePx + 'px';
    pointerEl.style.height = sizePx + 'px';
    pointerEl.style.marginLeft = (-sizePx / 2) + 'px';
    pointerEl.style.marginTop = (-sizePx / 2) + 'px';
  }

  function tick() {
    if (!camera) return;
    const targets = collectTargets();
    const meshes = targets.map((t) => t.mesh);
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const hits = raycaster.intersectObjects(meshes, false);
    let hitTarget = null;
    let hitIntersection = null;
    if (hits.length) {
      hitIntersection = hits[0];
      hitTarget = targets.find((t) => t.mesh === hits[0].object) || null;
    }
    // Agrupado por ELEMENTO (no por mesh individual) — ver comentario arriba sobre por qué.
    const el = hitTarget ? hitTarget.el : null;

    if (el !== lockedEl) lockedEl = null;

    // El elemento sigue siendo el mismo que se activó hace menos de REACTIVATION_GRACE_MS: no
    // arranca un fuse nuevo (aunque el reticle lo haya perdido y recuperado en el medio) — evita
    // el re-toggle espontáneo documentado arriba. Pasado ese margen, se comporta como cualquier
    // otro elemento (dwell normal).
    const inReactivationGrace = el && el === lastActivatedEl && (Date.now() - lastActivationAt) < REACTIVATION_GRACE_MS;

    if (el !== hoveredEl) {
      hoveredEl = el;
      fuseStart = (el && el !== lockedEl && !inReactivationGrace) ? Date.now() : null;
      // [PLAY-DEBUG] Log temporal — confirma que el margen de reactivación efectivamente evitó
      // arrancar un fuse nuevo sobre un elemento recién activado.
      if (inReactivationGrace) {
        console.log('[PLAY-DEBUG] gaze/dwell IGNORA re-fuse sobre', el.id || el.className || el.tagName, '(activado hace', Date.now() - lastActivationAt, 'ms, margen', REACTIVATION_GRACE_MS, 'ms)');
      }
    }

    if (!el || el === lockedEl || inReactivationGrace) {
      setPointerVisual('white', 24);
      send({ action: 'gaze-hover', hovering: false, progress: 0 });
      return;
    }

    const elapsed = Date.now() - fuseStart;
    const progress = Math.min(1, elapsed / FUSE_MS);
    setPointerVisual('#ff3333', 24 * (1 - 0.9 * progress));
    send({ action: 'gaze-hover', hovering: true, progress: progress });

    if (progress >= 1) {
      const now = Date.now();
      if (now - lastActivationAt >= COOLDOWN_MS) {
        // [PLAY-DEBUG] Log temporal pedido por el usuario — para confirmar/descartar si este
        // sistema de dwell (cursor circular apuntando 2.5s) es el que dispara pausas/reanudaciones
        // espontáneas del karaoke (ver hallazgo "el intervalo ~9s no coincide con ninguna
        // constante de este código" en problems_solutions.md). Buscar "[PLAY-DEBUG]" en consola.
        console.log('[PLAY-DEBUG] gaze/dwell ACTIVA elemento:', el.id || el.className || el.tagName, 'en', new Date(now).toISOString());
        hitTarget.activate(hitIntersection);
        lastActivationAt = now;
        lastActivatedEl = el;
      }
      lockedEl = el;
      fuseStart = null;
      setPointerVisual('white', 24);
    }
  }

  function findCamera() {
    const sceneEl = document.querySelector('a-scene');
    if (sceneEl && sceneEl.camera) {
      camera = sceneEl.camera;
      raycaster = new AFRAME.THREE.Raycaster();
      raycaster.far = 30;
      setInterval(tick, 50);
    } else {
      setTimeout(findCamera, 100);
    }
  }
  findCamera();
})();
