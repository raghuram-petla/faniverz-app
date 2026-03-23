// Inline gray PNG placeholders — no external CDN dependency, works offline.
// 1×1 medium-gray pixel; components scale it to fill the image container.
// @coupling used as fallback throughout the app when getImageUrl returns null
// @invariant all three must be valid data: URIs — expo-image crashes on empty string src

const GRAY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNoAAAAggCBd81ytgAAAABJRU5ErkJggg==';

export const PLACEHOLDER_AVATAR = GRAY_PNG;
export const PLACEHOLDER_POSTER = GRAY_PNG;
export const PLACEHOLDER_PHOTO = GRAY_PNG;
