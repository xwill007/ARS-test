import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const VRLanguageContext = createContext();

export const VRLanguageProvider = ({ children, defaultLang = 'en' }) => {
  const { t, i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(defaultLang);
  const [isLoading, setIsLoading] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState(['en', 'es', 'br']);

  // Cambiar idioma en i18next cuando cambie currentLang
  useEffect(() => {
    if (currentLang !== i18n.language) {
      i18n.changeLanguage(currentLang);
    }
  }, [currentLang, i18n]);

  // Función para cambiar idioma
  const changeLanguage = (lang) => {
    setCurrentLang(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <VRLanguageContext.Provider value={{
      currentLang,
      setCurrentLang: changeLanguage,
      availableLanguages,
      t,
      isLoading
    }}>
      {children}
    </VRLanguageContext.Provider>
  );
};

export const useVRLanguage = () => useContext(VRLanguageContext);
