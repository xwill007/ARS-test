import React from 'react';

// Importa aquí los overlays A-Frame que quieras combinar
import VRConeOverlayWrapper from '../a-frame-components-ars/VRConeOverlayWrapper';
import VRLocalVideoOverlay from '../overlays/VRLocalVideoOverlay';

/**
 * CombinedAFrameOverlay mejorado
 * - El cono se organiza mirando al centro (posición y look-at)
 * - El video se muestra al frente, con ID único
 */
const CombinedAFrameOverlay = ({
  coneProps = {},
  videoProps = {},
  showCursor = true
}) => {
  // Posición estándar: cono centrado, video al frente
  const coneDefaults = {
    position: '0 2 0', // centrado y un poco arriba
    lookAtTarget: true,
    ...coneProps
  };
  const videoDefaults = {
    position: '0 1.2 -3', // al frente y más bajo
    videoSrc: '/videos/gangstas.mp4',
    width: 2.8,
    height: 1.6,
    id: 'vr-local-video-unique', // ID único para evitar conflictos
    ...videoProps
  };
  return (
    <a-scene embedded vr-mode-ui="enabled: false" style={{ width: '100%', height: '100%', background: 'transparent' }}>
      <VRConeOverlayWrapper {...coneDefaults} showCursor={showCursor} />
      <VRLocalVideoOverlay {...videoDefaults} showCursor={showCursor} />
    </a-scene>
  );
};

export default CombinedAFrameOverlay;
