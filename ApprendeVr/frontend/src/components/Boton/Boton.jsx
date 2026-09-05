import React from 'react';

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

const Boton = ({ label, onClick, type = 'button', disabled = false, variant = 'primary' }) => {
  const variantStyle = variantStyles[variant] || variantStyles.primary;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...baseStyle,
        ...variantStyle,
        cursor: disabled ? 'not-allowed' : baseStyle.cursor,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
};

export default Boton;
