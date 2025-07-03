import React, { useState, useEffect } from 'react';
import overlayRegistry from './overlays/index'; // Auto-registro de overlays
import OverlayDropdownMenu from './OverlayDropdownMenu';
import ARSOverlayCounter from './ARSOverlayCounter';

/**
 * AROverlayManager - Gestor completo de overlays
 * Maneja la lógica de creación, activación/desactivación y renderizado de overlays
 * Ahora usa el registro automático de overlays
 */
const AROverlayManager = ({ 
  isARActive, 
  onOverlaysChange,
  initialOverlays = ['vrConeOverlay'] // Usar el overlay VRCone registrado
}) => {
  const [selectedOverlays, setSelectedOverlays] = useState(initialOverlays);
  const [renderKey, setRenderKey] = useState(0);

  // Obtener overlays disponibles del registro
  const availableOverlays = overlayRegistry.getAll();

  // Función para crear los overlays dinámicamente usando el registro
  const createOverlays = (overlayKeys, keys) => {
    const overlayComponents = {
      html: [],
      r3f: []
    };

    overlayKeys.forEach((overlayKey, index) => {
      const overlayConfig = overlayRegistry.get(overlayKey);
      
      if (!overlayConfig) {
        console.warn(`Overlay "${overlayKey}" not found in registry`);
        return;
      }
      
      const key = keys[index];
      const Component = overlayConfig.component;
      const props = {
        key,
        ...overlayConfig.defaultProps
      };
      
      // Renderizar según el tipo
      if (overlayConfig.type === 'r3f') {
        overlayComponents.r3f.push(
          <Component {...props} />
        );
      } else if (overlayConfig.type === 'html') {
        overlayComponents.html.push(
          <Component {...props} />
        );
      }
    });

    return overlayComponents;
  };

  // Actualizar renderKey cuando cambien los overlays seleccionados
  useEffect(() => {
    setRenderKey(prev => prev + 1);
    console.log('AROverlayManager - Overlays changed to:', selectedOverlays);
  }, [selectedOverlays]);

  // Notificar cambios al componente padre
  useEffect(() => {
    const overlayKeys = selectedOverlays.map((overlay, index) => `${overlay}-${renderKey}-${index}`);
    const overlayComponents = createOverlays(selectedOverlays, overlayKeys);
    
    if (onOverlaysChange) {
      onOverlaysChange({
        selectedOverlays,
        overlayComponents,
        renderKey
      });
    }
  }, [selectedOverlays, renderKey, onOverlaysChange]);

  // Manejar toggle de overlays
  const handleOverlayToggle = (overlayKey) => {
    console.log('AROverlayManager - Toggling overlay:', overlayKey);
    setSelectedOverlays(prev => {
      if (prev.includes(overlayKey)) {
        // Remover el overlay si ya está seleccionado
        return prev.filter(overlay => overlay !== overlayKey);
      } else {
        // Agregar el overlay si no está seleccionado
        return [...prev, overlayKey];
      }
    });
  };

  // Limpiar todos los overlays
  const handleClearAllOverlays = () => {
    console.log('AROverlayManager - Clearing all overlays');
    setSelectedOverlays([]);
  };

  // Activar overlay específico
  const activateOverlay = (overlayKey) => {
    if (!selectedOverlays.includes(overlayKey)) {
      setSelectedOverlays(prev => [...prev, overlayKey]);
    }
  };

  // Desactivar overlay específico
  const deactivateOverlay = (overlayKey) => {
    setSelectedOverlays(prev => prev.filter(overlay => overlay !== overlayKey));
  };

  // Establecer overlays específicos
  const setOverlays = (overlayKeys) => {
    setSelectedOverlays(Array.isArray(overlayKeys) ? overlayKeys : [overlayKeys]);
  };

  // Obtener información de overlays activos
  const getActiveOverlaysInfo = () => {
    return selectedOverlays.map(key => ({
      key,
      ...availableOverlays[key]
    }));
  };

  // Obtener estadísticas
  const getStats = () => {
    const activeOverlays = getActiveOverlaysInfo();
    const htmlCount = activeOverlays.filter(o => o.type === 'html').length;
    const r3fCount = activeOverlays.filter(o => o.type === 'r3f').length;
    
    return {
      total: selectedOverlays.length,
      html: htmlCount,
      r3f: r3fCount,
      renderKey
    };
  };

  return {
    // Estado
    selectedOverlays,
    renderKey,
    availableOverlays,
    
    // Métodos públicos
    handleOverlayToggle,
    handleClearAllOverlays,
    activateOverlay,
    deactivateOverlay,
    setOverlays,
    getActiveOverlaysInfo,
    getStats,
    
    // Componentes de UI
    OverlayControls: () => (
      !isARActive && (
        <div style={{ 
          position: 'fixed', 
          top: 12, 
          left: 12, 
          zIndex: 5000 
        }}>
          <OverlayDropdownMenu
            selectedOverlays={selectedOverlays}
            onOverlayToggle={handleOverlayToggle}
            onClearAll={handleClearAllOverlays}
            multiSelect={true}
          />
        </div>
      )
    ),
    
    OverlayCounter: () => (
      <ARSOverlayCounter selectedOverlays={selectedOverlays} />
    )
  };
};

export default AROverlayManager;
