import React from 'react';

/**
 * VRNewSongOverlaySync — Requerimiento 014 (ampliación), overlay "newSong" para AR-SYNC
 * (SyncStereoTestView.jsx). Pedido del usuario: separar el panel "New Song" (hasta ahora una
 * entidad más dentro de la MISMA escena/iframe que el overlay "karaoke", ver
 * VRKaraokeOverlaySync.jsx/aframe-overlay-modules.html) en su propio overlay independiente,
 * activable/desactivable por separado desde el menú ⚙️ → "Overlays".
 *
 * Mismo patrón que VRKaraokeOverlaySync.jsx: monta new-song.html en un <iframe src="..."> REAL (no
 * srcDoc), porque VRNewSongAf.js depende de módulos reales del proyecto (vrSongsApi.util.js,
 * vrLocalVideoStore.util.js, vrPositionControl.js) que necesitan resolver contra el origen real de
 * la app.
 *
 * `forwardRef` expone el `<iframe>` para que SyncStereoTestView.jsx pueda relayar los postMessage
 * de rotación de cámara/campos del formulario al panel hermano, igual que con los demás overlays.
 *
 * Componente de prueba aislado: no se importa ni se usa desde ningún archivo de producción.
 */
const VRNewSongOverlaySyncInner = ({ forwardedRef }) => (
  <iframe
    ref={forwardedRef}
    title="VR New Song Overlay (Sync)"
    src="./new-song.html"
    style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', pointerEvents: 'auto' }}
    allow="xr-spatial-tracking; fullscreen; clipboard-read"
  />
);

export default React.forwardRef((props, ref) => VRNewSongOverlaySyncInner({ ...props, forwardedRef: ref }));
