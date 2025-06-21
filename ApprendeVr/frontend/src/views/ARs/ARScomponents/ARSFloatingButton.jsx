import React from 'react';

/**
 * ARSFloatingButton
 * Botón flotante para activar la vista ARS, con ícono de gafas VR.
 * Props:
 *  - onClick: handler de click
 *  - visible: si se muestra o no
 *  - bottom, right, top, left: coordenadas absolutas (opcional)
 *  - scale: escala del botón (1=default)
 */
const ARSFloatingButton = ({
  onClick,
  visible = true,
  bottom = 32,
  right = 32,
  top,
  left,
  scale = 1,
}) => {
  if (!visible) return null;
  const size = 72 * scale;
  const iconSize = 44 * scale;
  return (
    <button
      style={{
        position: 'fixed',
        bottom: typeof bottom === 'number' ? bottom : undefined,
        right: typeof right === 'number' ? right : undefined,
        top: typeof top === 'number' ? top : undefined,
        left: typeof left === 'number' ? left : undefined,
        zIndex: 4000,
        background: 'rgba(30,30,30,0.92)',
        border: 'none',
        borderRadius: '50%',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px #000a',
        cursor: 'pointer',
        transition: 'background 0.2s',
      }}
      onClick={onClick}
      aria-label="Activar modo ARS"
    >
      <img
        src="/images/vr-glasses-512.png"
        alt="ARS"
        style={{ width: iconSize, height: iconSize }}
      />
    </button>
  );
};

export default ARSFloatingButton;
