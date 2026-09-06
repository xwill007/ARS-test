import React, { createContext, useContext, useState, useEffect } from 'react';

const VRLanguageContext = createContext();

// Clave de localStorage para persistir el idioma elegido (mismo patrón que VRThemeContext con
// 'themeMode'): sin esto, el idioma seleccionado no sobrevive a un reload ni es visible desde
// páginas que no montan este Provider, como la vista A-Frame (ver vrI18n.util.js).
const LANG_STORAGE_KEY = 'apprendevr_lang';

export const VRLanguageProvider = ({ children, defaultLang = 'en' }) => {
  const [currentLang, setCurrentLangState] = useState(
    () => window.localStorage.getItem(LANG_STORAGE_KEY) || defaultLang,
  );
  const setCurrentLang = (lang) => {
    setCurrentLangState(lang);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch (e) {
      /* localStorage no disponible: el idioma sigue funcionando solo en memoria */
    }
  };
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
