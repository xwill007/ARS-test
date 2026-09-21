import React from 'react';

/**
 * VRSongTextOverlaySync — overlay "Song Text" de AR-SYNC (SyncStereoTestView.jsx): muestra la letra
 * de la canción seleccionada en el overlay "karaoke", sincronizada con la reproducción vía
 * `tiempo_frase` de `frases_vr` — tres renglones (frase anterior / actual / futura), uno debajo
 * del otro.
 *
 * Monta `song-text.html` en un `<iframe src="...">` REAL (no `srcDoc`) — mismo patrón que
 * `VRYoutubeVideoOverlaySync.jsx`/`VRKaraokeOverlaySync.jsx` — porque `song-text-modules.js`
 * necesita `fetch('/api/frases')` contra el origen real de la app (una ruta relativa que no
 * resuelve dentro de un documento `srcDoc` en blanco). No importa componentes A-Frame reales del
 * proyecto (el panel de letra es DOM, no una entidad 3D), así que no necesita registrarse en
 * `vrPositionControl.js`.
 *
 * La canción seleccionada / tiempo de reproducción / play-pause NO viajan por postMessage: los
 * publica `SyncStereoTestView.jsx` en `localStorage['apprendevr_karaoke_state']` (mismo mecanismo
 * de origen compartido que ya usa la URL de YouTube entre overlays, ver Requerimiento 015). La
 * sincronización de cámara (giroscopio/mouse-drag) sí va por postMessage, en
 * song-text-modules.js, igual que el resto de overlays.
 *
 * Componente de prueba aislado: no se importa ni se usa desde ningún archivo de producción.
 */
const VRSongTextOverlaySyncInner = ({ forwardedRef, isPrimaryPanel = true, isRightPanel = false, singlePanel = false }) => (
  <iframe
    ref={forwardedRef}
    title="VR Song Text Overlay (Sync)"
    // Requerimiento 018 (reestructuración de carpetas): ruta relativa completa desde
    // artest-mirror.html (raíz de mirror-fix/, no se movió) — ver el mismo comentario en
    // VRKaraokeOverlaySync.jsx.
    src={`./components/SyncStereoTestView/components/VRSongTextOverlaySync/song-text.html?isPrimaryPanel=${isPrimaryPanel}&isRightPanel=${isRightPanel}&singlePanel=${singlePanel}`}
    style={{
      width: '100%',
      height: '100%',
      border: 'none',
      background: 'transparent',
      pointerEvents: 'auto',
    }}
    allow="xr-spatial-tracking; fullscreen"
  />
);

export default React.forwardRef((props, ref) => VRSongTextOverlaySyncInner({ ...props, forwardedRef: ref }));
