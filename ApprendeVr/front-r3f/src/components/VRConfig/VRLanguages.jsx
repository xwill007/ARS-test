import React, { useState, useEffect } from 'react';

const VRLanguages = ({ onLanguageChange }) => {
  const [availableLanguages, setAvailableLanguages] = useState(['en', 'es']);
  const [currentLanguage, setCurrentLanguage] = useState('en');

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        // Corregimos el path para que apunte a la carpeta locales
        const languageFiles = import.meta.glob('../locales/*.json');
        const languages = [];

        for (const path in languageFiles) {
          // Extraemos el código de idioma del path
          const languageCode = path.match(/\/([^/]+)\.json$/)[1];
          languages.push(languageCode);
        }

        console.log('Available languages:', languages);
        setAvailableLanguages(languages);
      } catch (error) {
        console.error("Error fetching languages:", error);
      }
    };

    fetchLanguages();
  }, []);

  const changeLanguage = (lng) => {
    setCurrentLanguage(lng);
    onLanguageChange(lng);
  };

  return (
    <div style={{
      position: 'absolute',
      top: '60px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000
    }}>
      <ul style={{ 
        listStyle: 'none', 
        display: 'flex', 
        gap: '10px',
        padding: 0 
      }}>
        {availableLanguages.map((lang) => (
          <li key={lang}>
            <button 
              onClick={() => changeLanguage(lang)}
              style={{
                background: currentLanguage === lang ? '#ffffff' : '#000000',
                color: currentLanguage === lang ? '#000000' : '#ffffff',
                border: '2px solid #ffffff',
                padding: '5px 10px',
                cursor: 'pointer',
                borderRadius: '5px'
              }}
            >
              {lang.toUpperCase()}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default VRLanguages;