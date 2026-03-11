import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/storage';
import en from './en.json';
import te from './te.json';

const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';
const supportedLanguage = deviceLanguage === 'te' ? 'te' : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    te: { translation: te },
  },
  lng: supportedLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

// Restore user's preferred language from AsyncStorage (overrides device default)
AsyncStorage.getItem(STORAGE_KEYS.PREFERRED_LANG).then((stored) => {
  if (stored && (stored === 'en' || stored === 'te')) {
    i18n.changeLanguage(stored);
  }
});

export default i18n;
