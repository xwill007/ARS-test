import React from 'react';

/**
 * VRKaraokeOverlaySync — Requerimiento 011, overlay "karaoke" para AR-SYNC
 * (SyncStereoTestView.jsx), junto a "video" (VRLocalVideoOverlaySync.jsx) y "cone"
 * (VRConeOverlaySync.jsx) en SYNCABLE_OVERLAYS.
 *
 * A diferencia de esos dos, este overlay NO copia código de ningún componente: monta
 * aframe-overlay-modules.html en un <iframe src="..."> REAL (no srcDoc), que a su vez importa con
 * ES modules los componentes A-Frame reales de src/views/A-frame/components (lista de canciones +
 * reproductor, agregar canción — ver aframe-overlay-modules.js). Necesita un `src=` real (no
 * srcDoc) porque esos componentes dependen de rutas servidas por Vite (fetch a
 * /api/user-settings/..., import.meta.glob de locales) que no resuelven dentro de un documento
 * srcDoc en blanco.
 *
 * La sincronización de rotación de cámara entre paneles (giroscopio/acelerómetro vía
 * look-controls, igual que video/cone) vive en aframe-overlay-modules.js, no acá — al ser una
 * página real (no un string embebido), el puente se escribe como código normal en ese archivo en
 * vez de inyectarse como script dentro del srcDoc.
 *
 * `forwardRef` expone el `<iframe>` para que SyncStereoTestView.jsx pueda leer su
 * `contentWindow` y relayar los postMessage de rotación de cámara al panel hermano, igual que con
 * los otros dos overlays sincronizables.
 *
 * Componente de prueba aislado: no se importa ni se usa desde ningún archivo de producción.
 */
const VRKaraokeOverlaySyncInner = ({ forwardedRef }) => (
  <iframe
    ref={forwardedRef}
    title="VR Karaoke Overlay (Sync)"
    src="./aframe-overlay-modules.html"
    style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', pointerEvents: 'auto' }}
    allow="xr-spatial-tracking; fullscreen"
  />
);

export default React.forwardRef((props, ref) => VRKaraokeOverlaySyncInner({ ...props, forwardedRef: ref }));
