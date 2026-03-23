import { getLocales } from 'expo-localization';

/**
 * @contract Returns the user's country code from device settings (ISO 3166-1).
 * Uses the device's configured region (Settings → Language & Region), not GPS.
 * No permissions required. Falls back to 'IN' if unavailable.
 */
// @nullable getLocales() can return empty array on some Android emulators — fallback handles this
// @assumes 'IN' (India) is the primary market — impacts default content filtering if region is unknown
export function getDeviceCountry(): string {
  const locales = getLocales();
  return locales[0]?.regionCode ?? 'IN';
}
