import React from 'react';

const Formulario = ({ onSubmit, children, title }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(e);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        background: 'rgba(20,20,20,0.85)',
        padding: 24,
        borderRadius: 12,
        boxShadow: '0 4px 24px #0006',
        minWidth: 280,
      }}
    >
      {title && <h2 style={{ color: 'white', margin: 0, fontSize: 20, textAlign: 'center' }}>{title}</h2>}
      {children}
    </form>
  );
};

export default Formulario;
