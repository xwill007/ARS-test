/**
 * Script específico para diagnosticar el problema del cuadro negro en iOS
 * Ejecutar en la consola del navegador en tu iPhone
 */

console.log('🖤 Iniciando diagnóstico del problema del cuadro negro en iOS...');

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

// 2. Verificar videos existentes y su estado
function checkVideoElements() {
  const videos = document.querySelectorAll('video');
  console.log(`🎬 Videos encontrados: ${videos.length}`);
  
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
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      duration: video.duration,
      currentTime: video.currentTime,
      error: video.error ? {
        code: video.error.code,
        message: video.error.message
      } : null
    });
  });
}

// 3. Verificar escenas A-Frame y sus texturas
function checkAFrameTextures() {
  const scenes = document.querySelectorAll('a-scene');
  console.log(`🌐 Escenas A-Frame encontradas: ${scenes.length}`);
  
  scenes.forEach((scene, index) => {
    console.log(`  Escena ${index + 1}:`, {
      embedded: scene.hasAttribute('embedded'),
      vrModeUI: scene.getAttribute('vr-mode-ui'),
      background: scene.getAttribute('background')
    });
    
    // Verificar assets
    const assets = scene.querySelectorAll('a-assets video');
    console.log(`    Videos en assets: ${assets.length}`);
    assets.forEach((asset, assetIndex) => {
      console.log(`      Asset ${assetIndex + 1}:`, {
        id: asset.id,
        src: asset.src,
        readyState: asset.readyState,
        networkState: asset.networkState,
        videoWidth: asset.videoWidth,
        videoHeight: asset.videoHeight
      });
    });
    
    // Verificar planos de video y sus materiales
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
      
      // Verificar si el plano tiene un objeto 3D
      const object3D = plane.getObject3D('mesh');
      if (object3D) {
        console.log(`        Object3D:`, {
          hasMesh: !!object3D,
          hasMaterial: !!object3D.material,
          materialType: object3D.material ? object3D.material.type : 'none',
          hasMap: object3D.material && object3D.material.map ? 'yes' : 'no'
        });
      }
    });
  });
}

// 4. Verificar WebGL y capacidades de textura
function checkWebGLCapabilities() {
  console.log('🎨 Verificando capacidades WebGL...');
  
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  
  if (gl) {
    console.log('  ✅ WebGL disponible');
    console.log('  Vendor:', gl.getParameter(gl.VENDOR));
    console.log('  Renderer:', gl.getParameter(gl.RENDERER));
    console.log('  Version:', gl.getParameter(gl.VERSION));
    console.log('  Max texture size:', gl.getParameter(gl.MAX_TEXTURE_SIZE));
    console.log('  Max viewport dimensions:', gl.getParameter(gl.MAX_VIEWPORT_DIMS));
  } else {
    console.log('  ❌ WebGL no disponible');
  }
}

// 5. Probar reproducción de video específicamente
function testVideoPlayback() {
  const videos = document.querySelectorAll('video');
  if (videos.length === 0) {
    console.log('❌ No hay videos para probar');
    return;
  }
  
  console.log('▶️ Probando reproducción de video...');
  videos.forEach((video, index) => {
    console.log(`  Probando video ${index + 1}...`);
    
    // Verificar si el video está listo
    if (video.readyState < 2) {
      console.log(`    ⏳ Video ${index + 1} no está listo (readyState: ${video.readyState})`);
      return;
    }
    
    if (video.paused) {
      console.log(`    🎯 Video ${index + 1} pausado - intentando reproducir...`);
      
      video.play().then(() => {
        console.log(`    ✅ Video ${index + 1} reproduciendo correctamente`);
        
        // Verificar si realmente se está reproduciendo
        setTimeout(() => {
          console.log(`    📊 Estado después de 2s:`, {
            paused: video.paused,
            currentTime: video.currentTime,
            readyState: video.readyState
          });
        }, 2000);
        
      }).catch(err => {
        console.log(`    ❌ Error reproduciendo video ${index + 1}:`, {
          name: err.name,
          message: err.message,
          code: err.code
        });
      });
    } else {
      console.log(`    ⏸️ Video ${index + 1} ya está reproduciendo`);
    }
  });
}

