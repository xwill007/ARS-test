/**
 * Script de prueba para verificar compatibilidad móvil de A-Frame
 * Ejecutar en la consola del navegador para diagnosticar problemas
 */

console.log('🔍 Iniciando diagnóstico de compatibilidad móvil A-Frame...');

// 1. Detectar dispositivo
const isMobile = /iPhone|iPad|iPod|Android|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isAndroid = /Android/i.test(navigator.userAgent);

console.log('📱 Información del dispositivo:', {
  userAgent: navigator.userAgent,
  isMobile,
  isIOS,
  isAndroid,
  platform: navigator.platform,
  vendor: navigator.vendor
});

// 2. Verificar capacidades de video
function testVideoCapabilities() {
  const video = document.createElement('video');
  
  // Atributos a probar
  const attributes = [
    'playsInline',
    'webkit-playsinline',
    'x-webkit-airplay',
    'x5-video-player-type',
    'x5-video-player-fullscreen',
    'x5-video-orientation'
  ];
  
  console.log('🎥 Capacidades de video:');
  attributes.forEach(attr => {
    try {
      video.setAttribute(attr, 'test');
      const value = video.getAttribute(attr);
      console.log(`  ${attr}: ${value ? '✅ Soportado' : '❌ No soportado'}`);
    } catch (e) {
      console.log(`  ${attr}: ❌ Error - ${e.message}`);
    }
  });
  
  // Verificar eventos
  const events = ['loadedmetadata', 'canplay', 'canplaythrough', 'error'];
  events.forEach(event => {
    console.log(`  Evento ${event}: ${typeof video[`on${event}`] !== 'undefined' ? '✅ Soportado' : '❌ No soportado'}`);
  });
}

// 3. Verificar A-Frame
function testAFrame() {
  if (typeof AFRAME !== 'undefined') {
    console.log('🎮 A-Frame detectado:', {
      version: AFRAME.version,
      components: Object.keys(AFRAME.components || {}).length,
      systems: Object.keys(AFRAME.systems || {}).length
    });
  } else {
    console.log('❌ A-Frame no detectado');
  }
}

// 4. Verificar elementos de video existentes
function checkExistingVideos() {
  const videos = document.querySelectorAll('video');
  console.log(`🎬 Videos encontrados: ${videos.length}`);
  
  videos.forEach((video, index) => {
    console.log(`  Video ${index + 1}:`, {
      id: video.id,
      src: video.src,
      readyState: video.readyState,
      networkState: video.networkState,
      paused: video.paused,
      muted: video.muted,
      playsInline: video.playsInline,
      hasAttribute_playsinline: video.hasAttribute('playsinline'),
      hasAttribute_webkit_playsinline: video.hasAttribute('webkit-playsinline')
    });
  });
}

// 5. Verificar escenas A-Frame
function checkAFrameScenes() {
  const scenes = document.querySelectorAll('a-scene');
  console.log(`🌐 Escenas A-Frame encontradas: ${scenes.length}`);
  
  scenes.forEach((scene, index) => {
    console.log(`  Escena ${index + 1}:`, {
      embedded: scene.hasAttribute('embedded'),
      vrModeUI: scene.getAttribute('vr-mode-ui'),
      background: scene.getAttribute('background'),
      cursor: scene.getAttribute('cursor'),
      raycaster: scene.getAttribute('raycaster')
    });
    
    // Verificar cámaras
    const cameras = scene.querySelectorAll('a-camera');
    console.log(`    Cámaras: ${cameras.length}`);
    cameras.forEach((camera, camIndex) => {
      const cursor = camera.querySelector('a-cursor');
      console.log(`      Cámara ${camIndex + 1}:`, {
        position: camera.getAttribute('position'),
        lookControls: camera.getAttribute('look-controls'),
        wasdControls: camera.getAttribute('wasd-controls'),
        hasCursor: !!cursor,
        cursorRaycaster: cursor ? cursor.getAttribute('raycaster') : null
      });
    });
    
    // Verificar elementos clickeables
    const clickables = scene.querySelectorAll('.clickable');
    console.log(`    Elementos clickeables: ${clickables.length}`);
  });
}

// 6. Función para probar reproducción de video
function testVideoPlayback() {
  const videos = document.querySelectorAll('video');
  if (videos.length === 0) {
    console.log('❌ No hay videos para probar');
    return;
  }
  
  console.log('▶️ Probando reproducción de video...');
  videos.forEach((video, index) => {
    console.log(`  Probando video ${index + 1}...`);
    
    if (video.paused) {
      video.play().then(() => {
        console.log(`    ✅ Video ${index + 1} reproduciendo correctamente`);
      }).catch(err => {
        console.log(`    ❌ Error reproduciendo video ${index + 1}:`, err.message);
      });
    } else {
      console.log(`    ⏸️ Video ${index + 1} ya está reproduciendo`);
    }
  });
}

// 7. Función para simular interacción del usuario
function simulateUserInteraction() {
  console.log('👆 Simulando interacción del usuario...');
  
  // Simular click en el documento
  const clickEvent = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true
  });
  
  document.dispatchEvent(clickEvent);
  console.log('    ✅ Evento de click simulado');
  
  // Simular touch en móviles
  if (isMobile) {
    const touchEvent = new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches: [new Touch({
        identifier: 0,
        target: document.body,
        clientX: 100,
        clientY: 100,
        pageX: 100,
        pageY: 100
      })]
    });
    
    document.dispatchEvent(touchEvent);
    console.log('    ✅ Evento de touch simulado');
  }
}

// Ejecutar todas las pruebas
console.log('\n' + '='.repeat(50));
testVideoCapabilities();
console.log('\n' + '-'.repeat(30));
testAFrame();
console.log('\n' + '-'.repeat(30));
checkExistingVideos();
console.log('\n' + '-'.repeat(30));
checkAFrameScenes();
console.log('\n' + '-'.repeat(30));

// Esperar un momento y luego probar reproducción
setTimeout(() => {
  testVideoPlayback();
  console.log('\n' + '-'.repeat(30));
  simulateUserInteraction();
  console.log('\n' + '='.repeat(50));
  console.log('✅ Diagnóstico completado');
}, 1000);

// Exportar funciones para uso manual
window.mobileAFrameTest = {
  testVideoCapabilities,
  testAFrame,
  checkExistingVideos,
  checkAFrameScenes,
  testVideoPlayback,
  simulateUserInteraction,
  isMobile,
  isIOS,
  isAndroid
};

console.log('💡 Usa window.mobileAFrameTest para ejecutar pruebas específicas'); 