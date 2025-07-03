import React, { useEffect, useState } from 'react';
import overlayRegistry from '../overlays/index';

/**
 * Componente de debug para verificar overlays registrados
 */
const OverlayDebugger = () => {
  const [overlays, setOverlays] = useState({});
  const [selectedOverlay, setSelectedOverlay] = useState(null);
  
  useEffect(() => {
    // Cargar overlays al montar el componente
    const allOverlays = overlayRegistry.getAll();
    setOverlays(allOverlays);
    console.log('🔍 Debug - Overlays disponibles:', Object.keys(allOverlays));
  }, []);

  const handleTestOverlay = (overlayKey) => {
    const overlay = overlayRegistry.get(overlayKey);
    setSelectedOverlay(overlay);
    console.log('🧪 Testing overlay:', overlayKey, overlay);
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: 10, 
      right: 10, 
      background: 'rgba(0,0,0,0.9)', 
      color: 'white', 
      padding: 20, 
      borderRadius: 8,
      zIndex: 9999,
      maxWidth: 350,
      maxHeight: '80vh',
      overflowY: 'auto',
      fontSize: 12
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#00ff00' }}>
        🔍 Overlay Debugger
      </h3>
      <div style={{ marginBottom: 15 }}>
        <strong style={{ color: '#ffff00' }}>
          Total: {Object.keys(overlays).length} overlays registrados
        </strong>
      </div>
      
      <div style={{ marginBottom: 15 }}>
        <h4 style={{ margin: '0 0 5px 0', color: '#00ccff' }}>Por tipo:</h4>
        <div style={{ marginLeft: 10 }}>
          <div>🟢 R3F: {Object.values(overlays).filter(o => o.type === 'r3f').length}</div>
          <div>🔴 HTML: {Object.values(overlays).filter(o => o.type === 'html').length}</div>
        </div>
      </div>
      
      <div>
        <h4 style={{ margin: '0 0 10px 0', color: '#ff9900' }}>Lista de overlays:</h4>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {Object.entries(overlays).map(([key, config]) => (
            <li key={key} style={{ 
              marginBottom: 12, 
              padding: 8, 
              background: 'rgba(255,255,255,0.1)', 
              borderRadius: 4,
              border: `2px solid ${config.type === 'r3f' ? '#00ff00' : '#ff0000'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: config.type === 'r3f' ? '#00ff00' : '#ff0000' }}>
                    {key}
                  </strong>
                  <span style={{ 
                    background: config.type === 'r3f' ? '#00ff00' : '#ff0000', 
                    color: 'black',
                    padding: '2px 6px',
                    borderRadius: 3,
                    fontSize: 8,
                    marginLeft: 6
                  }}>
                    {config.type}
                  </span>
                </div>
                <button 
                  onClick={() => handleTestOverlay(key)}
                  style={{ 
                    padding: '4px 8px', 
                    fontSize: 10, 
                    background: '#007acc',
                    color: 'white',
                    border: 'none',
                    borderRadius: 3,
                    cursor: 'pointer'
                  }}
                >
                  Test
                </button>
              </div>
              <div style={{ marginTop: 4, fontSize: 10, color: '#ccc' }}>
                {config.label}
              </div>
              <div style={{ marginTop: 2, fontSize: 9, color: '#999' }}>
                {config.description}
              </div>
              <div style={{ marginTop: 2, fontSize: 8, color: '#666' }}>
                Categoría: {config.category}
              </div>
            </li>
          ))}
        </ul>
      </div>
      
      {selectedOverlay && (
        <div style={{ 
          marginTop: 15, 
          padding: 10, 
          background: 'rgba(255,255,255,0.15)', 
          borderRadius: 4,
          border: '1px solid #ffff00'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#ffff00' }}>
            Overlay seleccionado:
          </h4>
          <div style={{ fontSize: 10 }}>
            <strong>Componente:</strong> {selectedOverlay.component?.name || 'N/A'}
          </div>
          <pre style={{ 
            fontSize: 9, 
            overflow: 'auto', 
            maxHeight: 120,
            background: 'rgba(0,0,0,0.5)',
            padding: 8,
            borderRadius: 3,
            marginTop: 5
          }}>
            {JSON.stringify(selectedOverlay, (key, value) => 
              key === 'component' ? `[Function: ${value?.name || 'Anonymous'}]` : value
            , 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default OverlayDebugger;
