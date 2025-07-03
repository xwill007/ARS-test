import { useState, useCallback } from 'react';
import AROverlayManager from '../ARScomponents/AROverlayManager';

/**
 * useAROverlays - Hook personalizado para manejar overlays
 * Proporciona una interfaz limpia para gestionar overlays en componentes
 */
const useAROverlays = (initialOverlays = ['VRConeOverlay']) => {
  const [overlayData, setOverlayData] = useState({
    selectedOverlays: initialOverlays,
    overlayComponents: { html: [], r3f: [] },
    renderKey: 0
  });

  // Callback para manejar cambios en overlays
  const handleOverlaysChange = useCallback((data) => {
    setOverlayData(data);
  }, []);

  // Crear instancia del manager
  const overlayManager = AROverlayManager({
    isARActive: false, // Se actualizará desde el componente padre
    onOverlaysChange: handleOverlaysChange,
    initialOverlays
  });

  // Función para preparar overlays para AR
  const prepareOverlaysForAR = useCallback(() => {
    if (overlayData.selectedOverlays.length === 0) {
      return null;
    }
    
    const allOverlays = [
      ...overlayData.overlayComponents.html, 
      ...overlayData.overlayComponents.r3f
    ];
    return allOverlays.length > 0 ? allOverlays : null;
  }, [overlayData]);

  return {
    // Datos de estado
    selectedOverlays: overlayData.selectedOverlays,
    overlayComponents: overlayData.overlayComponents,
    renderKey: overlayData.renderKey,
    
    // Métodos del manager
    ...overlayManager,
    
    // Funciones de utilidad
    prepareOverlaysForAR,
    
    // Estado de overlay por tipo
    hasHTMLOverlays: overlayData.overlayComponents.html.length > 0,
    hasR3FOverlays: overlayData.overlayComponents.r3f.length > 0,
    hasAnyOverlays: overlayData.selectedOverlays.length > 0,
    
    // Estadísticas
    overlayStats: {
      total: overlayData.selectedOverlays.length,
      html: overlayData.overlayComponents.html.length,
      r3f: overlayData.overlayComponents.r3f.length
    }
  };
};

export default useAROverlays;
