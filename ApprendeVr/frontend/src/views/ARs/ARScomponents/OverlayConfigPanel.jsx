import React, { useState, useEffect } from 'react';
import configurableOverlayManager from './ConfigurableOverlayManager';
import ConeWordsEditor from './ConeWordsEditor.jsx';

/**
 * OverlayConfigPanel - Panel de configuración para overlays
 * Permite ajustar posiciones y parámetros en tiempo real
 */
const OverlayConfigPanel = ({ overlayId, isVisible = false, onClose }) => {
  // Estado para posición y tamaño del panel
  const [panelPosition, setPanelPosition] = useState({ x: null, y: null });
  const [panelSize, setPanelSize] = useState({ width: 400, height: 600 });
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizing, setResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 400, height: 600 });

  // Guardar y restaurar posición y tamaño del panel
  useEffect(() => {
    if (isVisible) {
      // Restaurar posición y tamaño guardados
      const savedConfig = configurableOverlayManager.getOverlayConfig(overlayId);
      const savedPos = savedConfig?.panelPosition;
      const savedSize = savedConfig?.panelSize;
      if (savedPos && typeof savedPos.x === 'number' && typeof savedPos.y === 'number') {
        setPanelPosition(savedPos);
      }
      if (savedSize && typeof savedSize.width === 'number' && typeof savedSize.height === 'number') {
        setPanelSize(savedSize);
      }
    }
  }, [isVisible, overlayId]);

  useEffect(() => {
    // Guardar la posición cada vez que se mueve
    if (panelPosition.x !== null && panelPosition.y !== null && overlayId) {
      const overlayConfig = configurableOverlayManager.getOverlayConfig(overlayId) || {};
      overlayConfig.panelPosition = { x: panelPosition.x, y: panelPosition.y };
      configurableOverlayManager.updateOverlayConfig(overlayId, overlayConfig);
    }
  }, [panelPosition, overlayId]);

  useEffect(() => {
    // Guardar el tamaño cada vez que se cambia
    if (panelSize.width && panelSize.height && overlayId) {
      const overlayConfig = configurableOverlayManager.getOverlayConfig(overlayId) || {};
      overlayConfig.panelSize = { width: panelSize.width, height: panelSize.height };
      configurableOverlayManager.updateOverlayConfig(overlayId, overlayConfig);
    }
  }, [panelSize, overlayId]);
  // Redimensionar con mouse
  const handleResizeMouseDown = (e) => {
    setResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: panelSize.width,
      height: panelSize.height
    });
    e.preventDefault();
    e.stopPropagation();
  };

  const handleResizeMouseMove = (e) => {
    if (!resizing) return;
    const dx = e.clientX - resizeStart.x;
    const dy = e.clientY - resizeStart.y;
    setPanelSize({
      width: Math.max(300, resizeStart.width + dx),
      height: Math.max(300, resizeStart.height + dy)
    });
  };

  const handleResizeMouseUp = () => {
    setResizing(false);
  };

  // Redimensionar con touch
  const handleResizeTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    setResizing(true);
    setResizeStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      width: panelSize.width,
      height: panelSize.height
    });
    e.preventDefault();
    e.stopPropagation();
  };

  const handleResizeTouchMove = (e) => {
    if (!resizing || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - resizeStart.x;
    const dy = e.touches[0].clientY - resizeStart.y;
    setPanelSize({
      width: Math.max(300, resizeStart.width + dx),
      height: Math.max(300, resizeStart.height + dy)
    });
  };

  const handleResizeTouchEnd = () => {
    setResizing(false);
  };

  // Soporte para touch en móvil
  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    setDragging(true);
    const panel = document.getElementById('overlay-config-panel');
    const rect = panel.getBoundingClientRect();
    setDragOffset({
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    });
    e.preventDefault();
  };

  const handleTouchMove = (e) => {
    if (!dragging || e.touches.length !== 1) return;
    setPanelPosition({
      x: e.touches[0].clientX - dragOffset.x,
      y: e.touches[0].clientY - dragOffset.y
    });
  };

  const handleTouchEnd = () => {
    setDragging(false);
  };

  // Detecta si el panel está siendo arrastrado
  const handleMouseDown = (e) => {
    setDragging(true);
    const panel = document.getElementById('overlay-config-panel');
    const rect = panel.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPanelPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    }
    if (resizing) {
      window.addEventListener('mousemove', handleResizeMouseMove);
      window.addEventListener('mouseup', handleResizeMouseUp);
      window.addEventListener('touchmove', handleResizeTouchMove);
      window.addEventListener('touchend', handleResizeTouchEnd);
    } else {
      window.removeEventListener('mousemove', handleResizeMouseMove);
      window.removeEventListener('mouseup', handleResizeMouseUp);
      window.removeEventListener('touchmove', handleResizeTouchMove);
      window.removeEventListener('touchend', handleResizeTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('mousemove', handleResizeMouseMove);
      window.removeEventListener('mouseup', handleResizeMouseUp);
      window.removeEventListener('touchmove', handleResizeTouchMove);
      window.removeEventListener('touchend', handleResizeTouchEnd);
    };
  }, [dragging, resizing]);
  const [config, setConfig] = useState({});
  const [activeTab, setActiveTab] = useState('positions');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (overlayId) {
      const overlayConfig = configurableOverlayManager.getOverlayConfig(overlayId);
      setConfig(overlayConfig);
    }
  }, [overlayId]);

  const updateConfig = (key, value) => {
    const newConfig = { ...config };
    
    // Navegación profunda para actualizar configuraciones anidadas
    if (key.includes('.')) {
      const keys = key.split('.');
      let current = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
    } else {
      newConfig[key] = value;
    }
    
    setConfig(newConfig);
    setHasChanges(true);
    
    // Guardar inmediatamente para actualización en tiempo real
    configurableOverlayManager.updateOverlayConfig(overlayId, newConfig);
    console.log('Configuración actualizada inmediatamente:', key, value);
  };

  const saveConfig = () => {
    configurableOverlayManager.updateOverlayConfig(overlayId, config);
    setHasChanges(false);
    console.log('Configuración guardada:', config);
  };

  const resetConfig = () => {
    const resetConfig = configurableOverlayManager.resetOverlayConfig(overlayId);
    setConfig(resetConfig);
    setHasChanges(false);
  };

  const exportConfig = () => {
    const exportData = configurableOverlayManager.exportUserSettings();
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `overlay-config-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const PositionControl = ({ label, configKey, defaultValue = [0, 0, 0] }) => {
    const getValue = () => {
      const keys = configKey.split('.');
      let current = config;
      
      for (const key of keys) {
        if (current && current[key] !== undefined) {
          current = current[key];
        } else {
          return defaultValue;
        }
      }
      
      return Array.isArray(current) ? current : defaultValue;
    };

    const value = getValue();

    return (
      <div style={{ marginBottom: '15px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '5px', 
          fontWeight: 'bold',
          color: '#00ff88'
        }}>
          {label}
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          {['X', 'Y', 'Z'].map((axis, index) => (
            <div key={axis} style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', color: '#ccc' }}>{axis}</label>
              <input
                type="number"
                step="0.1"
                value={value[index] || 0}
                onChange={(e) => {
                  const newValue = [...value];
                  newValue[index] = parseFloat(e.target.value) || 0;
                  updateConfig(configKey, newValue);
                }}
                style={{
                  width: '100%',
                  padding: '5px',
                  background: '#333',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '12px'
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const ScaleControl = ({ label, configKey, defaultValue = [1, 1, 1] }) => {
    const getValue = () => {
      const keys = configKey.split('.');
      let current = config;
      
      for (const key of keys) {
        if (current && current[key] !== undefined) {
          current = current[key];
        } else {
          return defaultValue;
        }
      }
      
      return Array.isArray(current) ? current : defaultValue;
    };

    const value = getValue();

    return (
      <div style={{ marginBottom: '15px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '5px', 
          fontWeight: 'bold',
          color: '#ff8800'
        }}>
          {label}
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          {['W', 'H', 'D'].map((axis, index) => (
            <div key={axis} style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', color: '#ccc' }}>{axis}</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={value[index] || 1}
                onChange={(e) => {
                  const newValue = [...value];
                  newValue[index] = parseFloat(e.target.value) || 1;
                  updateConfig(configKey, newValue);
                }}
                style={{
                  width: '100%',
                  padding: '5px',
                  background: '#333',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '12px'
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!isVisible) return null;

  const panelStyle = {
    position: 'fixed',
    top: panelPosition.y !== null ? panelPosition.y : '50%',
    left: panelPosition.x !== null ? panelPosition.x : '50%',
    transform: panelPosition.x !== null && panelPosition.y !== null ? 'none' : 'translate(-50%, -50%)',
    width: panelSize.width + 'px',
    maxHeight: panelSize.height + 'px',
    minWidth: '300px',
    minHeight: '300px',
    background: 'rgba(0, 0, 0, 0.95)',
    border: '2px solid #007acc',
    borderRadius: '8px',
    padding: '20px',
    color: 'white',
    fontSize: '14px',
    zIndex: 10000,
    overflow: 'auto',
    boxShadow: dragging ? '0 0 16px #007acc' : undefined,
    transition: resizing ? 'none' : 'width 0.1s, height 0.1s',
  };
  return (
    <div id="overlay-config-panel" style={panelStyle}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #333',
          paddingBottom: '10px',
          cursor: 'move',
          userSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <h3 style={{ margin: 0, color: '#00ff88' }}>
          Configurar Overlay: {overlayId}
        </h3>
        <button
          onClick={onClose}
          style={{
            background: '#ff4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '5px 10px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {['positions', 'scales', 'videos', 'general', 'palabras'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              background: activeTab === tab ? '#007acc' : '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ marginBottom: '20px' }}>
        {activeTab === 'positions' && (
          <div>
            <h4 style={{ color: '#00ff88', marginTop: 0 }}>Posiciones</h4>
            <PositionControl 
              label="Video Principal" 
              configKey="mainVideo.position" 
              defaultValue={[0, 5, 0]}
            />
            <PositionControl 
              label="Marcador Central" 
              configKey="centerMarker.position" 
              defaultValue={[0, 0, 0]}
            />
          </div>
        )}

        {activeTab === 'scales' && (
          <div>
            <h4 style={{ color: '#ff8800', marginTop: 0 }}>Escalas</h4>
            <ScaleControl 
              label="Escala Video Principal" 
              configKey="mainVideo.scale" 
              defaultValue={[5, 4, 1]}
            />
          </div>
        )}

        {activeTab === 'videos' && (
          <div>
            {/* ...existing code... */}
          </div>
        )}

        {activeTab === 'general' && (
          <div>
            {/* ...existing code... */}
          </div>
        )}

        {activeTab === 'palabras' && (
          <div>
            <h4 style={{ color: '#00e0ff', marginTop: 0 }}>Palabras del Cono</h4>
            {/* Editor de palabras del cono */}
            <ConeWordsEditor />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button
          onClick={resetConfig}
          style={{
            padding: '8px 16px',
            background: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Resetear
        </button>
        
        <button
          onClick={() => {
            configurableOverlayManager.forceReloadConfig();
            const newConfig = configurableOverlayManager.getOverlayConfig(overlayId);
            setConfig(newConfig);
            setHasChanges(false);
          }}
          style={{
            padding: '8px 16px',
            background: '#ff8800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Force Reload
        </button>
        
        <button
          onClick={exportConfig}
          style={{
            padding: '8px 16px',
            background: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Exportar
        </button>
        <button
          onClick={saveConfig}
          disabled={!hasChanges}
          style={{
            padding: '8px 16px',
            background: hasChanges ? '#00aa00' : '#333',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: hasChanges ? 'pointer' : 'not-allowed'
          }}
        >
          {hasChanges ? 'Guardar' : 'Guardado'}
        </button>
      </div>

      {/* Triángulo de reescalado funcional */}
      <div
        style={{
          position: 'absolute',
          right: '8px',
          bottom: '8px',
          width: '24px',
          height: '24px',
          zIndex: 10001,
          cursor: 'nwse-resize',
          touchAction: 'none',
        }}
        onMouseDown={handleResizeMouseDown}
        onTouchStart={handleResizeTouchStart}
      >
        <svg width="24" height="24" viewBox="0 0 24 24">
          <polygon points="0,24 24,24 24,0" fill="#007acc" opacity="0.7" />
          <polyline points="6,24 24,24 24,6" stroke="#fff" strokeWidth="2" fill="none" />
        </svg>
      </div>
    </div>
  );
}

export default OverlayConfigPanel;
