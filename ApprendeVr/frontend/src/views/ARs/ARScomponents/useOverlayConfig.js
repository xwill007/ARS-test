import { useState, useEffect, useCallback } from 'react';
import configurableOverlayManager from './ConfigurableOverlayManager';

/**
 * useOverlayConfig - Hook para manejar configuraciones reactivas de overlays
 * @param {string} overlayId - ID del overlay
 * @param {number} renderKey - Clave para forzar actualizaciones
 * @returns {object} Configuración y función de actualización
 */
const useOverlayConfig = (overlayId, renderKey = 0) => {
  const [config, setConfig] = useState(() => 
    configurableOverlayManager.getOverlayConfig(overlayId)
  );

  // Suscribirse a cambios de configuración
  useEffect(() => {
    const unsubscribe = configurableOverlayManager.subscribe(overlayId, (newConfig) => {
      setConfig(newConfig);
      console.log(`Config updated for ${overlayId}:`, newConfig);
    });

    // Cargar configuración inicial
    const initialConfig = configurableOverlayManager.getOverlayConfig(overlayId);
    setConfig(initialConfig);

    return unsubscribe;
  }, [overlayId]);

  // Actualizar configuración cuando cambie el renderKey
  useEffect(() => {
    const newConfig = configurableOverlayManager.getOverlayConfig(overlayId);
    setConfig(newConfig);
  }, [overlayId, renderKey]);

  // Función para actualizar configuración
  const updateConfig = useCallback((key, value) => {
    const success = configurableOverlayManager.updateOverlayConfig(overlayId, {
      [key]: value
    });
    
    console.log(`Config update attempt for ${overlayId}.${key}:`, value, success);
    return success;
  }, [overlayId]);

  // Función para actualizar posición específica
  const updatePosition = useCallback((elementKey, position) => {
    const success = configurableOverlayManager.updateOverlayPosition(overlayId, elementKey, position);
    
    console.log(`Position update attempt for ${overlayId}.${elementKey}:`, position, success);
    return success;
  }, [overlayId]);

  // Función para resetear configuración
  const resetConfig = useCallback(() => {
    const newConfig = configurableOverlayManager.resetOverlayConfig(overlayId);
    setConfig(newConfig);
    console.log(`Config reset for ${overlayId}`);
    return newConfig;
  }, [overlayId]);

  return {
    config,
    updateConfig,
    updatePosition,
    resetConfig
  };
};

export default useOverlayConfig;
