import React from 'react';

const Select = ({ name, value, onChange, label, error, options = [] }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      {label && (
        <label htmlFor={name} style={{ color: 'white', fontSize: 13, fontWeight: 'bold' }}>
          {label}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        style={{
          padding: '8px 10px',
          borderRadius: 6,
          border: error ? '1px solid #e53935' : '1px solid #ccc',
          fontSize: 14,
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span style={{ color: '#ff8a80', fontSize: 12 }}>{error}</span>}
    </div>
  );
};

export default Select;
