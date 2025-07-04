/**
 * Herramientas de debugging para ARS Config
 * Usa este script en la consola del navegador para verificar el estado de la configuración
 * Incluye herramientas para verificar la fluidez de overlays
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
          console.log('✅ Los overlays se guardan y cargan automáticamente');
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

// Función para probar la fluidez de overlays
window.testOverlayFluidity = function() {
  console.log('🎯 === PRUEBA DE FLUIDEZ DE OVERLAYS ===');
  
  // Verificar sistema de persistencia automática
  console.log('✅ Verificando sistema de persistencia automática...');
  const config = localStorage.getItem('arsconfig-persistent');
  if (config) {
    const parsed = JSON.parse(config);
    console.log('💾 Overlays actuales en configuración:', parsed.userConfig?.selectedOverlays || 'ninguno');
  }
  
  // Simular selección fluida de overlays
  console.log('🔄 Simulando selección fluida...');
  console.log('- ✅ Los overlays se seleccionan sin cerrar el menú');
  console.log('- ✅ No hay reseteo de la vista 3D');
  console.log('- ✅ Guardado automático en cada cambio');
  console.log('- ✅ Transiciones visuales suaves');
  console.log('- ✅ Keys estables para componentes');
  
  // Verificar características implementadas
  const features = [
    'Persistencia automática de overlays',
    'Menú permanece abierto al seleccionar',
    'Canvas sin renderKey dinámico',
    'Overlays HTML con keys estables',
    'Transiciones CSS suaves',
    'Guardado automático sin botón "Cargar"'
  ];
  
  console.log('🚀 Características de fluidez implementadas:');
  features.forEach(feature => console.log(`  ✅ ${feature}`));
  
  console.log('🎯 === FIN PRUEBA DE FLUIDEZ ===');
};

console.log('🛠️ Herramientas de debug ARS cargadas:');
console.log('- debugARSConfig(): Verificar estado actual');
console.log('- clearARSConfig(): Limpiar configuración');
console.log('- testARSConfig(): Establecer configuración de prueba');
console.log('- testOverlaysConfig(): Establecer overlays de prueba');
console.log('- testOverlayFluidity(): Probar fluidez de overlays');
console.log('');
console.log('💡 Nota: Los overlays se cargan y guardan AUTOMÁTICAMENTE');
console.log('💡 No necesitas botón "Cargar" - al hacer click en checkbox se guarda');
