export type ImageSize = 'sm' | 'md' | 'lg' | 'original';

export function getImageUrl(
  originalUrl: string | null,
  size: ImageSize = 'original',
): string | null {
  if (!originalUrl) return null;
  if (size === 'original') return originalUrl;
  return originalUrl.replace(/\.(\w+)$/, `_${size}.$1`);
}
