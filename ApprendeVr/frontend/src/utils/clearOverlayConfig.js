// Utilidad para limpiar configuración de overlays en localStorage
// Ejecutar en consola del navegador para forzar recarga de configuración

console.log('Limpiando configuración de overlays...');

// Limpiar configuración de overlays
const overlayKeys = Object.keys(localStorage).filter(key => key.includes('overlay'));
overlayKeys.forEach(key => {
  localStorage.removeItem(key);
  console.log(`Removed: ${key}`);
});

// Limpiar configuración ARS
const arsKeys = Object.keys(localStorage).filter(key => key.includes('ars') || key.includes('ARS'));
arsKeys.forEach(key => {
  localStorage.removeItem(key);
  console.log(`Removed: ${key}`);
});

// Limpiar configuración de video
const videoKeys = Object.keys(localStorage).filter(key => key.includes('video') || key.includes('Video'));
videoKeys.forEach(key => {
  localStorage.removeItem(key);
  console.log(`Removed: ${key}`);
});

console.log('Configuración limpiada. Recarga la página para aplicar cambios.');
