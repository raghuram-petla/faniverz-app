import sharp from 'sharp';

export interface ImageVariant {
  suffix: string;
  width: number;
  height?: number;
  quality: number;
}

export const POSTER_VARIANTS: ImageVariant[] = [
  { suffix: '_sm', width: 200, quality: 80 },
  { suffix: '_md', width: 400, quality: 85 },
  { suffix: '_lg', width: 800, quality: 90 },
];

export const BACKDROP_VARIANTS: ImageVariant[] = [
  { suffix: '_sm', width: 480, quality: 80 },
  { suffix: '_md', width: 960, quality: 85 },
  { suffix: '_lg', width: 1920, quality: 90 },
];

export const PHOTO_VARIANTS: ImageVariant[] = [
  { suffix: '_sm', width: 100, quality: 80 },
  { suffix: '_md', width: 200, quality: 85 },
  { suffix: '_lg', width: 400, quality: 90 },
];

export async function generateVariants(
  buffer: Buffer,
  contentType: string,
  variants: ImageVariant[],
): Promise<{ suffix: string; buffer: Buffer; contentType: string }[]> {
  const format =
    contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpeg';

  const results = await Promise.all(
    variants.map(async (variant) => {
      const resized = await sharp(buffer)
        .resize(variant.width, variant.height, { fit: 'inside', withoutEnlargement: true })
        [format]({ quality: variant.quality })
        .toBuffer();
      return { suffix: variant.suffix, buffer: resized, contentType };
    }),
  );

  return results;
}
