// Importar componentes base
import './components/VRVideoAf/VRYoutubeVideo/VideoControls.js';
import './components/VRVideoAf/VRYoutubeVideo/VRYoutubeBase.js';

// Importar componentes experimentales de YouTube
import './components/VRVideoAf/VRYoutubeVideo/VRYoutubeTest/VRYoutubeIframe.js';
import './components/VRVideoAf/VRYoutubeVideo/VRYoutubeTest/VRYoutubeCanvas.js';
import './components/VRVideoAf/VRYoutubeVideo/VRYoutubeTest/VRYoutubeVideo.js';
import './components/VRVideoAf/VRYoutubeVideo/VRYoutubeTest/VRYoutubeStream.js';
import './components/VRVideoAf/VRYoutubeVideo/VRYoutubeTest/VRYoutubeSimple.js';

// Importar componentes principales
import './components/VRWorld/VRFloorAf.js';
import './components/VRUserAf/VRUserAf.js';

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
