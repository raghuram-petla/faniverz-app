// @invariant all keys must be unique strings — collision causes silent data corruption
// @coupling read/written by: useAnimationStore, settings.tsx, search.tsx, language.tsx, ThemeProvider
export const STORAGE_KEYS = {
  RECENT_SEARCHES: 'recent_searches',
  PREFERRED_LANG: 'preferred_lang',
  THEME_MODE: 'faniverz_theme_mode',
  PUSH_NOTIFICATIONS: 'push_notifications',
  EMAIL_NOTIFICATIONS: 'email_notifications',
  ANIMATIONS_ENABLED: 'faniverz_animations_enabled',
  FILM_STRIP_ENABLED: 'faniverz_film_strip_enabled',
} as const;
