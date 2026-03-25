import { STORAGE_KEYS } from '../storage';

describe('STORAGE_KEYS', () => {
  it('exports RECENT_SEARCHES key', () => {
    expect(STORAGE_KEYS.RECENT_SEARCHES).toBe('recent_searches');
  });

  it('exports PREFERRED_LANG key', () => {
    expect(STORAGE_KEYS.PREFERRED_LANG).toBe('preferred_lang');
  });

  it('exports THEME_MODE key', () => {
    expect(STORAGE_KEYS.THEME_MODE).toBe('faniverz_theme_mode');
  });

  it('exports PUSH_NOTIFICATIONS key', () => {
    expect(STORAGE_KEYS.PUSH_NOTIFICATIONS).toBe('push_notifications');
  });

  it('exports EMAIL_NOTIFICATIONS key', () => {
    expect(STORAGE_KEYS.EMAIL_NOTIFICATIONS).toBe('email_notifications');
  });

  it('exports ANIMATIONS_ENABLED key', () => {
    expect(STORAGE_KEYS.ANIMATIONS_ENABLED).toBe('faniverz_animations_enabled');
  });

  it('all keys are unique strings', () => {
    const values = Object.values(STORAGE_KEYS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});
