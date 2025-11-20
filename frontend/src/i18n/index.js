import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import id from './locales/id.json';
import en from './locales/en.json';
import example1 from './locales/en.json';
import example2 from './locales/en.json';
import example3 from './locales/en.json';
import example4 from './locales/en.json';

const defaultLang =
  (typeof window !== 'undefined' && localStorage.getItem('language')) || 'id';

i18n.use(initReactI18next).init({
  resources: {
    id: {
      translation: id,
    },
    en: {
      translation: en,
    },
    e1: {
      translation: example1,
    },
    e2: {
      translation: example2,
    },
    e3: {
      translation: example3,
    },
    e4: {
      translation: example4,
    },
  },
  lng: defaultLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
