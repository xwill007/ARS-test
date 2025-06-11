import React, { useState, useEffect } from 'react';

const VRLanguages = ({ onLanguageChange }) => {
  const [availableLanguages, setAvailableLanguages] = useState(['en', 'es']);
  const [setLanguage] = useState('en');

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const languageFiles = import.meta.glob('./locales/*.json');
        const languages = [];

        for (const path in languageFiles) {
          const languageCode = path.replace('./locales/', '').replace('.json', '');
          languages.push(languageCode);
        }

        setAvailableLanguages(languages);
      } catch (error) {
        console.error("Error fetching languages:", error);
      }
    };

    fetchLanguages();
  }, []);

  const changeLanguage = (lng) => {
    setLanguage(lng);
    onLanguageChange(lng);
  };

  return (
    <div>
      <ul>
        {availableLanguages.map((lang) => (
          <li key={lang}>
            <button onClick={() => changeLanguage(lang)}>{lang}</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default VRLanguages;