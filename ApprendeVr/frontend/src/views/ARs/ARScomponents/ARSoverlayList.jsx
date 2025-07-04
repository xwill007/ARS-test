import React, { useMemo } from 'react';
import overlayRegistry from './overlays/index'; // Auto-registro de overlays

/**
 * ARSoverlayList
 * Lista de botones para seleccionar overlays (soporte para selección múltiple)
 * Ahora usa el registro automático de overlays
 */
const ARSoverlayList = ({ 
  selectedOverlay, 
  selectedOverlays, 
  setSelectedOverlay, 
  overlays, 
  inline = false,
  multiSelect = false 
}) => {
  // Obtener overlays dinámicamente del registro
  const overlayButtons = useMemo(() => {
    const allOverlays = overlayRegistry.getAll();
    return Object.entries(allOverlays).map(([key, config]) => ({
      key,
      label: config.label,
      type: config.type,
      description: config.description,
      category: config.category
    }));
  }, []);

  const handleOverlayChange = (overlayKey) => {
    console.log('Button clicked:', overlayKey);
    if (multiSelect) {
      console.log('Multi-select mode, current overlays:', selectedOverlays);
    } else {
      console.log('Single-select mode, current overlay:', selectedOverlay);
    }
    
    if (setSelectedOverlay) {
      setSelectedOverlay(overlayKey);
    }
  };

  const isSelected = (overlayKey) => {
    if (multiSelect && selectedOverlays) {
      return selectedOverlays.includes(overlayKey);
    }
    return selectedOverlay === overlayKey;
  };

  const getButtonStyle = (overlayKey) => {
    const selected = isSelected(overlayKey);
    
    if (inline) {
      return {
        padding: '8px 12px',
        fontSize: 12,
        background: selected ? '#0066cc' : '#1e90ff',
        color: 'white',
        border: selected ? '2px solid #ffffff' : 'none',
        borderRadius: 4,
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        fontWeight: selected ? 'bold' : 'normal',
        marginBottom: '4px',
        transition: 'all 0.2s ease',
        position: 'relative'
      };
    } else {
      return {
        padding: '8px 16px',
        fontSize: 14,
        background: selected ? '#1e90ff' : '#f0f0f0',
        color: selected ? 'white' : 'black',
        border: selected ? '2px solid #0066cc' : '1px solid #ccc',
        borderRadius: 6,
        cursor: 'pointer',
        fontWeight: selected ? 'bold' : 'normal',
        boxShadow: selected ? '0 2px 8px rgba(30,144,255,0.4)' : '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'all 0.2s ease',
        position: 'relative'
      };
    }
  };

  const containerStyle = inline 
    ? { display: 'flex', flexDirection: 'column', gap: 4 }
    : { 
        position: 'fixed', 
        top: 12, 
        left: '50%', 
        transform: 'translateX(-50%)', 
        zIndex: 5000, 
        display: 'flex', 
        gap: 10 
      };

  return (
    <div style={containerStyle}>
      {multiSelect && (
        <div style={{ 
          fontSize: 12, 
          color: '#666', 
          marginBottom: 8, 
          textAlign: 'center',
          fontStyle: 'italic' 
        }}>
          Haz clic para activar/desactivar overlays
        </div>
      )}
      {overlayButtons.map(({ key, label }) => (
        <button
          key={key}
          style={getButtonStyle(key)}
          onClick={() => handleOverlayChange(key)}
          onMouseOver={(e) => {
            if (!isSelected(key)) {
              e.target.style.opacity = '0.8';
            }
          }}
          onMouseOut={(e) => {
            e.target.style.opacity = '1';
          }}
        >
          {label}
          {multiSelect && isSelected(key) && (
            <span style={{ 
              position: 'absolute', 
              right: 8, 
              top: '50%', 
              transform: 'translateY(-50%)',
              fontSize: 10,
              color: '#00ff00'
            }}>
              ✓
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default ARSoverlayList;