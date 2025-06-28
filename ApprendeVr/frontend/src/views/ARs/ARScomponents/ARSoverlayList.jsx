import React from 'react';

/**
 * ARSoverlayList
 * Lista de botones para seleccionar overlays (ahora con soporte múltiple)
 */
const ARSoverlayList = ({ 
  selectedOverlays = [], // Cambiar a array
  onOverlayToggle, // Nueva función para toggle
  overlays, 
  inline = false 
}) => {
  const overlayButtons = [
    { key: 'TestR3FOverlay', label: 'Overlay Static' },
    { key: 'VRConeOverlay', label: 'Overlay HTML' },
    { key: 'VRConeR3FOverlay', label: 'Overlay R3F' }
  ];

  const handleOverlayToggle = (overlayKey) => {
    console.log('Button clicked:', overlayKey, 'Current selected:', selectedOverlays);
    if (onOverlayToggle) {
      const isCurrentlySelected = selectedOverlays.includes(overlayKey);
      onOverlayToggle(overlayKey, !isCurrentlySelected);
    }
  };

  const getButtonStyle = (overlayKey) => {
    const isSelected = selectedOverlays.includes(overlayKey); // Cambiar lógica
    
    if (inline) {
      return {
        padding: '8px 12px',
        fontSize: 12,
        background: isSelected ? '#0066cc' : '#1e90ff',
        color: 'white',
        border: isSelected ? '2px solid #ffffff' : 'none',
        borderRadius: 4,
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        fontWeight: isSelected ? 'bold' : 'normal',
        marginBottom: '4px',
        transition: 'all 0.2s ease'
      };
    } else {
      return {
        padding: '8px 16px',
        fontSize: 14,
        background: isSelected ? '#1e90ff' : '#f0f0f0',
        color: isSelected ? 'white' : 'black',
        border: isSelected ? '2px solid #0066cc' : '1px solid #ccc',
        borderRadius: 6,
        cursor: 'pointer',
        fontWeight: isSelected ? 'bold' : 'normal',
        boxShadow: isSelected ? '0 2px 8px rgba(30,144,255,0.4)' : '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'all 0.2s ease'
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
      {overlayButtons.map(({ key, label }) => (
        <button
          key={key}
          style={getButtonStyle(key)}
          onClick={() => handleOverlayToggle(key)}
          onMouseOver={(e) => {
            if (!selectedOverlays.includes(key)) {
              e.target.style.opacity = '0.8';
            }
          }}
          onMouseOut={(e) => {
            e.target.style.opacity = '1';
          }}
        >
          {label} {selectedOverlays.includes(key) ? '✓' : ''}
        </button>
      ))}
    </div>
  );
};

export default ARSoverlayList;