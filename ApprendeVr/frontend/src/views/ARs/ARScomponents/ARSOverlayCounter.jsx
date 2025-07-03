import React from 'react';

/**
 * ARSOverlayCounter
 * Muestra un contador de overlays activos
 */
const ARSOverlayCounter = ({ selectedOverlays = [] }) => {
  const activeCount = selectedOverlays.length;
  
  if (activeCount === 0) {
    return null;
  }

  const containerStyle = {
    position: 'fixed',
    bottom: 100,
    right: 20,
    background: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    zIndex: 1000,
    border: '1px solid rgba(30, 144, 255, 0.5)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    animation: 'fade-in 0.3s ease-in-out'
  };

  const badgeStyle = {
    background: activeCount > 1 ? '#1e90ff' : '#4caf50',
    color: 'white',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 'bold'
  };

  return (
    <div style={containerStyle}>
      <div style={badgeStyle}>
        {activeCount}
      </div>
      <span>
        {activeCount === 1 ? 'Overlay activo' : 'Overlays activos'}
      </span>
    </div>
  );
};

export default ARSOverlayCounter;
