import { getLocales } from 'expo-localization';

/**
 * @contract Returns the user's country code from device settings (ISO 3166-1).
 * Uses the device's configured region (Settings → Language & Region), not GPS.
 * No permissions required. Falls back to 'IN' if unavailable.
 */
export function getDeviceCountry(): string {
  const locales = getLocales();
  return locales[0]?.regionCode ?? 'IN';
}
