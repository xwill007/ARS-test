import React from 'react';
import { useVRLanguage } from './VRLanguageContext';

const VRLanguages = () => {
  const { availableLanguages, currentLang, setCurrentLang } = useVRLanguage();

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <select
        value={currentLang}
        onChange={e => setCurrentLang(e.target.value)}
        style={{
          background: '#000',
          color: '#fff',
          border: '2px solid #fff',
          borderRadius: 5,
          padding: '6px 16px',
          fontSize: 16,
          minWidth: 100,
          textAlign: 'center',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        {availableLanguages.map((lang) => (
          <option key={lang} value={lang} style={{ color: '#000', background: '#fff' }}>
            {lang.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
};

export default VRLanguages;