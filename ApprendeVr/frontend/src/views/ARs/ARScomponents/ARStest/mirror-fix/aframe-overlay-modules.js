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
    if (!msg || msg.source !== 'ars-sync-test' || msg.action !== 'camera-rotation' || !lookControls) return;
    lastReceivedYaw = msg.yaw;
    lastReceivedPitch = msg.pitch;
    lookControls.yawObject.rotation.y = msg.yaw;
    lookControls.pitchObject.rotation.x = msg.pitch;
  });
})();
