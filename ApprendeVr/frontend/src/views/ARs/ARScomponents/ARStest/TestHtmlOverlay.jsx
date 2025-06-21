import React from 'react';

const TestHtmlOverlay = () => (
  <div style={{
    position: 'absolute',
    top: 40,
    left: 40,
    width: 80,
    height: 80,
    background: 'rgba(255,0,0,0.4)',
    borderRadius: 12,
    color: '#fff',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    pointerEvents: 'none',
  }}>
    A-frame
  </div>
);

export default TestHtmlOverlay;
