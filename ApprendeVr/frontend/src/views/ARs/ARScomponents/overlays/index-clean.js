/**
 * Auto-registro de overlays
 * 
 * Este archivo importa todos los overlays y los registra automáticamente.
 * Solo necesitas importar este archivo para tener todos los overlays disponibles.
 */

import overlayRegistry from '../OverlayRegistry';

// Importar overlays existentes
import SimpleTextOverlay from './SimpleTextOverlay';
import RotatingCubeOverlay from './RotatingCubeOverlay';
import VRConeOverlay from '../a-frame-components-ars/VRConeOverlay';

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

// Registrar VRConeOverlay (A-Frame)
overlayRegistry.register('vrConeOverlay', {
  component: VRConeOverlay,
  type: 'html',
  label: 'Cono de Palabras',
  description: 'Cono 3D con palabras en A-Frame',
  category: 'educational',
  defaultProps: {
    radiusBase: 6,
    height: 3,
    showUserMarker: true,
    targetObjectId: "user-marker",
    targetObjectType: "sphere",
    targetObjectProps: {
      position: "0 0.15 0",
      radius: 0.15,
      color: "#FF0000",
      opacity: 0.7
    },
    lookAtTarget: false,
    panelSpacing: 0.3,
    spiralSpacing: 0.0
  }
});

console.log('🎯 Overlays registrados:', overlayRegistry.getKeys());

export default overlayRegistry;
