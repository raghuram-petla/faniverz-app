import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/storage';
import en from './en.json';
import te from './te.json';

const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';
const supportedLanguage = deviceLanguage === 'te' ? 'te' : 'en';

/** Resolves when stored language preference has been loaded */
export const languageReady: Promise<void> = AsyncStorage.getItem(STORAGE_KEYS.PREFERRED_LANG)
  .then((stored) => {
    if (stored && (stored === 'en' || stored === 'te')) {
      return stored;
    }
    return supportedLanguage;
  })
  .catch(() => supportedLanguage)
  .then((lng) => {
    i18n.use(initReactI18next).init({
      resources: {
        en: { translation: en },
        te: { translation: te },
      },
      lng,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
    });
  });

export default i18n;
