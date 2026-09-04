import React, { useEffect, useRef } from 'react';

/**
 * CameraOverlaySync — Requerimiento 002, overlay de "cámara" para la vista AR-SYNC. A diferencia
 * de los demás overlays *Sync (video, cono), este NO necesita ningún puente de postMessage: cada
 * panel pide su propia cámara en vivo con getUserMedia, y como ambos leen el mismo dispositivo
 * físico en tiempo real, ya están "sincronizados" sin ningún esfuerzo extra — no hay estado que
 * propagar, es simplemente lo que la cámara ve en cada instante.
 *
 * Se renderiza como fondo (position absolute, z-index más bajo que los demás overlays
 * seleccionados) — ver SyncStereoTestView.jsx, que apila los overlays elegidos en el menú.
 *
 * Componente de prueba aislado, no se usa desde ningún archivo de producción.
 */
const CameraOverlaySync = () => {
  const videoRef = useRef(null);

  useEffect(() => {
    let stream;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (e) {
        console.error('CameraOverlaySync: no se pudo acceder a la cámara', e);
      }
    })();
    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
    />
  );
};

export default CameraOverlaySync;
