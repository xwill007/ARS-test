// filepath: src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import brTranslations from './locales/br.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: enTranslations,
      es: esTranslations,
      br: brTranslations
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;