// 6. Verificar si A-Frame está funcionando correctamente
function checkAFrameStatus() {
  if (typeof AFRAME !== 'undefined') {
    console.log('🎮 A-Frame detectado:', {
      version: AFRAME.version,
      components: Object.keys(AFRAME.components || {}).length,
      systems: Object.keys(AFRAME.systems || {}).length
    });
    
    // Verificar si hay errores en A-Frame
    const scenes = document.querySelectorAll('a-scene');
    scenes.forEach((scene, index) => {
      const renderer = scene.renderer;
      if (renderer) {
        console.log(`  Renderer de escena ${index + 1}:`, {
          hasRenderer: !!renderer,
          rendererType: renderer.constructor.name,
          hasContext: !!renderer.getContext()
        });
      }
    });
  } else {
    console.log('❌ A-Frame no detectado');
  }
}

// 7. Función para forzar actualización de texturas
function forceTextureUpdate() {
  console.log('🔄 Forzando actualización de texturas...');
  
  const videos = document.querySelectorAll('video');
  videos.forEach((video, index) => {
    if (video.readyState >= 2) {
      // Forzar un frame del video
      video.currentTime = video.currentTime;
      console.log(`    ✅ Video ${index + 1} actualizado`);
    }
  });
  
  // Buscar materiales de A-Frame y forzar actualización
  const scenes = document.querySelectorAll('a-scene');
  scenes.forEach((scene, index) => {
    const planes = scene.querySelectorAll('a-plane');
    planes.forEach((plane, planeIndex) => {
      const object3D = plane.getObject3D('mesh');
      if (object3D && object3D.material && object3D.material.map) {
        object3D.material.map.needsUpdate = true;
        console.log(`    ✅ Material de plano ${planeIndex + 1} actualizado`);
      }
    });
  });
}

// 8. Función para crear un video de prueba simple
function createTestVideo() {
  console.log('🧪 Creando video de prueba...');
  
  const testVideo = document.createElement('video');
  testVideo.id = 'test-video-ios';
  testVideo.src = '/videos/sample.mp4';
  testVideo.crossOrigin = 'anonymous';
  testVideo.loop = true;
  testVideo.muted = true;
  testVideo.playsInline = true;
  testVideo.setAttribute('playsinline', '');
  testVideo.setAttribute('webkit-playsinline', '');
  testVideo.preload = 'auto';
  
  testVideo.addEventListener('loadedmetadata', () => {
    console.log('    ✅ Video de prueba cargado:', {
      duration: testVideo.duration,
      videoWidth: testVideo.videoWidth,
      videoHeight: testVideo.videoHeight
    });
  });
  
  testVideo.addEventListener('error', (e) => {
    console.log('    ❌ Error en video de prueba:', e);
  });
  
  document.body.appendChild(testVideo);
  console.log('    📝 Video de prueba creado con ID: test-video-ios');
}

// Ejecutar todas las pruebas
console.log('\n' + '='.repeat(50));
checkVideoElements();
console.log('\n' + '-'.repeat(30));
checkAFrameTextures();
console.log('\n' + '-'.repeat(30));
checkWebGLCapabilities();
console.log('\n' + '-'.repeat(30));
checkAFrameStatus();
console.log('\n' + '-'.repeat(30));

// Esperar un momento y luego probar reproducción
setTimeout(() => {
  testVideoPlayback();
  console.log('\n' + '-'.repeat(30));
  forceTextureUpdate();
  console.log('\n' + '-'.repeat(30));
  createTestVideo();
  console.log('\n' + '='.repeat(50));
  console.log('✅ Diagnóstico del cuadro negro completado');
}, 1000);

// Exportar funciones para uso manual
window.iOSBlackScreenDebug = {
  checkVideoElements,
  checkAFrameTextures,
  checkWebGLCapabilities,
  testVideoPlayback,
  checkAFrameStatus,
  forceTextureUpdate,
  createTestVideo,
  isIOS,
  isSafari,
  isChromeIOS
};

console.log('💡 Usa window.iOSBlackScreenDebug para ejecutar pruebas específicas'); 