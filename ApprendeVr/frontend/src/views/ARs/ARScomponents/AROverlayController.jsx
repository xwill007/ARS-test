import React, { useState, useEffect } from 'react';
import overlayRegistry from './overlays/index'; // Auto-registro de overlays
import OverlayDropdownMenu from './OverlayDropdownMenu';
import ARSOverlayCounter from './ARSOverlayCounter';
import OverlayConfigPanel from './OverlayConfigPanel';
import OverlayDebugPanel from './OverlayDebugPanel';

/**
 * AROverlayController - Controlador completo de overlays
 * Versión simplificada que usa el sistema de registro automático
 */
const AROverlayController = ({ 
  isARActive = false, 
  initialOverlays = ['vrConeOverlay'] // Usar el overlay VRCone registrado
}) => {
  const [selectedOverlays, setSelectedOverlays] = useState(initialOverlays);
  const [renderKey, setRenderKey] = useState(0);
  const [configPanelOverlay, setConfigPanelOverlay] = useState(null);

  // Obtener overlays disponibles del registro
  const availableOverlays = overlayRegistry.getAll();

  // Función para crear los overlays dinámicamente usando el registro
  const createOverlays = (overlayKeys, keys) => {
    const overlayComponents = { html: [], r3f: [] };

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
        renderKey,
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

  // Actualizar renderKey cuando cambien los overlays
  useEffect(() => {
    setRenderKey(prev => prev + 1);
    console.log('AROverlayController - Overlays changed to:', selectedOverlays);
  }, [selectedOverlays]);

  // Calcular componentes de overlay
  const overlayKeys = selectedOverlays.map((overlay, index) => `${overlay}-${renderKey}-${index}`);
  const overlayComponents = createOverlays(selectedOverlays, overlayKeys);

  // Métodos de control
  const handleOverlayToggle = (overlayKey) => {
    console.log('Toggling overlay:', overlayKey);
    setSelectedOverlays(prev => {
      if (prev.includes(overlayKey)) {
        return prev.filter(overlay => overlay !== overlayKey);
      } else {
        return [...prev, overlayKey];
      }
    });
  };

  const handleClearAllOverlays = () => {
    console.log('Clearing all overlays');
    setSelectedOverlays([]);
  };

  const handleConfigureOverlay = (overlayKey) => {
    console.log('Configuring overlay:', overlayKey);
    setConfigPanelOverlay(overlayKey);
  };

  const handleCloseConfigPanel = () => {
    setConfigPanelOverlay(null);
    // Forzar re-render de overlays para mostrar cambios
    setRenderKey(prev => prev + 1);
  };

  const prepareOverlaysForAR = () => {
    if (selectedOverlays.length === 0) return null;
    const allOverlays = [...overlayComponents.html, ...overlayComponents.r3f];
    return allOverlays.length > 0 ? allOverlays : null;
  };

  // Componentes de UI
  const OverlayControls = () => (
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
          onConfigureOverlay={handleConfigureOverlay}
          multiSelect={true}
        />
      </div>
    )
  );

  const OverlayCounter = () => (
    <ARSOverlayCounter selectedOverlays={selectedOverlays} />
  );

  // Componente de panel de configuración
  const ConfigPanel = () => (
    <OverlayConfigPanel
      overlayId={configPanelOverlay}
      isVisible={configPanelOverlay !== null}
      onClose={handleCloseConfigPanel}
    />
  );

  // Panel de debug (opcional)
  const DebugPanel = () => (
    <OverlayDebugPanel
      overlayId={configPanelOverlay}
      visible={configPanelOverlay !== null}
    />
  );

  return {
    // Estado
    selectedOverlays,
    overlayComponents,
    renderKey,
    
    // Métodos
    handleOverlayToggle,
    handleClearAllOverlays,
    handleConfigureOverlay,
    handleCloseConfigPanel,
    prepareOverlaysForAR,
    
    // Componentes
    OverlayControls,
    // OverlayCounter, // Ya no se necesita - el menú tiene su propio contador
    ConfigPanel,
    DebugPanel,
    
    // Utilidades
    hasHTMLOverlays: overlayComponents.html.length > 0,
    hasR3FOverlays: overlayComponents.r3f.length > 0,
    hasAnyOverlays: selectedOverlays.length > 0
  };
};

export default AROverlayController;
