import React, { useState, useEffect } from 'react';
import overlayRegistry from './overlays/index'; // Auto-registro de overlays
import ARSoverlayList from './ARSoverlayList';
import ARSOverlayCounter from './ARSOverlayCounter';

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

  const prepareOverlaysForAR = () => {
    if (selectedOverlays.length === 0) return null;
    const allOverlays = [...overlayComponents.html, ...overlayComponents.r3f];
    return allOverlays.length > 0 ? allOverlays : null;
  };

  // Componentes de UI
  const OverlayControls = () => (
    !isARActive && (
      <div className="ars-controls">
        <ARSoverlayList 
          selectedOverlays={selectedOverlays}
          setSelectedOverlay={handleOverlayToggle}
          overlays={availableOverlays}
          multiSelect={true}
        />
        {selectedOverlays.length > 0 && (
          <button
            onClick={handleClearAllOverlays}
            style={{
              marginTop: '10px',
              padding: '6px 12px',
              background: '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#cc0000';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = '#ff4444';
              e.target.style.transform = 'scale(1)';
            }}
          >
            🗑️ Limpiar todo
          </button>
        )}
      </div>
    )
  );

  const OverlayCounter = () => (
    <ARSOverlayCounter selectedOverlays={selectedOverlays} />
  );

  return {
    // Estado
    selectedOverlays,
    overlayComponents,
    renderKey,
    
    // Métodos
    handleOverlayToggle,
    handleClearAllOverlays,
    prepareOverlaysForAR,
    
    // Componentes
    OverlayControls,
    OverlayCounter,
    
    // Utilidades
    hasHTMLOverlays: overlayComponents.html.length > 0,
    hasR3FOverlays: overlayComponents.r3f.length > 0,
    hasAnyOverlays: selectedOverlays.length > 0
  };
};

export default AROverlayController;
