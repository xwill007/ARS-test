import React, { createContext, useContext, useState, useEffect } from 'react';

const VRLanguageContext = createContext();

export const VRLanguageProvider = ({ children, defaultLang = 'en' }) => {
  const [currentLang, setCurrentLang] = useState(defaultLang);
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [availableLanguages, setAvailableLanguages] = useState([]);

  // Cargar traducciones y lista de idiomas
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        const files = import.meta.glob('../../locales/*.json', { eager: true });
        const langs = [];
        const loadedTranslations = {};
        for (const path in files) {
          const langCode = path.match(/([\w-]+)\.json$/)[1];
          langs.push(langCode);
          loadedTranslations[langCode] = files[path].default.translation;
        }
        setAvailableLanguages(langs);
        setTranslations(loadedTranslations);
      } catch (e) {
        console.error('Error loading languages:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadLanguages();
  }, []);

  // Función de traducción mejorada para claves anidadas
  const t = (key) => {
    const keys = key.split('.');
    let value = translations[currentLang];
    for (let k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Si no existe la clave, retorna la key
      }
    }
    return value;
  };

  return (
    <VRLanguageContext.Provider value={{
      currentLang,
      setCurrentLang,
      availableLanguages,
      t,
      isLoading
    }}>
      {children}
    </VRLanguageContext.Provider>
  );
};

export const useVRLanguage = () => useContext(VRLanguageContext);
