import React from 'react';

const Input = ({ type = 'text', name, value, onChange, placeholder, label, error }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      {label && (
        <label htmlFor={name} style={{ color: 'white', fontSize: 13, fontWeight: 'bold' }}>
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          padding: '8px 10px',
          borderRadius: 6,
          border: error ? '1px solid #e53935' : '1px solid #ccc',
          fontSize: 14,
        }}
      />
      {error && <span style={{ color: '#ff8a80', fontSize: 12 }}>{error}</span>}
    </div>
  );
};

export default Input;
