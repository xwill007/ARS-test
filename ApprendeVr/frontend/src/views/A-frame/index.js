// Importar componentes principales
import './components/VRWorld/VRWorldAf.js';
import './components/VRUserAf/VRUserAf.js';
import './components/VRVideoAf/VRLocalVideo/VRLocalVideo.js';

// Configuración inicial
document.addEventListener('DOMContentLoaded', function() {
  // Asegurarse de que el cursor siga al mouse y funcione el raycaster
  const scene = document.querySelector('a-scene');
  if (!scene.hasLoaded) {
    scene.addEventListener('loaded', function() {
      console.log('Scene loaded, components ready');
      setupCameraControls();
    });
  } else {
    setupCameraControls();
  }
});

// Configurar controles para manejar la cámara
function setupCameraControls() {
  // Teclas para controlar la cámara
  window.addEventListener('keydown', function(e) {
    const user = document.querySelector('#user').components['vr-user'];
    
    // Tecla V para alternar entre primera y tercera persona
    if (e.key === 'v' || e.key === 'V') {
      user.toggleCameraMode();
      console.log('Modo de cámara cambiado');
    }
    
    // Tecla B para alternar la visibilidad del cuerpo en primera persona
    if (e.key === 'b' || e.key === 'B') {
      user.toggleBodyInFirstPerson();
    }
    
    // Cuando está en tercera persona, teclas Q y E para rotar la cámara
    if (user.data.cameraMode === 'third-person') {
      if (e.key === 'q' || e.key === 'Q') {
        user.orbitCamera(-10); // Rotar a la izquierda
      } else if (e.key === 'e' || e.key === 'E') {
        user.orbitCamera(10); // Rotar a la derecha
      } else if (e.key === 'r' || e.key === 'R') {
        user.zoomCamera(-0.5); // Acercar
      } else if (e.key === 'f' || e.key === 'F') {
        user.zoomCamera(0.5); // Alejar
      }
    }
  });
    console.log('Controles de cámara configurados:');
  console.log('- V: Cambiar entre primera y tercera persona');
  console.log('- B: Mostrar/ocultar cuerpo en primera persona');
  console.log('- Q/E: Rotar cámara (solo en tercera persona)');
  console.log('- R/F: Acercar/alejar cámara (solo en tercera persona)');
}
