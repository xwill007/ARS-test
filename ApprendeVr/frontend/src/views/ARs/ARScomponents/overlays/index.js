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
import SimpleTextOverlay, { SimpleTextOverlayDebug } from './SimpleTextOverlay';
import RotatingCubeOverlay from './RotatingCubeOverlay';
import VRConeOverlayWrapper from '../a-frame-components-ars/VRConeOverlayWrapper';
import TestR3FOverlay from '../ARStest/TestR3FOverlay';
import VRConeR3FOverlay from '../ARStest/VRConeR3FOverlay';
import VRConeR3FVideoOverlayConfigurable from '../ARStest/VR3FVideoOverlayConfigurable';
import VRConeR3FVideoOverlay from '../ARStest/VRConeR3FVideoOverlay';
import VRLocalVideoOverlay from './VRLocalVideoOverlay';
import CombinedAFrameOverlay from './CombinedAFrameOverlay';
import ARSConeAFrameVideoOverlay from '../a-frame-components-ars/ARSConeAFrameVideoOverlay';

// Registrar overlay básico de texto con video
overlayRegistry.register('simpleText', {
  component: SimpleTextOverlay,
  type: 'r3f',
  label: 'Texto Simple con Video',
  description: 'Overlay de texto 3D con video de YouTube (iOS compatible)',
  category: 'text',
  defaultProps: {
    position: [0, 3, -2],
    text: "¡Hola Mundo AR!",
    showVideo: true,
    videoId: "uVFw1Et8NFM",
    videoPosition: [0, 0, -2],
    videoWidth: 3,
    debugMode: false
  }
});

// Registrar versión de debug del overlay
overlayRegistry.register('simpleTextDebug', {
  component: SimpleTextOverlayDebug,
  type: 'r3f',
  label: 'Texto Simple con Video (Debug)',
  description: 'Overlay de texto 3D con video de YouTube - Modo debug para iOS',
  category: 'debug',
  defaultProps: {
    position: [0, 3, -2],
    text: "¡Hola Mundo AR! (Debug)",
    showVideo: true,
    videoId: "uVFw1Et8NFM",
    videoPosition: [0, 0, -2],
    videoWidth: 3,
    debugMode: true
  }
});

// Registrar overlay de cubo rotatorio
overlayRegistry.register('rotatingCube', {
  component: RotatingCubeOverlay,
  type: 'r3f',
  label: 'Cubo Rotatorio',
  description: 'Cubo 3D que rota continuamente',
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
  label: 'Overlay Estático',
  description: 'Overlay R3F básico para pruebas',
  category: 'test',
  defaultProps: {}
});

// Registrar VRConeR3FOverlay (cono R3F)
overlayRegistry.register('vrConeR3FOverlay', {
  component: VRConeR3FOverlay,
  type: 'r3f',
  label: 'Cono R3F',
  description: 'Cono 3D usando React Three Fiber',
  category: 'geometry',
  defaultProps: {}
});

// Registrar VRConeR3FVideoOverlay (video en cono R3F) - Versión configurable
overlayRegistry.register('vrConeR3FVideoOverlay', {
  component: VRConeR3FVideoOverlayConfigurable,
  type: 'r3f',
  label: 'Video Configurable R3F',
  description: 'Video proyectado en cono R3F - Configurable',
  category: 'video',
  configurable: true,
  defaultProps: {}
});

// Registrar VRConeR3FVideoOverlay (video en cono R3F) - Versión original
overlayRegistry.register('vrConeR3FVideoOverlayOriginal', {
  component: VRConeR3FVideoOverlay,
  type: 'r3f',
  label: 'Video Cono R3F (Original)',
  description: 'Video proyectado en cono R3F - Versión original',
  category: 'video',
  configurable: false,
  defaultProps: {}
});

// Registrar VRConeOverlay (A-Frame) usando el wrapper
overlayRegistry.register('vrConeOverlay', {
  component: VRConeOverlayWrapper,
  type: 'html',
  label: 'Cono de Palabras',
  description: 'Cono 3D con palabras en A-Frame',
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
  label: 'Video Local A-Frame',
  description: 'Reproductor de video local con controles usando A-Frame',
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
  label: 'Cono de Palabras + Video Local (A-Frame)',
  description: 'Muestra ambos overlays de A-Frame juntos en una sola escena',
  category: 'combinado',
  configurable: true,
  defaultProps: {
    coneProps: {},
    videoProps: {},
    showCursor: true
  }
});

// Registrar ARSConeAFrameVideoOverlay (overlay combinado de A-Frame)
overlayRegistry.register('arsConeAFrameVideoOverlay', {
  component: ARSConeAFrameVideoOverlay,
  type: 'html',
  label: 'Cono + Video Local A-frame (Combinado)',
  description: 'Overlay combinado: Cono de palabras y video local en una sola escena',
  category: 'a-frame-components-ars/ARSConeAFrameVideoOverlay.jsx',
  configurable: true,
  defaultProps: {
    // Puedes agregar props por defecto aquí si lo deseas
  }
});

console.log('🎯 Overlays registrados:', overlayRegistry.getKeys());

export default overlayRegistry;
