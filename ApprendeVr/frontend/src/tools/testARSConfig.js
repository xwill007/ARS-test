/**
 * Test de Configuración ARS
 * 
 * Ejecutar en la consola del navegador para verificar la funcionalidad
 */

// Test 1: Verificar que la configuración se guarda correctamente
async function testSaveConfig() {
  console.log('🧪 TEST 1: Verificando guardado de configuración');
  
  // Limpiar configuración anterior
  localStorage.removeItem('arsconfig-persistent');
  
  // Simular guardado de configuración
  const testConfig = {
    arSeparation: 40,
    arWidth: 400,
    arHeight: 500,
    offsetL: -10,
    offsetR: 10,
    zoom: 1.2,
    cameraResolution: "1080p"
  };
  
  // Usar el manager para guardar
  if (window.arsConfigManager) {
    const success = await window.arsConfigManager.saveConfig(testConfig);
    console.log('✅ Configuración guardada:', success);
    
    // Verificar que se guardó correctamente
    const stored = localStorage.getItem('arsconfig-persistent');
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('💾 Configuración en localStorage:', parsed);
      
      if (parsed.userConfig && parsed.userConfig.cameraResolution === "1080p") {
        console.log('✅ TEST 1 PASADO: cameraResolution se guardó correctamente');
      } else {
        console.log('❌ TEST 1 FALLIDO: cameraResolution no se guardó');
      }
    } else {
      console.log('❌ TEST 1 FALLIDO: No hay configuración en localStorage');
    }
  } else {
    console.log('❌ arsConfigManager no disponible');
  }
}

// Test 2: Verificar que la configuración se carga correctamente
async function testLoadConfig() {
  console.log('🧪 TEST 2: Verificando carga de configuración');
  
  if (window.arsConfigManager) {
    const config = window.arsConfigManager.loadConfig({
      arSeparation: 24,
      arWidth: 380,
      arHeight: 480,
      offsetL: 0,
      offsetR: 0,
      zoom: 1,
      cameraResolution: '720p'
    });
    
    console.log('📂 Configuración cargada:', config);
    
    if (config.cameraResolution) {
      console.log(`✅ TEST 2 PASADO: cameraResolution cargada = ${config.cameraResolution}`);
    } else {
      console.log('❌ TEST 2 FALLIDO: cameraResolution no está presente');
    }
  } else {
    console.log('❌ arsConfigManager no disponible');
  }
}

// Test 3: Verificar ciclo completo
async function testFullCycle() {
  console.log('🧪 TEST 3: Verificando ciclo completo');
  
  // Limpiar
  localStorage.removeItem('arsconfig-persistent');
  
  // Establecer configuración inicial
  const initialConfig = {
    arSeparation: 24,
    arWidth: 380,
    arHeight: 480,
    offsetL: 0,
    offsetR: 0,
    zoom: 1,
    cameraResolution: '720p'
  };
  
  // Guardar
  if (window.arsConfigManager) {
    await window.arsConfigManager.saveConfig(initialConfig);
    
    // Cargar
    const loadedConfig = window.arsConfigManager.loadConfig(initialConfig);
    
    console.log('📥 Configuración inicial:', initialConfig);
    console.log('📤 Configuración cargada:', loadedConfig);
    
    if (loadedConfig.cameraResolution === initialConfig.cameraResolution) {
      console.log('✅ TEST 3 PASADO: Ciclo completo funciona correctamente');
    } else {
      console.log('❌ TEST 3 FALLIDO: La configuración no se mantiene');
    }
  }
}

// Ejecutar todos los tests
async function runAllTests() {
  console.log('🚀 Ejecutando todos los tests de configuración ARS...');
  
  await testSaveConfig();
  await testLoadConfig();
  await testFullCycle();
  
  console.log('✅ Tests completados');
}

// Exportar funciones para uso en consola
window.testSaveConfig = testSaveConfig;
window.testLoadConfig = testLoadConfig;
window.testFullCycle = testFullCycle;
window.runAllTests = runAllTests;

console.log('🧪 Tests de configuración ARS cargados:');
console.log('- testSaveConfig(): Test guardado');
console.log('- testLoadConfig(): Test carga');
console.log('- testFullCycle(): Test ciclo completo');
console.log('- runAllTests(): Ejecutar todos los tests');
