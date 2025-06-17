// Importar componentes principales
import './components/VRWorld/VRFloorAf.js';
import './components/VRUserAf/VRUserAf.js';
// Importar componente de video local
import './components/VRVideoAf/VRLocalVideo/VRLocalVideo.js';

// Configuración inicial
document.addEventListener('DOMContentLoaded', function() {
  // Asegurarse de que el cursor siga al mouse y funcione el raycaster
  const scene = document.querySelector('a-scene');
  if (!scene.hasLoaded) {
    scene.addEventListener('loaded', function() {
      console.log('Scene loaded, components ready');
    });
  }
});
