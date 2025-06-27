import React from 'react';

/**
 * ARSoverlayList
 * Lista de botones para seleccionar overlays
 * Props:
 *  - selectedOverlay: overlay actualmente seleccionado
 *  - setSelectedOverlay: función para cambiar el overlay
 *  - overlays: objeto con los overlays disponibles
 *  - inline: si true, muestra los botones en línea (para el menú config)
 */
const ARSoverlayList = ({ 
  selectedOverlay, 
  setSelectedOverlay, 
  overlays, 
  inline = false 
}) => {
  const overlayButtons = [
    { key: 'TestR3FOverlay', label: 'Overlay Static' },
    { key: 'VRConeOverlay', label: 'Overlay HTML' },
    { key: 'VRConeR3FOverlay', label: 'Overlay R3F' }
  ];

  const buttonStyle = {
    padding: inline ? '4px 8px' : 6,
    fontSize: inline ? 12 : 14,
    background: inline ? '#1e90ff' : '#f0f0f0',
    color: inline ? 'white' : 'black',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    boxShadow: inline ? 'none' : '0 1px 3px rgba(0,0,0,0.2)',
    minWidth: inline ? 'auto' : 'max-content'
  };

  const activeButtonStyle = {
    ...buttonStyle,
    background: inline ? '#0066cc' : '#1e90ff',
    color: 'white',
    fontWeight: 'bold'
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
        gap: 8 
      };

  return (
    <div style={containerStyle}>
      {overlayButtons.map(({ key, label }) => (
        <button
          key={key}
          style={selectedOverlay === key ? activeButtonStyle : buttonStyle}
          onClick={() => setSelectedOverlay(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default ARSoverlayList;