/**
 * Auto-registro de overlays
 * 
 * Este archivo// Registrar VRConeR3FOverlay (cono R3F básico)
overlayRegistry.register('vrConeR3FOverlay', {
  component: VRConeR3FOverlay,
  type: 'r3f',
  label: 'Cono R3F',
  description: 'Cono 3D usando React Three Fiber',
  category: 'geometry',
  configurable: true,
  defaultProps: {}
});todos los overlays y los registra automáticamente.
 * Solo necesitas importar este archivo para tener todos los overlays disponibles.
 */

import overlayRegistry from '../OverlayRegistry';

// Importar overlays existentes
import SimpleTextOverlay from './SimpleTextOverlay';
import RotatingCubeOverlay from './RotatingCubeOverlay';
import VRConeOverlayWrapper from '../a-frame-components-ars/VRConeOverlayWrapper';
import TestR3FOverlay from '../ARStest/TestR3FOverlay';
import VRConeR3FOverlay from '../ARStest/VRConeR3FOverlay';
import VRConeR3FVideoOverlayConfigurable from '../ARStest/VRConeR3FVideoOverlayConfigurable';
import VRConeR3FVideoOverlay from '../ARStest/VRConeR3FVideoOverlay';
import VRLocalVideoOverlay from './VRLocalVideoOverlay';
import CombinedAFrameOverlay from './CombinedAFrameOverlay';

// Registrar overlay básico de texto
overlayRegistry.register('simpleText', {
  component: SimpleTextOverlay,
  type: 'r3f',
  label: 'overlayLabels.simpleText',
  description: 'overlayLabels.simpleTextDesc',
  category: 'text',
  defaultProps: {
    position: [0, 3, -2],
    text: "¡Hola Mundo AR!"
  }
});

// Registrar overlay de cubo rotatorio
overlayRegistry.register('rotatingCube', {
  component: RotatingCubeOverlay,
  type: 'r3f',
  label: 'overlayLabels.rotatingCube',
  description: 'overlayLabels.rotatingCubeDesc',
  category: 'geometry',
  defaultProps: {
    position: [1, 1, -3],
    color: "#ff6b6b",
    rotationSpeed: 0.01
  }
});

// Registrar TestR3FOverlay (overlay estático básico)
overlayRegistry.register('testR3FOverlay', {
  component: TestR3FOverlay,
  type: 'r3f',
  label: 'overlayLabels.testR3F',
  description: 'overlayLabels.testR3FDesc',
  category: 'test',
  defaultProps: {}
});

// Registrar VRConeR3FOverlay (cono R3F)
overlayRegistry.register('vrConeR3FOverlay', {
  component: VRConeR3FOverlay,
  type: 'r3f',
  label: 'overlayLabels.vrConeR3F',
  description: 'overlayLabels.vrConeR3FDesc',
  category: 'geometry',
  defaultProps: {}
});

// Registrar VRConeR3FVideoOverlay (video en cono R3F) - Versión configurable
overlayRegistry.register('vrConeR3FVideoOverlay', {
  component: VRConeR3FVideoOverlayConfigurable,
  type: 'r3f',
  label: 'overlayLabels.vrConeR3FVideo',
  description: 'overlayLabels.vrConeR3FVideoDesc',
  category: 'video',
  configurable: true,
  defaultProps: {}
});

// Registrar VRConeR3FVideoOverlay (video en cono R3F) - Versión original
overlayRegistry.register('vrConeR3FVideoOverlayOriginal', {
  component: VRConeR3FVideoOverlay,
  type: 'r3f',
  label: 'overlayLabels.vrConeR3FVideoOriginal',
  description: 'overlayLabels.vrConeR3FVideoOriginalDesc',
  category: 'video',
  configurable: false,
  defaultProps: {}
});

// Registrar VRConeOverlay (A-Frame) usando el wrapper
overlayRegistry.register('vrConeOverlay', {
  component: VRConeOverlayWrapper,
  type: 'html',
  label: 'overlayLabels.vrConeOverlay',
  description: 'overlayLabels.vrConeOverlayDesc',
  category: 'educational',
  configurable: true,
  defaultProps: {
    radiusBase: 6,
    height: 6,
    showUserMarker: true,
    targetObjectId: "user-marker",
    targetObjectType: "sphere",
    targetObjectProps: {
      position: "0 0.15 0",
      radius: 0.15,
      color: "#FF0000",
      opacity: 0.7
    },
    lookAtTarget: true,
    targetPosition: [0, 0.15, 0]
  }
});

// Registrar VRLocalVideoOverlay (video local A-Frame)
overlayRegistry.register('vrLocalVideoOverlay', {
  component: VRLocalVideoOverlay,
  type: 'html',
  label: 'overlayLabels.vrLocalVideo',
  description: 'overlayLabels.vrLocalVideoDesc',
  category: 'video',
  configurable: true,
  defaultProps: {
    position: [0, 5, -8],
    rotation: [0, 0, 0],
    videoSrc: '/videos/gangstas.mp4',
    width: 8,
    height: 4.5,
    autoplay: true,
    doubleSided: true,
    invertBackSide: true,
    showMarker: true,
    enableVoiceCommands: true,
    voiceCommandsActivated: true
  }
});

// Registrar overlay combinado de A-Frame (Cono de Palabras + Video Local)
overlayRegistry.register('combinedAFrame', {
  component: CombinedAFrameOverlay,
  type: 'html',
  label: 'overlayLabels.combinedAFrame',
  description: 'overlayLabels.combinedAFrameDesc',
  category: 'combinado',
  configurable: true,
  defaultProps: {
    coneProps: {},
    videoProps: {},
    showCursor: true
  }
});

console.log('🎯 Overlays registrados:', overlayRegistry.getKeys());

export default overlayRegistry;
