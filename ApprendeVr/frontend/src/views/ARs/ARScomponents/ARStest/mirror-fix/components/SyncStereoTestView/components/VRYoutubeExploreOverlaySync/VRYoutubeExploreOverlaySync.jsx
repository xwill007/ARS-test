import React from 'react';

/**
 * VRYoutubeExploreOverlaySync — overlay "Explore Youtube AR" de AR-SYNC
 * (SyncStereoTestView.jsx), Requerimiento 017. Busca videos de YouTube dentro de la vista AR y, al
 * seleccionar uno, lo reproduce y rellena los campos URL/título/autor del panel "New Song".
 *
 * A diferencia de los overlays srcDoc (VRConeOverlaySync.jsx/VRLocalVideoOverlaySync.jsx), monta
 * `explore-youtube.html` en un `<iframe src="...">` REAL (mismo patrón que
 * VRYoutubeVideoOverlaySync.jsx/VRKaraokeOverlaySync.jsx), porque `explore-youtube-modules.js`
 * importa módulos reales del proyecto (`vrPositionControl.js`, `vrYoutubeSearchApi.util.js`) que no
 * resuelven dentro de un documento srcDoc en blanco.
 *
 * `isPrimaryPanel`/`isRightPanel`/`singlePanel`: mismas props que ya reciben todos los overlays de
 * contenido desde `SyncStereoTestView.jsx` (ver `renderPanel`) — se reenvían como query string para
 * que `explore-youtube-modules.js` baje el volumen del panel izquierdo/primario y evite eco, mismo
 * criterio anti-eco que el overlay "Youtube Video".
 *
 * Componente de prueba aislado: no se importa ni se usa desde ningún archivo de producción.
 */
const VRYoutubeExploreOverlaySyncInner = ({ forwardedRef, isPrimaryPanel = true, isRightPanel = false, singlePanel = false }) => (
  <iframe
    ref={forwardedRef}
    title="VR Youtube Explore Overlay (Sync)"
    src={`./components/SyncStereoTestView/components/VRYoutubeExploreOverlaySync/explore-youtube.html?isPrimaryPanel=${isPrimaryPanel}&isRightPanel=${isRightPanel}&singlePanel=${singlePanel}`}
    style={{
      width: '100%',
      height: '100%',
      border: 'none',
      background: 'transparent',
      pointerEvents: 'auto',
    }}
    allow="xr-spatial-tracking; fullscreen; clipboard-read"
  />
);

export default React.forwardRef((props, ref) => VRYoutubeExploreOverlaySyncInner({ ...props, forwardedRef: ref }));
