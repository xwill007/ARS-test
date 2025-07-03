import React, { useState, useEffect } from 'react';
import configurableOverlayManager from './ConfigurableOverlayManager';

/**
 * OverlayConfigPanel - Panel de configuración para overlays
 * Permite ajustar posiciones y parámetros en tiempo real
 */
const OverlayConfigPanel = ({ 
  overlayId,
  isVisible = false,
  onClose
}) => {
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
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '400px',
    maxHeight: '600px',
    background: 'rgba(0, 0, 0, 0.95)',
    border: '2px solid #007acc',
    borderRadius: '8px',
    padding: '20px',
    color: 'white',
    fontSize: '14px',
    zIndex: 10000,
    overflow: 'auto'
  };

  return (
    <div style={panelStyle}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        borderBottom: '1px solid #333',
        paddingBottom: '10px'
      }}>
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
        {['positions', 'scales', 'general'].map(tab => (
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
              label="Video Secundario" 
              configKey="secondaryVideo.position" 
              defaultValue={[6, 5, 0]}
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
            <ScaleControl 
              label="Escala Video Secundario" 
              configKey="secondaryVideo.scale" 
              defaultValue={[3, 2, 1]}
            />
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
