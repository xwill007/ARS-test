// Traducciones para esta vista (regla de proyecto: todo texto visible sale de
// `src/locales/*.json`, nunca hardcodeado — ver skill `texto-multidioma`).
//
// Esta vista es JS plano (no monta React), así que no puede usar `useVRLanguage()` directamente.
// En su lugar: carga los mismos `locales/*.json` con el mismo `import.meta.glob` que usa
// `VRLanguageContext.jsx`, y lee el idioma actual de `localStorage['apprendevr_lang']` — la misma
// clave que ese contexto ahora persiste al cambiar de idioma (ver VRLanguageContext.jsx), para
// que el idioma elegido en la vista principal se respete acá también.
const LANG_STORAGE_KEY = 'apprendevr_lang';
const DEFAULT_LANG = 'en';

const files = import.meta.glob('../../locales/*.json', { eager: true });
const translations = {};
for (const path in files) {
  const langCode = path.match(/([\w-]+)\.json$/)[1];
  translations[langCode] = files[path].default.translation;
}

function getCurrentLang() {
  try {
    return localStorage.getItem(LANG_STORAGE_KEY) || DEFAULT_LANG;
  } catch (e) {
    return DEFAULT_LANG;
  }
}

// Misma resolución de claves anidadas y mismo fallback (devuelve la clave si no existe) que
// `VRLanguageContext.jsx`, para que el comportamiento sea idéntico entre ambas vistas.
export function t(key) {
  const lang = getCurrentLang();
  const keys = key.split('.');
  let value = translations[lang] || translations[DEFAULT_LANG];
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key;
    }
  }
  return value;
}
