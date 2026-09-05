import React, { useState } from 'react';

const Input = ({ type = 'text', name, value, onChange, placeholder, label, error }) => {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  const effectiveType = isPassword && visible ? 'text' : type;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      {label && (
        <label htmlFor={name} style={{ color: 'white', fontSize: 13, fontWeight: 'bold' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          id={name}
          name={name}
          type={effectiveType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '8px 10px',
            paddingRight: isPassword ? 32 : 10,
            borderRadius: 6,
            border: error ? '1px solid #e53935' : '1px solid #ccc',
            fontSize: 14,
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label="toggle-password-visibility"
            style={{
              position: 'absolute',
              right: 6,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 15,
              lineHeight: 1,
              padding: 2,
            }}
          >
            {visible ? '🙈' : '👁️'}
          </button>
        )}
      </div>
      {error && <span style={{ color: '#ff8a80', fontSize: 12 }}>{error}</span>}
    </div>
  );
};

export default Input;
