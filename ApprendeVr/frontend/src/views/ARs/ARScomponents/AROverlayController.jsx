import React, { useState, useEffect } from 'react';
import overlayRegistry from './overlays/index'; // Auto-registro de overlays
import OverlayDropdownMenu from './OverlayDropdownMenu';
import ARSOverlayCounter from './ARSOverlayCounter';
import OverlayConfigPanel from './OverlayConfigPanel';
import OverlayDebugPanel from './OverlayDebugPanel';
import arsConfigManager from '../../../config/ARSConfigManager';

/**
 * AROverlayController - Controlador completo de overlays
 * Versión con persistencia automática que usa el sistema de configuración ARS
 * - Carga automáticamente overlays al iniciar desde configuración persistente
 * - Guarda automáticamente al hacer cambios (toggle de checkboxes)
 * - No requiere botón "Cargar" - todo es automático
 */
const AROverlayController = ({ 
  isARActive = false, 
  initialOverlays = ['vrConeOverlay'] // Fallback si no hay configuración guardada
}) => {
  // Cargar overlays desde la configuración persistente
  const [selectedOverlays, setSelectedOverlays] = useState(() => {
    const savedOverlays = arsConfigManager.loadSelectedOverlays();
    console.log('🔄 Carga automática de overlays desde configuración:', savedOverlays);
    return savedOverlays || initialOverlays;
  });

  // Escuchar cambios en la configuración de overlays
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'arsconfig-persistent' && e.newValue) {
        try {
          const config = JSON.parse(e.newValue);
          if (config.userConfig?.selectedOverlays) {
            console.log('🔄 AROverlayController: Actualizando overlays desde configuración:', config.userConfig.selectedOverlays);
            setSelectedOverlays(config.userConfig.selectedOverlays);
          }
        } catch (error) {
          console.error('❌ Error procesando cambio de configuración en AROverlayController:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // También escuchar cambios directos en el objeto arsConfigManager
  useEffect(() => {
    const checkConfigChanges = () => {
      const currentOverlays = arsConfigManager.loadSelectedOverlays();
      if (JSON.stringify(currentOverlays) !== JSON.stringify(selectedOverlays)) {
        console.log('🔄 AROverlayController: Detectado cambio directo en configuración:', currentOverlays);
        setSelectedOverlays(currentOverlays);
      }
    };

    const interval = setInterval(checkConfigChanges, 1000);
    return () => clearInterval(interval);
  }, [selectedOverlays]);
  
  const [renderKey, setRenderKey] = useState(0);
  const [configPanelOverlay, setConfigPanelOverlay] = useState(null);
  const [isOverlayMenuOpen, setIsOverlayMenuOpen] = useState(false);

  // Obtener overlays disponibles del registro
  const availableOverlays = overlayRegistry.getAll();

  // Función para crear los overlays dinámicamente usando el registro con keys optimizadas
  const createOverlays = (overlayKeys) => {
    const overlayComponents = { html: [], r3f: [] };

    overlayKeys.forEach((overlayKey, index) => {
      const overlayConfig = overlayRegistry.get(overlayKey);
      
      if (!overlayConfig) {
        console.warn(`Overlay "${overlayKey}" not found in registry`);
        return;
      }
      
      // Usar key estable basada en el overlayKey, no en el renderKey
      const stableKey = `${overlayKey}-component`;
      const Component = overlayConfig.component;
      const props = {
        key: stableKey,
        // Solo pasar renderKey para overlays que realmente lo necesiten para reconfiguracion
        ...(overlayConfig.needsRenderKey ? { renderKey } : {}),
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

  // Actualizar renderKey solo cuando sea necesario y guardar en configuración
  useEffect(() => {
    // Evitar loops infinitos en la carga inicial
    if (renderKey === 0) {
      console.log('🔄 Carga inicial de overlays:', selectedOverlays);
      return;
    }
    
    console.log('AROverlayController - Overlays changed to:', selectedOverlays);
    
    // Guardar overlays seleccionados automáticamente en la configuración
    const saveOverlays = async () => {
      const success = await arsConfigManager.updateOverlaySelection(selectedOverlays);
      if (success) {
        console.log('✅ Overlays guardados automáticamente:', selectedOverlays);
      } else {
        console.warn('⚠️ Error guardando overlays automáticamente');
      }
    };
    
    // Guardar automáticamente en cada cambio
    saveOverlays();
    
    // No incrementar renderKey para cambios simples de overlay
    // Solo para casos específicos donde sea realmente necesario
  }, [selectedOverlays, renderKey]);

  // Calcular componentes de overlay con keys estables (no dependientes del renderKey)
  const overlayComponents = createOverlays(selectedOverlays);

  // Métodos de control optimizados para fluidez
  const handleOverlayToggle = (overlayKey) => {
    console.log('🔄 Toggle overlay:', overlayKey, '- Guardado automático y transición fluida');
    setSelectedOverlays(prev => {
      const newOverlays = prev.includes(overlayKey)
        ? prev.filter(overlay => overlay !== overlayKey)
        : [...prev, overlayKey];
      
      // Incrementar renderKey solo si cambió el número de overlays activos
      // Esto permite transiciones más suaves
      if (prev.length !== newOverlays.length) {
        setRenderKey(current => current + 1);
      }
      
      return newOverlays;
    });
  };

  const handleClearAllOverlays = () => {
    console.log('🧹 Clearing all overlays - Smooth transition');
    setSelectedOverlays([]);
    // Forzar actualización visual al limpiar todo
    setRenderKey(prev => prev + 1);
  };

  const handleResetToDefaults = () => {
    console.log('🔄 Resetting overlays to defaults - Smooth transition');
    const defaultOverlays = arsConfigManager.config.userConfig.selectedOverlays || ['vrConeOverlay'];
    setSelectedOverlays(defaultOverlays);
    // Forzar actualización visual al resetear
    setRenderKey(prev => prev + 1);
  };

  const handleConfigureOverlay = (overlayKey) => {
    console.log('Configuring overlay:', overlayKey);
    setConfigPanelOverlay(overlayKey);
  };

  const handleCloseConfigPanel = () => {
    setConfigPanelOverlay(null);
    // Forzar re-render de overlays para mostrar cambios de configuración
    setRenderKey(prev => prev + 1);
  };

  // Función para forzar re-render cuando sea realmente necesario
  const forceOverlayRefresh = () => {
    console.log('🔄 Forzando refresh de overlays...');
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
          onResetToDefaults={handleResetToDefaults}
          onConfigureOverlay={handleConfigureOverlay}
          multiSelect={true}
          isOpen={isOverlayMenuOpen}
          onToggleOpen={() => setIsOverlayMenuOpen(prev => !prev)}
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
    handleResetToDefaults,
    handleConfigureOverlay,
    handleCloseConfigPanel,
    forceOverlayRefresh,
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
