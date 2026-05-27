import i18next from 'i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_INTERFACE_LANGUAGE, INTERFACE_LANGUAGE_STORAGE_KEY, SUPPORTED_INTERFACE_LANGUAGES } from './constants';

const loadPath = `./translations/{{lng}}/{{ns}}.json`;

i18next
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: DEFAULT_INTERFACE_LANGUAGE,
    showSupportNotice: false,
    supportedLngs: [...SUPPORTED_INTERFACE_LANGUAGES],
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: INTERFACE_LANGUAGE_STORAGE_KEY,
    },

    ns: ['default'],
    defaultNS: 'default',

    backend: { loadPath },
  });
