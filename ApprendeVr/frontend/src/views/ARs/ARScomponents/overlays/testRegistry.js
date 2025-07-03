/**
 * Script de prueba para verificar el registro de overlays
 */

// Importar el registro
import overlayRegistry from '../overlays/index';

// Verificar que los overlays están registrados
console.log('=== VERIFICACIÓN DE OVERLAYS ===');
console.log('Overlays registrados:', overlayRegistry.getKeys());

// Verificar overlay específico
const vrConeOverlay = overlayRegistry.get('vrConeOverlay');
console.log('VRConeOverlay config:', vrConeOverlay);

// Verificar que el componente existe
if (vrConeOverlay && vrConeOverlay.component) {
  console.log('✅ VRConeOverlay component found:', vrConeOverlay.component.name);
} else {
  console.log('❌ VRConeOverlay component NOT found');
}

// Mostrar todos los overlays
const allOverlays = overlayRegistry.getAll();
console.log('Todos los overlays:', Object.keys(allOverlays));

// Verificar por tipo
const htmlOverlays = overlayRegistry.getByType('html');
console.log('HTML overlays:', Object.keys(htmlOverlays));

const r3fOverlays = overlayRegistry.getByType('r3f');
console.log('R3F overlays:', Object.keys(r3fOverlays));

export default overlayRegistry;
