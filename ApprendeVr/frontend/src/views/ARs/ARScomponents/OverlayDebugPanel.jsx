import React, { useState, useEffect } from 'react';
import configurableOverlayManager from './ConfigurableOverlayManager';

/**
 * OverlayDebugPanel - Panel de debug para ver configuraciones en tiempo real
 */
const OverlayDebugPanel = ({ overlayId, visible = false }) => {
  const [config, setConfig] = useState({});
  const [userSettings, setUserSettings] = useState({});

  useEffect(() => {
    if (!overlayId) return;

    const updateConfig = () => {
      const overlayConfig = configurableOverlayManager.getOverlayConfig(overlayId);
      const userConfig = configurableOverlayManager.userOverlaySettings[overlayId] || {};
      setConfig(overlayConfig);
      setUserSettings(userConfig);
    };

    // Suscribirse a cambios
    const unsubscribe = configurableOverlayManager.subscribe(overlayId, updateConfig);
    
    // Cargar configuración inicial
    updateConfig();

    return unsubscribe;
  }, [overlayId]);

  if (!visible || !overlayId) return null;

  const panelStyle = {
    position: 'fixed',
    top: '10px',
    right: '10px',
    width: '300px',
    maxHeight: '400px',
    background: 'rgba(0, 0, 0, 0.9)',
    border: '1px solid #00ff88',
    borderRadius: '4px',
    padding: '10px',
    color: '#00ff88',
    fontSize: '12px',
    fontFamily: 'monospace',
    overflow: 'auto',
    zIndex: 9999
  };

  return (
    <div style={panelStyle}>
      <h4 style={{ margin: '0 0 10px 0', color: '#00ff88' }}>
        Debug: {overlayId}
      </h4>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Config Actual:</strong>
        <pre style={{ 
          fontSize: '10px', 
          color: '#ffffff',
          margin: '5px 0',
          whiteSpace: 'pre-wrap'
        }}>
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>

      <div>
        <strong>User Settings:</strong>
        <pre style={{ 
          fontSize: '10px', 
          color: '#ffff00',
          margin: '5px 0',
          whiteSpace: 'pre-wrap'
        }}>
          {JSON.stringify(userSettings, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: '10px', textAlign: 'center' }}>
        <button
          onClick={() => {
            const newConfig = configurableOverlayManager.getOverlayConfig(overlayId);
            setConfig(newConfig);
            console.log('Debug refresh:', newConfig);
          }}
          style={{
            background: '#00ff88',
            color: 'black',
            border: 'none',
            borderRadius: '2px',
            padding: '2px 8px',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          Refresh
        </button>
      </div>
    </div>
  );
};

export default OverlayDebugPanel;
