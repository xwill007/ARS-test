/**
 * Script específico para diagnosticar problemas de video en iOS
 * Ejecutar en la consola del navegador en tu iPhone
 */

console.log('🍎 Iniciando diagnóstico específico para iOS...');

// 1. Detectar iOS específicamente
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);
const isChromeIOS = /CriOS/i.test(navigator.userAgent);

console.log('📱 Información iOS:', {
  userAgent: navigator.userAgent,
  isIOS,
  isSafari,
  isChromeIOS,
  platform: navigator.platform,
  vendor: navigator.vendor,
  iOSVersion: navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/)?.[1] || 'Unknown'
});

// 2. Verificar capacidades específicas de iOS
function testIOSVideoCapabilities() {
  const video = document.createElement('video');
  
  console.log('🎥 Capacidades de video en iOS:');
  
  // Atributos específicos de iOS
  const iosAttributes = [
    'playsInline',
    'webkit-playsinline',
    'x-webkit-airplay',
    'x5-video-player-type',
    'x5-video-player-fullscreen',
    'x5-video-orientation'
  ];
  
  iosAttributes.forEach(attr => {
    try {
      video.setAttribute(attr, 'test');
      const value = video.getAttribute(attr);
      console.log(`  ${attr}: ${value ? '✅ Soportado' : '❌ No soportado'}`);
    } catch (e) {
      console.log(`  ${attr}: ❌ Error - ${e.message}`);
    }
  });
  
  // Verificar propiedades específicas
  console.log('  playsInline property:', video.playsInline);
  console.log('  webkitSupportsFullscreen:', video.webkitSupportsFullscreen);
  console.log('  webkitEnterFullscreen:', typeof video.webkitEnterFullscreen);
  console.log('  webkitExitFullscreen:', typeof video.webkitExitFullscreen);
}

// 3. Verificar videos existentes en la página
function checkExistingVideos() {
  const videos = document.querySelectorAll('video');
  console.log(`🎬 Videos encontrados en la página: ${videos.length}`);
  
  videos.forEach((video, index) => {
    console.log(`  Video ${index + 1}:`, {
      id: video.id,
      src: video.src,
      currentSrc: video.currentSrc,
      readyState: video.readyState,
      networkState: video.networkState,
      paused: video.paused,
      muted: video.muted,
      volume: video.volume,
      playsInline: video.playsInline,
      hasAttribute_playsinline: video.hasAttribute('playsinline'),
      hasAttribute_webkit_playsinline: video.hasAttribute('webkit-playsinline'),
      error: video.error ? {
        code: video.error.code,
        message: video.error.message
      } : null
    });
  });
}

// 4. Verificar escenas A-Frame específicamente
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
    
    // Verificar assets
    const assets = scene.querySelectorAll('a-assets video');
    console.log(`    Videos en assets: ${assets.length}`);
    assets.forEach((asset, assetIndex) => {
      console.log(`      Asset ${assetIndex + 1}:`, {
        id: asset.id,
        src: asset.src,
        readyState: asset.readyState,
        networkState: asset.networkState
      });
    });
    
    // Verificar planos de video
    const videoPlanes = scene.querySelectorAll('a-plane');
    console.log(`    Planos encontrados: ${videoPlanes.length}`);
    videoPlanes.forEach((plane, planeIndex) => {
      const material = plane.getAttribute('material');
      console.log(`      Plano ${planeIndex + 1}:`, {
        material: material,
        hasVideoSrc: material && material.includes('src: #'),
        position: plane.getAttribute('position'),
        scale: plane.getAttribute('scale'),
        class: plane.getAttribute('class')
      });
    });
  });
}

// 5. Función para probar reproducción específica de iOS
function testIOSVideoPlayback() {
  const videos = document.querySelectorAll('video');
  if (videos.length === 0) {
    console.log('❌ No hay videos para probar');
    return;
  }
  
  console.log('▶️ Probando reproducción específica de iOS...');
  videos.forEach((video, index) => {
    console.log(`  Probando video ${index + 1}...`);
    
    // Verificar si el video está listo
    if (video.readyState < 2) {
      console.log(`    ⏳ Video ${index + 1} no está listo (readyState: ${video.readyState})`);
      return;
    }
    
    if (video.paused) {
      // En iOS, necesitamos interacción del usuario
      console.log(`    🎯 Video ${index + 1} pausado - intentando reproducir...`);
      
      // Intentar reproducir con manejo de errores específico de iOS
      video.play().then(() => {
        console.log(`    ✅ Video ${index + 1} reproduciendo correctamente`);
      }).catch(err => {
        console.log(`    ❌ Error reproduciendo video ${index + 1}:`, {
          name: err.name,
          message: err.message,
          code: err.code
        });
        
        // Errores específicos de iOS
        if (err.name === 'NotAllowedError') {
          console.log(`    💡 Error de iOS: Se requiere interacción del usuario`);
        } else if (err.name === 'NotSupportedError') {
          console.log(`    💡 Error de iOS: Formato de video no soportado`);
        }
      });
    } else {
      console.log(`    ⏸️ Video ${index + 1} ya está reproduciendo`);
    }
  });
}

// 6. Función para simular interacción del usuario en iOS
function simulateIOSUserInteraction() {
  console.log('👆 Simulando interacción del usuario en iOS...');
  
  // En iOS, necesitamos un evento de touch real
  const touchEvent = new TouchEvent('touchstart', {
    bubbles: true,
    cancelable: true,
    touches: [new Touch({
      identifier: 0,
      target: document.body,
      clientX: 100,
      clientY: 100,
      pageX: 100,
      pageY: 100,
      radiusX: 1,
      radiusY: 1,
      rotationAngle: 0,
      force: 1
    })]
  });
  
  document.dispatchEvent(touchEvent);
  console.log('    ✅ Evento de touch simulado');
  
  // También simular click
  const clickEvent = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true
  });
  
  document.dispatchEvent(clickEvent);
  console.log('    ✅ Evento de click simulado');
}

// 7. Función para verificar permisos de audio/video
function checkIOSPermissions() {
  console.log('🔐 Verificando permisos en iOS...');
  
  // Verificar si podemos acceder a getUserMedia
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: false, audio: false })
      .then(() => {
        console.log('    ✅ Permisos de media disponibles');
      })
      .catch(err => {
        console.log('    ❌ Error de permisos:', err.message);
      });
  } else {
    console.log('    ⚠️ getUserMedia no disponible');
  }
}

// Ejecutar todas las pruebas
console.log('\n' + '='.repeat(50));
testIOSVideoCapabilities();
console.log('\n' + '-'.repeat(30));
checkExistingVideos();
console.log('\n' + '-'.repeat(30));
checkAFrameScenes();
console.log('\n' + '-'.repeat(30));
checkIOSPermissions();
console.log('\n' + '-'.repeat(30));

// Esperar un momento y luego probar reproducción
setTimeout(() => {
  testIOSVideoPlayback();
  console.log('\n' + '-'.repeat(30));
  simulateIOSUserInteraction();
  console.log('\n' + '='.repeat(50));
  console.log('✅ Diagnóstico iOS completado');
}, 2000);

// Exportar funciones para uso manual
window.iOSVideoTest = {
  testIOSVideoCapabilities,
  checkExistingVideos,
  checkAFrameScenes,
  testIOSVideoPlayback,
  simulateIOSUserInteraction,
  checkIOSPermissions,
  isIOS,
  isSafari,
  isChromeIOS
};

console.log('💡 Usa window.iOSVideoTest para ejecutar pruebas específicas de iOS'); 