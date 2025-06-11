// filepath: src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

let languageChangedCallback;

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .use(LanguageDetector)
  .use(HttpApi)
  .init({
    fallbackLng: 'en', // default language
    detection: {
      order: ['cookie', 'localStorage', 'htmlTag', 'path', 'subdomain'],
      caches: ['cookie']
    },
    backend: {
      loadPath: '/locales/{{lng}}.json', // Especifica la ruta para cargar los archivos de traducción
      // Agregar función de carga para verificar si los archivos se cargan correctamente
      ajax: (options) => {
        const { url, success, error } = options;
        console.log(`i18next: Attempting to load translation file from ${url}`);
        fetch(url)
          .then(response => {
            console.log(`i18next: Response status for ${url}: ${response.status}`);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            response.text().then(text => { // Log the raw response text
              console.log(`i18next: Raw response from ${url}:`, text);
              try {
                const result = JSON.parse(text); // Then, try to parse it
                console.log(`i18next: Translation file loaded successfully from ${url}`, result);
                success(result);
              } catch (e) {
                console.error(`i18next: Error parsing JSON from ${url}`, e);
                error(e);
              }
            });
          })
          .catch(err => {
            console.error(`i18next: Error loading translation file from ${url}`, err);
            error(err);
          });
      },
    },
    react: {
      useSuspense: false
    }
  });

i18n.on('languageChanged', (lng) => {
  console.log(`i18next: Language changed to ${lng}`); // Add this line
  if (languageChangedCallback) {
    languageChangedCallback(lng);
  }
});

export const setLanguageChangedCallback = (callback) => {
  languageChangedCallback = callback;
};

export default i18n;