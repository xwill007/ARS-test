import React, { useState } from 'react';

const baseStyle = {
  border: 'none',
  borderRadius: 8,
  padding: '10px 18px',
  fontWeight: 'bold',
  fontSize: 15,
  cursor: 'pointer',
  boxShadow: '0 2px 8px #0003',
};

const variantStyles = {
  primary: { background: '#1976d2', color: 'white' },
  secondary: { background: '#444', color: 'white' },
  link: {
    background: 'transparent',
    color: '#90caf9',
    textDecoration: 'underline',
    boxShadow: 'none',
    padding: 0,
    fontWeight: 'normal',
    fontSize: 13,
  },
};

// Mismo gris oscuro de hover que los VRButton 3D (ver config/theme.js, secondary.main), para que
// el feedback de "hover" sea consistente en toda la app.
const HOVER_BACKGROUND = '#4d4d4d';

const Boton = ({ label, onClick, type = 'button', disabled = false, variant = 'primary' }) => {
  const [hovered, setHovered] = useState(false);
  const variantStyle = variantStyles[variant] || variantStyles.primary;
  // El variant "link" es texto plano sin fondo: el hover gris no aplica ahí.
  const hoverStyle = hovered && !disabled && variant !== 'link' ? { background: HOVER_BACKGROUND } : {};
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...baseStyle,
        ...variantStyle,
        ...hoverStyle,
        cursor: disabled ? 'not-allowed' : baseStyle.cursor,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
};

export default Boton;
