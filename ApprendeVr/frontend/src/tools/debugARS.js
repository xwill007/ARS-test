/**
 * Herramientas de debugging para ARS Config
 * Usa este script en la consola del navegador para verificar el estado de la configuración
 */

// Función para verificar el estado del localStorage
window.debugARSConfig = function() {
  console.log('🔍 === DEBUG ARS CONFIG ===');
  
  // Verificar localStorage persistente
  const persistent = localStorage.getItem('arsconfig-persistent');
  if (persistent) {
    try {
      const parsed = JSON.parse(persistent);
      console.log('💾 Configuración persistente encontrada:');
      console.log(parsed);
      
      if (parsed.userConfig) {
        console.log('👤 User Config:');
        console.log(parsed.userConfig);
        
        if (parsed.userConfig.cameraResolution) {
          console.log(`📹 Resolución de cámara guardada: ${parsed.userConfig.cameraResolution}`);
        } else {
          console.log('❌ No hay resolución de cámara en userConfig');
        }
        
        if (parsed.userConfig.selectedOverlays) {
          console.log(`🎭 Overlays seleccionados: [${parsed.userConfig.selectedOverlays.join(', ')}]`);
          console.log(`📊 Cantidad de overlays: ${parsed.userConfig.selectedOverlays.length}`);
        } else {
          console.log('❌ No hay overlays seleccionados en userConfig');
        }
      }
    } catch (e) {
      console.error('❌ Error parsing configuración persistente:', e);
    }
  } else {
    console.log('❌ No hay configuración persistente en localStorage');
  }
  
  // Verificar localStorage legacy
  const legacy = localStorage.getItem('arsconfig-user');
  if (legacy) {
    console.log('📂 Configuración legacy encontrada:', JSON.parse(legacy));
  } else {
    console.log('✅ No hay configuración legacy');
  }
  
  console.log('🔍 === FIN DEBUG ===');
};

// Función para limpiar toda la configuración
window.clearARSConfig = function() {
  localStorage.removeItem('arsconfig-persistent');
  localStorage.removeItem('arsconfig-user');
  console.log('🧹 Configuración ARS limpiada del localStorage');
};

// Función para establecer una configuración de prueba
window.testARSConfig = function() {
  const testConfig = {
    version: "1.0.0",
    userConfig: {
      arSeparation: 40,
      arWidth: 400,
      arHeight: 500,
      offsetL: -10,
      offsetR: 10,
      zoom: 1.2,
      cameraResolution: "1080p",
      selectedOverlays: ["vrConeOverlay", "vrConeR3FVideoOverlay"],
      deviceType: "test",
      customProfile: true
    },
    lastUpdated: new Date().toISOString()
  };
  
  localStorage.setItem('arsconfig-persistent', JSON.stringify(testConfig));
  console.log('🧪 Configuración de prueba establecida:', testConfig);
};

// Función para probar solo overlays
window.testOverlaysConfig = function() {
  const testOverlays = ["vrConeOverlay", "vrConeR3FVideoOverlay"];
  
  // Cargar configuración actual
  const current = localStorage.getItem('arsconfig-persistent');
  let config = {};
  
  if (current) {
    config = JSON.parse(current);
  }
  
  config.userConfig = {
    ...config.userConfig,
    selectedOverlays: testOverlays
  };
  
  localStorage.setItem('arsconfig-persistent', JSON.stringify(config));
  console.log('🎭 Overlays de prueba establecidos:', testOverlays);
};

console.log('🛠️ Herramientas de debug ARS cargadas:');
console.log('- debugARSConfig(): Verificar estado actual');
console.log('- clearARSConfig(): Limpiar configuración');
console.log('- testARSConfig(): Establecer configuración de prueba');
console.log('- testOverlaysConfig(): Establecer overlays de prueba');
console.log('');
console.log('💡 Nota: Los overlays se cargan y guardan AUTOMÁTICAMENTE');
console.log('💡 No necesitas botón "Cargar" - al hacer click en checkbox se guarda');
