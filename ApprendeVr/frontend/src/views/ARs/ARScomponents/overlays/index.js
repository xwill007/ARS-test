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
import VRVoiceController from './VRVoiceController';

// Registrar overlay básico de texto
overlayRegistry.register('simpleText', {
  component: SimpleTextOverlay,
  type: 'r3f',
  label: 'Texto Simple',
  description: 'Overlay de texto 3D simple',
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
  label: 'Video Cono R3F',
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

// Registrar VRVoiceController (controlador de voz reutilizable)
overlayRegistry.register('vrVoiceController', {
  component: VRVoiceController,
  type: 'html',
  label: 'Controlador de Voz',
  description: 'Sistema de reconocimiento de voz reutilizable para cualquier componente',
  category: 'control',
  configurable: true,
  defaultProps: {
    position: [0, 0, 0],
    targetEntityId: '',
    targetComponent: '',
    enabled: true,
    language: 'es-ES',
    commands: {},
    showMicIcon: true,
    showVoiceText: true,
    showListeningIndicator: true,
    micIconSize: 1,
    textScale: 1
  }
});

console.log('🎯 Overlays registrados:', overlayRegistry.getKeys());

export default overlayRegistry;
