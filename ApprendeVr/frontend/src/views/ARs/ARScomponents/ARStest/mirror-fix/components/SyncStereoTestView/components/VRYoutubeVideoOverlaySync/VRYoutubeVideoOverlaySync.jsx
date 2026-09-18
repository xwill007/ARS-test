import React from 'react';

/**
 * VRYoutubeVideoOverlaySync — overlay "Youtube Video" de AR-SYNC (SyncStereoTestView.jsx),
 * agregado a pedido del usuario tras el panel de previsualización de `VRNewSongAf.js`
 * (Requerimiento 015): se activa/desactiva desde el menú ⚙️ → pestaña "Overlays" como cualquier
 * otro, y muestra un input de URL + botón "PEGAR URL" + el recuadro donde se ve el video embebido.
 *
 * A diferencia de `VRConeOverlaySync.jsx`/`VRLocalVideoOverlaySync.jsx` (código copiado en un
 * `srcDoc`), este monta `youtube-video.html` en un `<iframe src="...">` REAL (no `srcDoc`) —
 * mismo patrón que `VRKaraokeOverlaySync.jsx` — porque `youtube-video-modules.js` importa el
 * componente de edición de ubicación real (`vrPositionControl.js`), que expone el marcador 📍 +
 * d-pad + GUARDAR (persistido en la base de datos vía `getUserSetting`/`saveUserSetting`) y no
 * resuelve sus imports dentro de un documento `srcDoc` en blanco (ver skill
 * `overlay-ar-sync-aframe`, sección "Cuándo usar `src` real en vez de `srcDoc`").
 *
 * `allow="clipboard-read"`: el botón "PEGAR URL" de `youtube-video-modules.js` usa
 * `navigator.clipboard.readText()` — sin este permiso, el navegador lo bloquea dentro del iframe
 * aunque el sitio sea HTTPS (mismo hallazgo ya resuelto en `VRKaraokeOverlaySync.jsx` para el
 * botón de pegar de `VRNewSongAf.js`).
 *
 * `isPrimaryPanel`/`isRightPanel`/`singlePanel`: mismas props que ya reciben todos los overlays de
 * contenido desde `SyncStereoTestView.jsx` (ver `renderPanel`) — se reenvían como query string
 * (esta página no puede recibir props de React directamente) para que `youtube-video-modules.js`
 * baje el volumen del panel izquierdo/primario y evitar eco, mismo criterio anti-eco que
 * `aframe-overlay-modules.js`/`VRLocalVideoOverlaySync.jsx` (ambos paneles de AR-SYNC suenan por
 * el mismo dispositivo físico).
 *
 * Componente de prueba aislado: no se importa ni se usa desde ningún archivo de producción.
 */
const VRYoutubeVideoOverlaySyncInner = ({ forwardedRef, isPrimaryPanel = true, isRightPanel = false, singlePanel = false }) => (
  <iframe
    ref={forwardedRef}
    title="VRYoutubeVideo Overlay (Sync)"
    // Requerimiento 018 (reestructuración de carpetas): ruta relativa completa desde
    // artest-mirror.html (raíz de mirror-fix/, no se movió) — ver el mismo comentario en
    // VRKaraokeOverlaySync.jsx.
    src={`./components/SyncStereoTestView/components/VRYoutubeVideoOverlaySync/youtube-video.html?isPrimaryPanel=${isPrimaryPanel}&isRightPanel=${isRightPanel}&singlePanel=${singlePanel}`}
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

export default React.forwardRef((props, ref) => VRYoutubeVideoOverlaySyncInner({ ...props, forwardedRef: ref }));
