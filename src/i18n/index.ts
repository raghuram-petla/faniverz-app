import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/storage';
import en from './en.json';
import te from './te.json';

// @sync: languageReady promise must resolve before i18n.t() calls return stored preference. Components rendering before this resolves get 'te' fallback regardless of user's saved language.
// @edge: only 'en' and 'te' supported — any other device languageCode (e.g. 'hi', 'ta') silently falls back to 'te'. No user-facing notification of unsupported language.
const deviceLanguage = getLocales()[0]?.languageCode ?? 'te';
const supportedLanguage = deviceLanguage === 'en' ? 'en' : 'te';

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
      fallbackLng: 'te',
      interpolation: {
        escapeValue: false,
      },
      // @sideeffect: suppresses the Locize sponsorship info banner on init
      showSupportNotice: false,
    });
  });

export default i18n;
