import React, { useState } from 'react';

const iconButtonStyle = {
  width: 30,
  height: 30,
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(0,0,0,0.65)',
  color: 'white',
  fontSize: 16,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const dpadButtonStyle = {
  width: 30,
  height: 30,
  borderRadius: 6,
  border: 'none',
  background: '#333',
  color: 'white',
  fontSize: 16,
  cursor: 'pointer',
};

/**
 * Control genérico de ubicación/zoom: un ícono en una esquina superior de su contenedor (que
 * debe tener `position: relative`) que despliega, al hacer click, botones para acercar/alejar y
 * mover arriba/abajo/izquierda/derecha. No conoce el sistema de coordenadas del componente que lo
 * usa (2D CSS, posición 3D de Three.js, etc.): expone solo callbacks, para que cada consumidor
 * decida qué significa "mover" u "hacer zoom" en su propio espacio.
 */
const UbicacionControl = ({
  onZoomIn,
  onZoomOut,
  onMoveUp,
  onMoveDown,
  onMoveLeft,
  onMoveRight,
  label,
  icon = '📍',
  corner = 'top-right',
}) => {
  const [open, setOpen] = useState(false);
  const side = corner === 'top-left' ? 'left' : 'right';

  return (
    <div style={{ position: 'absolute', top: 6, [side]: 6, zIndex: 20 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={iconButtonStyle}
        aria-label="location-control-toggle"
      >
        {icon}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 36,
            [side]: 0,
            background: 'rgba(20,20,20,0.95)',
            borderRadius: 8,
            padding: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 16px #0008',
            whiteSpace: 'nowrap',
          }}
        >
          {label && <div style={{ color: 'white', fontSize: 12 }}>{label}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 30px)', gridTemplateRows: 'repeat(3, 30px)', gap: 4 }}>
            <div />
            <button type="button" onClick={onMoveUp} style={dpadButtonStyle}>↑</button>
            <div />
            <button type="button" onClick={onMoveLeft} style={dpadButtonStyle}>←</button>
            <div />
            <button type="button" onClick={onMoveRight} style={dpadButtonStyle}>→</button>
            <div />
            <button type="button" onClick={onMoveDown} style={dpadButtonStyle}>↓</button>
            <div />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button type="button" onClick={onZoomOut} style={dpadButtonStyle}>−</button>
            <button type="button" onClick={onZoomIn} style={dpadButtonStyle}>+</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UbicacionControl;
