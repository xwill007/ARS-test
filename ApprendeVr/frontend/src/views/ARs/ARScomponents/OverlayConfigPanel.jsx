import React, { useState, useEffect } from 'react';
import configurableOverlayManager from './ConfigurableOverlayManager';

/**
 * OverlayConfigPanel - Panel de configuración para overlays
 * Permite ajustar posiciones y parámetros en tiempo real
 */
const OverlayConfigPanel = ({ overlayId, isVisible = false, onClose }) => {
  // Estado para posición del panel
  const [panelPosition, setPanelPosition] = useState({ x: null, y: null });
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Guardar y restaurar posición del panel
  useEffect(() => {
    if (isVisible) {
      // Restaurar posición guardada
      const saved = configurableOverlayManager.getOverlayConfig(overlayId)?.panelPosition;
      if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
        setPanelPosition(saved);
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
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [dragging]);
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
    width: '400px',
    maxHeight: '600px',
    background: 'rgba(0, 0, 0, 0.95)',
    border: '2px solid #007acc',
    borderRadius: '8px',
    padding: '20px',
    color: 'white',
    fontSize: '14px',
    zIndex: 10000,
    overflow: 'auto',
    boxShadow: dragging ? '0 0 16px #007acc' : undefined
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
        {['positions', 'scales', 'videos', 'general'].map(tab => (
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
            <h4 style={{ color: '#ff0000', marginTop: 0 }}>Configuración de Videos</h4>
            
            {/* URL del video principal */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontWeight: 'bold',
                color: '#ff0000'
              }}>
                URL del Video Principal
              </label>
              <input
                type="text"
                value={config.mainVideo?.videoSrc || ''}
                onChange={(e) => updateConfig('mainVideo.videoSrc', e.target.value)}
                placeholder="Ej: /videos/sample.mp4 o https://youtube.com/watch?v=..."
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #666',
                  background: '#444',
                  color: 'white'
                }}
              />
              <small style={{ color: '#aaa', fontSize: '12px' }}>
                Soporta archivos locales y URLs de YouTube
              </small>
            </div>

            {/* Calidad del video principal */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontWeight: 'bold',
                color: '#ff0000'
              }}>
                Calidad del Video Principal
              </label>
              <select
                value={config.mainVideo?.quality || '720'}
                onChange={(e) => updateConfig('mainVideo.quality', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #666',
                  background: '#444',
                  color: 'white'
                }}
              >
                <option value="default">Automática</option>
                <option value="480">480p</option>
                <option value="720">720p</option>
                <option value="1080">1080p</option>
              </select>
            </div>

            {/* Opciones de fondo para videos */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 'bold',
                color: '#ff0000'
              }}>
                <input
                  type="checkbox"
                  checked={config.mainVideo?.showBackground || false}
                  onChange={(e) => updateConfig('mainVideo.showBackground', e.target.checked)}
                  style={{ accentColor: '#ff0000' }}
                />
                Mostrar fondo del video principal
              </label>
            </div>

            {/* Separador para Video Local A-Frame */}
            <hr style={{ border: '2px solid #00ffff', margin: '30px 0' }} />

            {/* Configuración de Video Local A-Frame */}
            <div style={{ marginBottom: '20px' }}>
              <h5 style={{ color: '#00ffff', marginBottom: '15px' }}>📹 Video Local A-Frame</h5>
              
              {/* URL del video local */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '5px', 
                  fontWeight: 'bold',
                  color: '#00ffff'
                }}>
                  Ruta del Video Local
                </label>
                <input
                  type="text"
                  value={config.vrLocalVideo?.videoSrc || '/videos/gangstas.mp4'}
                  onChange={(e) => updateConfig('vrLocalVideo.videoSrc', e.target.value)}
                  placeholder="/videos/gangstas.mp4"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #00ffff',
                    background: '#003333',
                    color: 'white'
                  }}
                />
                <small style={{ color: '#aaa', fontSize: '12px' }}>
                  Ruta del archivo de video local (relativa a /public)
                </small>
              </div>

              {/* Dimensiones del video */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '5px', 
                    fontWeight: 'bold',
                    color: '#00ffff'
                  }}>
                    Ancho
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={config.vrLocalVideo?.width || 8}
                    onChange={(e) => updateConfig('vrLocalVideo.width', parseFloat(e.target.value) || 8)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #00ffff',
                      background: '#003333',
                      color: 'white'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '5px', 
                    fontWeight: 'bold',
                    color: '#00ffff'
                  }}>
                    Alto
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={config.vrLocalVideo?.height || 4.5}
                    onChange={(e) => updateConfig('vrLocalVideo.height', parseFloat(e.target.value) || 4.5)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #00ffff',
                      background: '#003333',
                      color: 'white'
                    }}
                  />
                </div>
              </div>

              {/* Opciones del video local */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 'bold',
                  color: '#00ffff',
                  marginBottom: '8px'
                }}>
                  <input
                    type="checkbox"
                    checked={config.vrLocalVideo?.autoplay || false}
                    onChange={(e) => updateConfig('vrLocalVideo.autoplay', e.target.checked)}
                    style={{ accentColor: '#00ffff' }}
                  />
                  Reproducción automática
                </label>
                
                <label style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 'bold',
                  color: '#00ffff',
                  marginBottom: '8px'
                }}>
                  <input
                    type="checkbox"
                    checked={config.vrLocalVideo?.doubleSided || true}
                    onChange={(e) => updateConfig('vrLocalVideo.doubleSided', e.target.checked)}
                    style={{ accentColor: '#00ffff' }}
                  />
                  Video de doble cara
                </label>

                <label style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 'bold',
                  color: '#00ffff'
                }}>
                  <input
                    type="checkbox"
                    checked={config.vrLocalVideo?.invertBackSide || true}
                    onChange={(e) => updateConfig('vrLocalVideo.invertBackSide', e.target.checked)}
                    style={{ accentColor: '#00ffff' }}
                  />
                  Invertir lado posterior
                </label>
                
                <label style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 'bold',
                  color: '#00ffff',
                  marginTop: '8px'
                }}>
                  <input
                    type="checkbox"
                    checked={config.vrLocalVideo?.showMarker || true}
                    onChange={(e) => updateConfig('vrLocalVideo.showMarker', e.target.checked)}
                    style={{ accentColor: '#00ffff' }}
                  />
                  Mostrar marcador de referencia
                </label>
              </div>

              {/* Botones de prueba para video local */}
              <div style={{ marginTop: '15px' }}>
                <h6 style={{ color: '#00ffff', marginBottom: '8px' }}>Videos de Prueba</h6>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    onClick={() => {
                      updateConfig('vrLocalVideo.videoSrc', '/videos/gangstas.mp4');
                    }}
                    style={{
                      padding: '6px 12px',
                      background: '#006666',
                      color: 'white',
                      border: '1px solid #00ffff',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    📁 gangstas.mp4 (Defecto)
                  </button>
                  <button
                    onClick={() => {
                      updateConfig('vrLocalVideo.videoSrc', '/videos/sample.mp4');
                    }}
                    style={{
                      padding: '6px 12px',
                      background: '#006666',
                      color: 'white',
                      border: '1px solid #00ffff',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    📁 sample.mp4
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'general' && (
          <div>
            <h4 style={{ color: '#ff88ff', marginTop: 0 }}>Configuración General</h4>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontWeight: 'bold',
                color: '#ff88ff'
              }}>
                Radio Base de Etiquetas
              </label>
              <input
                type="number"
                step="0.5"
                value={config.labels?.radiusBase || 8}
                onChange={(e) => updateConfig('labels.radiusBase', parseFloat(e.target.value) || 8)}
                style={{
                  width: '100%',
                  padding: '5px',
                  background: '#333',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  color: 'white'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontWeight: 'bold',
                color: '#ff88ff'
              }}>
                Altura de Etiquetas
              </label>
              <input
                type="number"
                step="0.5"
                value={config.labels?.height || 10}
                onChange={(e) => updateConfig('labels.height', parseFloat(e.target.value) || 10)}
                style={{
                  width: '100%',
                  padding: '5px',
                  background: '#333',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  color: 'white'
                }}
              />
            </div>

            {/* Opciones de fondo para videos */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 'bold',
                color: '#ff88ff'
              }}>
                <input
                  type="checkbox"
                  checked={config.centerMarker?.visible || false}
                  onChange={(e) => updateConfig('centerMarker.visible', e.target.checked)}
                  style={{ accentColor: '#ff88ff' }}
                />
                Mostrar marcador central
              </label>
            </div>
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
    </div>
  );
};

export default OverlayConfigPanel;
