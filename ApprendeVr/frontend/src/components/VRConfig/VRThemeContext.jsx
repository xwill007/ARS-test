import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import * as themes from '../../config/theme';

// Obtiene la lista de keys de themes exportados
const THEME_KEYS = Object.keys(themes).filter(key => key.startsWith('theme'));
const DEFAULT_THEME = THEME_KEYS[0];
const showLogs = false;

const VRThemeContext = createContext(themes[DEFAULT_THEME]);

export function VRThemeProvider({ children }) {
  // Lee el nombre del theme desde localStorage o usa el primero
  const [themeName, setThemeName] = useState(() => {
    const stored = window.localStorage.getItem('themeMode') || DEFAULT_THEME;
    if (showLogs) console.log('[Theme] Inicializando themeName:', stored);
    return stored;
  });
  const theme = useMemo(() => {
    // Si el theme exportado es una función, ejecútala para obtener el objeto actual
    const themeExport = themes[themeName];
    const selectedTheme = typeof themeExport === 'function' ? themeExport() : themeExport;
    if (showLogs) {
      console.log('[Theme] useMemo themeName:', themeName, 'selectedTheme:', selectedTheme);
      if (!selectedTheme) {
        console.warn('[Theme] WARNING: themeName', themeName, 'no existe, usando DEFAULT_THEME:', DEFAULT_THEME);
      }
    }
    return selectedTheme || (typeof themes[DEFAULT_THEME] === 'function' ? themes[DEFAULT_THEME]() : themes[DEFAULT_THEME]);
  }, [themeName]);

  // Escucha cambios en localStorage (por si el usuario cambia el theme desde otro tab)
  useEffect(() => {
    const onStorage = () => {
      const stored = window.localStorage.getItem('themeMode') || DEFAULT_THEME;
      if (showLogs) console.log('[Theme] onStorage event, new themeName:', stored);
      setThemeName(stored);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Actualiza el themeName también al cambiar el select (sin recargar)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'themeMode') {
        if (showLogs) console.log('[Theme] handler event, newValue:', e.newValue);
        setThemeName(e.newValue || DEFAULT_THEME);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Permite cambiar el theme desde el menú sin recargar
  const setThemeAndPersist = (name) => {
    if (showLogs) console.log('[Theme] setThemeAndPersist:', name);
    setThemeName(name);
    window.localStorage.setItem('themeMode', name);
    // Aplica la clase global al body
    if (themes.applyThemeClass) themes.applyThemeClass(name);
  };

  // Aplica la clase global al body al montar y cuando cambia el theme
  useEffect(() => {
    if (themes.applyThemeClass) themes.applyThemeClass(themeName);
  }, [themeName]);

  // Expone la lista de themes y el setter para usarlos en el menú
  return (
    <VRThemeContext.Provider value={{ theme, themeName, setThemeName: setThemeAndPersist, themeList: THEME_KEYS }}>
      {children}
    </VRThemeContext.Provider>
  );
}

export function useVRTheme() {
  return useContext(VRThemeContext);
}
