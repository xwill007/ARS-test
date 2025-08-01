// Configuración para manejar problemas de SSL en desarrollo
export const sslConfig = {
  // Deshabilitar el service worker en desarrollo si hay problemas de SSL
  disableServiceWorker: import.meta.env.DEV && import.meta.env.VITE_HTTPS === 'true',
  
  // Configuración para el service worker
  serviceWorkerConfig: {
    scope: '/',
    updateViaCache: 'none'
  }
};

// Función para registrar el service worker de forma segura
export const registerServiceWorker = async () => {
  if (sslConfig.disableServiceWorker) {
    console.warn('[SSL] Service Worker deshabilitado en desarrollo con HTTPS');
    return;
  }

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', sslConfig.serviceWorkerConfig);
      console.log('[Service Worker] Registrado exitosamente:', registration);
    } catch (error) {
      console.warn('[Service Worker] Error al registrar:', error.message);
      // No lanzar error para evitar que rompa la aplicación
    }
  }
}; 