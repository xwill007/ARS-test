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
    bottom: 20,
    left: 20,
    background: 'rgba(0, 0, 0, 0.85)',
    color: 'white',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    zIndex: 4999,
    border: '2px solid #007acc',
    boxShadow: '0 4px 12px rgba(0, 122, 204, 0.3)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    animation: 'fade-in 0.3s ease-in-out',
    fontWeight: 'bold'
  };

  const badgeStyle = {
    background: activeCount > 1 ? '#007acc' : '#00aa00',
    color: 'white',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
  };

  return (
    <div style={containerStyle}>
      <span>🎮</span>
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
